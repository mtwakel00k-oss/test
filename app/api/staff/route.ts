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

    try {
      const { data } = await masterSb().from("restaurant_staff")
        .select("*").eq("tenant_slug", slug).order("name")
      if (Array.isArray(data)) {
        for (const row of data as Record<string, unknown>[]) {
          addIfNew(row, String(row.name || ""))
        }
      }
    } catch { /* table not exist */ }

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

    const { name, role, password } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 })
    }
    const staffName = name.trim()

    const url = env.NEXT_PUBLIC_SUPABASE_URL
    const key = env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: "Server config error" }, { status: 500 })
    const master = createClient(url, key)

    // Create auth user + profile + restaurant_users (always works)
    const domain = `${slug}.app`
    const email = `${staffName.toLowerCase().replace(/\s+/g, "_")}@${domain}`
    const pw = password || `${staffName}@${Math.random().toString(36).slice(2, 8)}1A`

    let userId: string
    const { data: createData, error: createError } = await master.auth.admin.createUser({
      email,
      password: pw,
      email_confirm: true,
      user_metadata: { username: staffName, role: role || "cashier" },
    })

    if (createData?.user) {
      userId = createData.user.id
    } else if (createError?.message?.includes("already exists")) {
      const { data: listData } = await master.auth.admin.listUsers()
      const found = listData?.users?.find((u: { email?: string }) => u.email === email)
      if (!found) return NextResponse.json({ error: "User exists but not found" }, { status: 500 })
      userId = found.id
    } else {
      return NextResponse.json({ error: createError?.message || "فشل إنشاء الحساب" }, { status: 500 })
    }

    await master.from("profiles").upsert({ id: userId, username: staffName, role: role || "cashier" })

    const { data: tenant } = await master.from("tenants").select("id").eq("slug", slug).single()
    if (tenant) {
      const { data: existingLink } = await master.from("restaurant_users")
        .select("id").eq("user_id", userId).eq("restaurant_id", tenant.id).maybeSingle()
      if (!existingLink) {
        await master.from("restaurant_users").insert({ user_id: userId, restaurant_id: tenant.id, role: role || "cashier" })
      }
    }

    // Also sync to restaurant_staff if table exists
    try {
      await master.from("restaurant_staff").upsert({
        tenant_slug: slug,
        name: staffName,
        role: role || "cashier",
        is_active: true,
      })
    } catch { /* table not exist */ }

    try {
      const tenantSb = await supabaseForRequest(req)
      await tenantSb.from("restaurant_staff").upsert({
        name: staffName,
        role: role || "cashier",
        is_active: true,
      })
    } catch { /* tenant table not exist */ }

    logger.info("Staff created", { id: userId, name: staffName, slug })
    return NextResponse.json({ id: userId, name: staffName, role: role || "cashier", is_active: true, password: pw }, { status: 201 })
  } catch (e) {
    logger.error("staff POST failed", e)
    return NextResponse.json({ error: "فشل إضافة الموظف. تأكد من صلاحيات قاعدة البيانات." }, { status: 500 })
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

    // Update restaurant_staff (if exists)
    try {
      await master.from("restaurant_staff").update(updates).eq("id", id)
    } catch { /* table not exist */ }

    // Also update profile for auth-linked users
    if (updates.name || updates.role) {
      try {
        const profileUpdates: Record<string, unknown> = {}
        if (updates.name) profileUpdates.username = updates.name
        if (updates.role) profileUpdates.role = updates.role
        await master.from("profiles").update(profileUpdates).eq("id", id)
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

    const master = masterSb()

    try {
      await master.from("restaurant_staff").delete().eq("id", id)
    } catch { /* table not exist */ }

    try {
      await master.from("restaurant_users").delete().eq("user_id", id)
    } catch { /* table not exist */ }

    try {
      await master.auth.admin.deleteUser(id)
    } catch { /* may fail for non-auth users */ }

    logger.info("Staff deleted", { id })
    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error("staff DELETE failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
