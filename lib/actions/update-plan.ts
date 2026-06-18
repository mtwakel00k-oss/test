"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

const MASTER_URL = env.NEXT_PUBLIC_SUPABASE_URL!
const MASTER_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const FALLBACK_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export type PlanType = "starter" | "pro" | "elite"

interface ActionResult {
  success: boolean
  error?: string
}

function parseSession(cookieHeader: string): { role?: string } {
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]*)/)
  if (!match) return {}
  try {
    return JSON.parse(decodeURIComponent(match[1]))
  } catch {
    return {}
  }
}

const VALID_PLANS: PlanType[] = ["starter", "pro", "elite"]

export async function updateTenantPlan(
  slug: string,
  planType: string,
): Promise<ActionResult> {
  try {
    const c = await cookies()
    const session = parseSession(c.toString())
    if (session.role !== "owner" && session.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    if (!VALID_PLANS.includes(planType as PlanType)) {
      return { success: false, error: `Invalid plan: ${planType}` }
    }

    const masterSb = createClient(MASTER_URL, MASTER_KEY || FALLBACK_KEY)

    const { error } = await masterSb
      .from("tenants")
      .update({ plan_type: planType })
      .eq("slug", slug)

    if (error) {
      logger.error("updateTenantPlan failed", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/admin")
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error("updateTenantPlan unexpected error", e)
    return { success: false, error: msg }
  }
}
