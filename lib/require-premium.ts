import { NextResponse } from "next/server"
import { getTenantConfig } from "@/lib/tenant"

export async function requirePremiumTier(slug: string): Promise<NextResponse | null> {
  if (!slug) return null
  const config = await getTenantConfig(slug)
  if (!config || config.plan_type === "starter") {
    return NextResponse.json(
      { code: "FEATURE_NOT_AVAILABLE", error: "Access Denied." },
      { status: 403 },
    )
  }
  return null
}
