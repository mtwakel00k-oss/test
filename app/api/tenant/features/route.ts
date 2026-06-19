import { NextRequest, NextResponse } from "next/server"
import { getTenantConfig, parseSession } from "@/lib/tenant"
import { TIER_FEATURES, type SubscriptionTier } from "@/types/subscriptions"

function capitalize(s: string): SubscriptionTier {
  const c = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  if (c === "Starter" || c === "Pro" || c === "Elite") return c
  return "Starter"
}

export async function GET(req: NextRequest) {
  try {
    const header = req.headers.get("x-tenant-slug")
    const session = parseSession(req.headers.get("cookie") || "")
    const slug = header || session.slug || ""

    if (!slug) return NextResponse.json({ error: "No tenant slug" }, { status: 400 })

    const config = await getTenantConfig(slug)
    if (!config?.plan_type) return NextResponse.json(TIER_FEATURES.Starter)

    const tier = capitalize(config.plan_type)
    return NextResponse.json(TIER_FEATURES[tier] || TIER_FEATURES.Starter)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
