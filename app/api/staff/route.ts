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

    // 1) Tenant DB's restaurant_staff
    try {
      const sb = await supabaseForRequest(req)
      const { data } = await sb.from("restaurant_staff").select("*").order("name")
      if (Array.isArray(data)) {
        for (const row of data as Record<string, unknown>[]) {
          addIfNew(row, String(row.name || ""))
        }
      }
    } catch { /* tenant table not exist */ }

    // 2) Master DB's restaurant_staff
    try {
      const { data } = await masterSb().from("restaurant_staff")
        .select("*").eq("tenant_slug", slug).order("name")
      if (Array.isArray(data)) {
        for (const row of data as Record<string, unknown>[]) {
          addIfNew(row, String(row.name || ""))
        }
      }
    } catch { /* master table not exist */ }

    // 3) Master DB's restaurant_users + profiles + auth metadata
    const url = env.NEXT_PUBLIC_SUPABASE_URL
    const key = env.SUPABASE_SERVICE_ROLE_KEY
    if (url && key) {
      try {
        const master = createClient(url, key)
        const { data: tenant } = await master.from("tenants").select("id").eq("slug", slug).single()
        if (tenant) {
          const { data: users } = await master.from("restaurant_users")
            .select("user_id, role").eq("restaurant_id", tenant.id)
          if (Array.isArray(users) && users.length > 0) {
            const userIds = (users as { user_id: string; role: string }[]).map((u) => u.user_id)
            const nameMap = new Map<string, string>()

            try {
              const { data: profiles } = await master.from("profiles")
                .select("id, username").in("id", userIds)
              if (Array.isArray(profiles)) {
                for (const p of profiles as { id: string; username: string }[]) {
                  if (p.username) nameMap.set(p.id, p.username)
                }
              }
            } catch { /* profiles table not exist */ }

            const missingIds = userIds.filter((id) => !nameMap.has(id))
            if (missingIds.length > 0) {
              try {
                const { data: authList } = await master.auth.admin.listUsers()
                for (const u of authList?.users || []) {
                  if (missingIds.includes(u.id) && u.user_metadata?.username) {
                    nameMap.set(u.id, u.user_metadata.username as string)
                  }
                }
              } catch { /* no auth admin permission */ }
            }

            for (const u of users as { user_id: string; role: string }[]) {
              const name = nameMap.get(u.user_id)
              if (!name) continue
              addIfNew({ id: u.user_id, name, role: u.role, is_active: true }, name)
            }
          }
        }
      } catch { /* tables not exist */ }
    }

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

    const { name } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 })
    }
    const staffName = name.trim()

    let created: Record<string, unknown> | null = null

    // 1) Write to tenant's restaurant_staff (primary — POS reads from here)
    try {
      const sb = await supabaseForRequest(req)
      const { data } = await sb.from("restaurant_staff").upsert({
        name: staffName,
        role: "cashier",
        is_active: true,
      }).select().single()
      if (data) created = data
    } catch (e) {
      logger.warn("tenant restaurant_staff write failed", e)
    }

    // 2) Sync to master's restaurant_staff
    try {
      const { data } = await masterSb().from("restaurant_staff").upsert({
        tenant_slug: slug,
        name: staffName,
        role: "cashier",
        is_active: true,
      }).select().single()
      if (data && !created) created = data
    } catch { /* master table not exist */ }

    if (!created) {
      return NextResponse.json({ error: "تعذر إضافة الموظف. تأكد من وجود قاعدة البيانات." }, { status: 500 })
    }

    logger.info("Staff created", { id: created.id, name: staffName, slug })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    logger.error("staff POST failed", e)
    return NextResponse.json({ error: "حدث خطأ أثناء إضافة الموظف." }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`staff:${getClientIp(req)}`, { max: 30, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const { id, name, is_active } = await req.json()
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const master = masterSb()
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name.trim()
    if (is_active !== undefined) updates.is_active = is_active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Update tenant's restaurant_staff
    try {
      const sb = await supabaseForRequest(req)
      await sb.from("restaurant_staff").update(updates).eq("id", id)
    } catch { /* tenant table not exist */ }

    // Update master's restaurant_staff
    try {
      await master.from("restaurant_staff").update(updates).eq("id", id)
    } catch { /* master table not exist */ }

    // Also update profile name for auth-linked users
    if (updates.name) {
      try {
        await master.from("profiles").update({ username: updates.name }).eq("id", id)
      } catch { /* table not exist */ }
    }

    logger.info("Staff updated", { id })
    return NextResponse.json({ success: true })
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

    // Delete from tenant's restaurant_staff
    try {
      const sb = await supabaseForRequest(req)
      await sb.from("restaurant_staff").delete().eq("id", id)
    } catch { /* tenant table not exist */ }

    // Delete from master's restaurant_staff
    try {
      await masterSb().from("restaurant_staff").delete().eq("id", id)
    } catch { /* master table not exist */ }

    logger.info("Staff deleted", { id })
    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error("staff DELETE failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
