import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { invalidateTenantConfig } from "@/lib/tenant"
import { requireRootOwner, isErrorResponse } from "@/lib/api-auth"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

const MASTER_URL = env.NEXT_PUBLIC_SUPABASE_URL!
const MASTER_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const FALLBACK_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TenantRow {
  id: string
  slug: string
  name: string
  plan_type: string | null
  is_active: boolean
  is_open: boolean
  created_at: string
}

export async function GET(req: NextRequest) {
  try {
    const session = requireRootOwner(req)
    if (isErrorResponse(session)) return session

    const masterSb = createClient(MASTER_URL, MASTER_KEY || FALLBACK_KEY)

    let { data, error } = await masterSb
      .from("tenants")
      .select("id, slug, name, plan_type, is_active, is_open, created_at")
      .order("name", { ascending: true }) as { data: unknown; error: unknown }

    // Fallback if is_open column doesn't exist yet
    if (error && ((error as { message?: string }).message?.includes("does not exist") || (error as { code?: string }).code === "42703")) {
      const fallback = await masterSb
        .from("tenants")
        .select("id, slug, name, plan_type, is_active, created_at")
        .order("name", { ascending: true })
      error = fallback.error
      data = fallback.data
    }

    if (error) {
      logger.error("Failed to list tenants", error)
      return NextResponse.json({ error: (error as { message?: string }).message || "Unknown error" }, { status: 500 })
    }

    const rows = (data as Array<Record<string, unknown>> | null) || []
    const tenants = rows.map((r) => ({ ...r, is_open: r.is_open ?? true })) as TenantRow[]

    return NextResponse.json({ tenants })
  } catch (e) {
    logger.error("Unexpected error listing tenants", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const VALID_PLANS = ["starter", "pro", "elite"]

export async function PATCH(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`admin:plans:${getClientIp(req)}`, { max: 20, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireRootOwner(req)
    if (isErrorResponse(session)) return session

    const body = await req.json()
    const { slug, plan_type: planType, is_active, is_open } = body

    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "Missing or invalid slug" }, { status: 400 })
    }

    const updates: Record<string, string | boolean> = {}

    if (planType !== undefined && planType !== null) {
      if (!VALID_PLANS.includes(planType)) {
        return NextResponse.json({ error: `Invalid plan. Must be one of: ${VALID_PLANS.join(", ")}` }, { status: 400 })
      }
      updates.plan_type = planType
    }

    if (typeof is_active === "boolean") {
      updates.is_active = is_active
    }

    if (typeof is_open === "boolean") {
      updates.is_open = is_open
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const masterSb = createClient(MASTER_URL, MASTER_KEY || FALLBACK_KEY)

    // Try update; if is_open column missing, strip it and retry
    let { error } = await masterSb
      .from("tenants")
      .update(updates)
      .eq("slug", slug)

    if (error && (error.message?.includes("does not exist") || (error as { code?: string }).code === "42703") && "is_open" in updates) {
      const { is_open: _, ...safe } = updates
      const retry = await masterSb
        .from("tenants")
        .update(safe)
        .eq("slug", slug)
      error = retry.error
      if (!error) {
        logger.info(`Tenant ${slug} updated (is_open skipped — column missing)`)
      }
    }

    if (error) {
      logger.error("Failed to update tenant", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    invalidateTenantConfig(slug)
    revalidatePath("/admin")
    revalidatePath(`/${slug}/admin`)
    revalidatePath(`/${slug}/menu`)
    revalidatePath(`/${slug}/order/[id]`)
    revalidatePath(`/${slug}/pos`)

    logger.info(`Tenant ${slug} updated`, updates)
    return NextResponse.json({ success: true, slug, updates })
  } catch (e) {
    logger.error("Unexpected error updating plan", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
