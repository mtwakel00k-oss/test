import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseForRequest, parseSession } from "@/lib/tenant"
import { requireAdmin, resolveTenantSlug, isErrorResponse } from "@/lib/api-auth"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

function masterSb() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function getSlug(req: NextRequest): string | null {
  const session = parseSession(req.headers.get("cookie") || "")
  return resolveTenantSlug(req, session)
}

async function ensureTable() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  try {
    const sb = createClient(url, key)
    await sb.rpc("exec_sql", {
      sql: `CREATE TABLE IF NOT EXISTS restaurant_staff (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_slug TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'cashier', is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now());`,
    })
  } catch {
    // rpc may not exist — table might already exist
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const slug = getSlug(req)
    if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const seenNames = new Set<string>()
    const merged: Record<string, unknown>[] = []

    const addIfNew = (row: Record<string, unknown>, name: string) => {
      const key = name.toLowerCase().trim()
      if (key && !seenNames.has(key)) { seenNames.add(key); merged.push(row) }
    }

    // Source 1: restaurant_staff (master DB)
    try {
      const { data } = await masterSb().from("restaurant_staff")
        .select("*").eq("tenant_slug", slug).order("name")
      if (Array.isArray(data)) {
        for (const row of data as Record<string, unknown>[]) {
          addIfNew(row, String(row.name || ""))
        }
      }
    } catch { /* table may not exist */ }

    // Source 2: restaurant_users + profiles (always exists)
    try {
      const master = masterSb()
      const { data: tenant } = await master.from("tenants").select("id").eq("slug", slug).single()
      if (tenant) {
        const { data: users } = await master.from("restaurant_users")
          .select("user_id, role").eq("restaurant_id", tenant.id)
        if (Array.isArray(users) && users.length > 0) {
          const userIds = (users as { user_id: string; role: string }[]).map((u) => u.user_id)
          const nameMap = new Map<string, string>()
          const { data: profiles } = await master.from("profiles")
            .select("id, username").in("id", userIds)
          if (Array.isArray(profiles)) {
            for (const p of profiles as { id: string; username: string }[]) {
              nameMap.set(p.id, p.username)
            }
          }
          for (const u of users as { user_id: string; role: string }[]) {
            const name = nameMap.get(u.user_id)
            if (!name || /^[a-f0-9-]{32,}$/i.test(name)) continue
            addIfNew({ id: u.user_id, name, role: u.role, is_active: true }, name)
          }
        }
      }
    } catch { /* tables may not exist */ }

    return NextResponse.json(merged)
  } catch (e) {
    logger.error("staff GET failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`staff:${getClientIp(req)}`, { max: 30, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const slug = getSlug(req)
    if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const { name, role } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 })
    }

    // Write to master restaurant_staff (primary)
    const master = masterSb()
    const { data: existing } = await master.from("restaurant_staff")
      .select("id").eq("tenant_slug", slug).eq("name", name.trim()).maybeSingle()

    let staffId: string
    if (existing) {
      const { data } = await master.from("restaurant_staff")
        .update({ role: role || "cashier", is_active: true })
        .eq("id", existing.id).select().single()
      staffId = (data as Record<string, unknown> | null)?.id as string || existing.id
    } else {
      const { data } = await master.from("restaurant_staff").insert({
        tenant_slug: slug,
        name: name.trim(),
        role: role || "cashier",
        is_active: true,
      }).select().single()
      staffId = (data as Record<string, unknown> | null)?.id as string
    }

    // Also try tenant DB
    try {
      const tenantSb = await supabaseForRequest(req)
      await tenantSb.from("restaurant_staff").upsert({
        name: name.trim(),
        role: role || "cashier",
        is_active: true,
      })
    } catch { /* tenant table may not exist */ }

    logger.info("Staff created", { id: staffId, name, slug })
    return NextResponse.json({ id: staffId, name: name.trim(), role: role || "cashier", is_active: true }, { status: 201 })
  } catch (e) {
    logger.error("staff POST failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`staff:${getClientIp(req)}`, { max: 30, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const { id, name, role, is_active } = await req.json()
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const master = masterSb()
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name.trim()
    if (role !== undefined) updates.role = role
    if (is_active !== undefined) updates.is_active = is_active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { data, error } = await master.from("restaurant_staff").update(updates).eq("id", id).select().single()
    if (error) throw new Error(error.message)

    logger.info("Staff updated", { id })
    return NextResponse.json(data)
  } catch (e) {
    logger.error("staff PATCH failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`staff:${getClientIp(req)}`, { max: 30, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const master = masterSb()
    const { error } = await master.from("restaurant_staff").delete().eq("id", id)
    if (error) throw new Error(error.message)

    logger.info("Staff deleted", { id })
    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error("staff DELETE failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
