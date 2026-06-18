import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseSession } from "@/lib/tenant"
import { TIER_FEATURES, type SubscriptionTier } from "@/types/subscriptions"
import { env } from "@/lib/env"

export async function GET(req: NextRequest) {
  try {
    const header = req.headers.get("x-tenant-slug")
    const session = parseSession(req.headers.get("cookie") || "")
    const slug = header || session.slug || ""

    if (!slug) return NextResponse.json({ error: "No tenant slug" }, { status: 400 })

    const url = env.NEXT_PUBLIC_SUPABASE_URL
    const key = env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: "Server config" }, { status: 500 })

    const masterSb = createClient(url, key)

    const { data: sub, error } = await masterSb
      .from("restaurant_subscriptions")
      .select("tier")
      .eq("tenant_slug", slug)
      .maybeSingle()

    if (error || !sub) {
      return NextResponse.json(TIER_FEATURES.Starter)
    }

    const tier = (sub.tier as SubscriptionTier) || "Starter"
    return NextResponse.json(TIER_FEATURES[tier] || TIER_FEATURES.Starter)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
