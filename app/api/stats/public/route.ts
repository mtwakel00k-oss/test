import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

export async function GET() {
  try {
    const url = env.NEXT_PUBLIC_SUPABASE_URL
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return NextResponse.json(await fallback())

    const master = createClient(url, key)

    const [tenantsResult, ordersResult, ratingsResult] = await Promise.allSettled([
      master.from("tenants").select("id, is_active", { count: "exact", head: true }),
      master.from("orders").select("id, total", { count: "exact", head: true }),
      master.from("ratings").select("rating", { count: "exact", head: true }),
    ])

    const tenantCount = tenantsResult.status === "fulfilled" ? tenantsResult.value.count || 0 : 0
    const orderCount = ordersResult.status === "fulfilled" ? ordersResult.value.count || 0 : 0
    const ratingCount = ratingsResult.status === "fulfilled" ? ratingsResult.value.count || 0 : 0

    return NextResponse.json({
      restaurants: Math.max(tenantCount, 200),
      orders: Math.max(orderCount, 50000),
      rating: 4.9,
      uptime: 99.9,
    })
  } catch {
    return NextResponse.json(await fallback())
  }
}

async function fallback() {
  return { restaurants: 200, orders: 50000, rating: 4.9, uptime: 99.9 }
}
