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

    const { data, error } = await masterSb
      .from("tenants")
      .select("id, slug, name, plan_type, is_active, is_open, created_at")
      .order("name", { ascending: true })

    if (error) {
      logger.error("Failed to list tenants", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tenants: data as TenantRow[] })
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

    const { error } = await masterSb
      .from("tenants")
      .update(updates)
      .eq("slug", slug)

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
