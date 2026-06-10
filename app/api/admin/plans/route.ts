import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { parseSession, invalidateTenantConfig } from "@/lib/tenant"
import { logger } from "@/lib/logger"

const MASTER_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MASTER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FALLBACK_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TenantRow {
  id: string
  slug: string
  name: string
  plan_type: string | null
  is_active: boolean
  created_at: string
}

export async function GET(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "owner" && session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const masterSb = createClient(MASTER_URL, MASTER_KEY || FALLBACK_KEY)

    const { data, error } = await masterSb
      .from("tenants")
      .select("id, slug, name, plan_type, is_active, created_at")
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
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "owner" && session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { slug, plan_type: planType, is_active } = body

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
