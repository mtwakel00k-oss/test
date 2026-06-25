import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseForRequest, isTenantMismatch, parseSession } from "@/lib/tenant"
import { requireStaff, requireAdmin, resolveTenantSlug, isErrorResponse } from "@/lib/api-auth"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

function masterSb() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function getSlug(req: NextRequest, session: ReturnType<typeof parseSession>): string | null {
  return resolveTenantSlug(req, session)
}

export async function GET(req: NextRequest) {
  try {
    const session = requireStaff(req)
    if (isErrorResponse(session)) return session

    const slug = getSlug(req, session)
    if (!slug) return NextResponse.json([])

    // Gather from both tenant DB and master DB, merge by id
    const seen = new Set<string>()
    const merged: Record<string, unknown>[] = []

    // 1) Try tenant DB first
    const sb = await supabaseForRequest(req)
    const { data: tenantData, error } = await sb.from("restaurant_staff").select("*").order("name")
    if (!error && Array.isArray(tenantData)) {
      for (const row of tenantData as Record<string, unknown>[]) {
        const id = String(row.id)
        if (!seen.has(id)) { seen.add(id); merged.push(row) }
      }
    }

    // 2) Merge master DB data (source of truth for cashiers created via admin)
    try {
      const { data: masterData } = await masterSb().from("restaurant_staff")
        .select("*").eq("tenant_slug", slug).order("name")
      if (Array.isArray(masterData)) {
        for (const row of masterData as Record<string, unknown>[]) {
          const id = String(row.id)
          if (!seen.has(id)) { seen.add(id); merged.push(row) }
        }
      }
    } catch { /* master table may not exist yet */ }

    return NextResponse.json(merged)
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("restaurant-staff GET failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`restaurant-staff:${getClientIp(req)}`, { max: 20, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const body = await req.json()
    const { name, role } = body
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

    const sb = await supabaseForRequest(req)
    const { data, error } = await sb.from("restaurant_staff").insert({
      name,
      role: role || "cashier",
      is_active: true,
    }).select().single()

    if (error) throw new Error(error.message)
    logger.info("Staff created", { id: data.id, name })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("restaurant-staff POST failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`restaurant-staff:${getClientIp(req)}`, { max: 20, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const body = await req.json()
    const { id, name, role, is_active } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (role !== undefined) updates.role = role
    if (is_active !== undefined) updates.is_active = is_active
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const sb = await supabaseForRequest(req)
    const { data, error } = await sb.from("restaurant_staff").update(updates).eq("id", id).select().single()
    if (error) throw new Error(error.message)

    logger.info("Staff updated", { id })
    return NextResponse.json(data)
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("restaurant-staff PATCH failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`restaurant-staff:${getClientIp(req)}`, { max: 20, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 })

    const sb = await supabaseForRequest(req)
    const { error } = await sb.from("restaurant_staff").delete().eq("id", id)
    if (error) throw new Error(error.message)

    logger.info("Staff deleted", { id })
    return NextResponse.json({ success: true })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("restaurant-staff DELETE failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
