import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createTenantSupabaseClient } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { env } from "@/lib/env"

const masterClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Driver {
  id: string; name: string; phone: string; token: string; is_active: boolean
}

interface Tenant {
  slug: string; name: string; supabase_url: string;
  supabase_anon_key: string; drivers: Driver[]
}

async function findDriverByToken(token: string): Promise<{ driver: Driver; tenant: Tenant } | null> {
  const { data: tenants, error } = await masterClient
    .from("tenants")
    .select("slug, name, supabase_url, supabase_anon_key, drivers")
    .not("drivers", "is", null)

  if (error || !tenants) return null

  for (const tenant of tenants as Tenant[]) {
    if (!Array.isArray(tenant.drivers)) continue
    const driver = tenant.drivers.find((d: Driver) => d.token === token && d.is_active)
    if (driver) return { driver, tenant }
  }
  return null
}

function extractDriverToken(req: NextRequest, fallback?: string): string | null {
  // Priority 1: Authorization header (Bearer token)
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  // Priority 2: x-driver-token header
  const headerToken = req.headers.get("x-driver-token")
  if (headerToken) return headerToken
  // Priority 3: Query param (for backward compat, deprecated)
  const queryToken = new URL(req.url).searchParams.get("token")
  if (queryToken) return queryToken
  // Priority 4: URL path segment (from params)
  if (fallback && fallback.length >= 10) return fallback
  return null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: fallback } = await params
  const token = extractDriverToken(req, fallback)
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  // Rate limit: 60 req/min per driver token
  const rl = await checkRateLimit(`driver:${token}`, { max: 60, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const result = await findDriverByToken(token)
  if (!result) {
    return NextResponse.json({ error: "Invalid or inactive driver token" }, { status: 401 })
  }

  const { driver, tenant } = result
  const tenantClient = createTenantSupabaseClient(tenant.supabase_url, tenant.supabase_anon_key)
  const { data: orders, error: ordersErr } = await tenantClient
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, delivery_address, delivery_lat, delivery_lng, status, total, created_at")
    .eq("driver_id", driver.id)
    .in("status", ["out_for_delivery", "ready"])
    .order("created_at", { ascending: false })

  if (ordersErr) {
    logger.error("Driver orders fetch failed: " + ordersErr.message)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }

  return NextResponse.json({
    driver: { id: driver.id, name: driver.name },
    restaurant: tenant.name,
    slug: tenant.slug,
    orders: orders ?? [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: fallback } = await params
  const token = extractDriverToken(req, fallback)
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const rl = await checkRateLimit(`driver:${token}`, { max: 60, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const result = await findDriverByToken(token)
  if (!result) {
    return NextResponse.json({ error: "Invalid or inactive driver token" }, { status: 401 })
  }

  const { driver, tenant } = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { order_id } = body as { order_id?: string }
  if (!order_id) return NextResponse.json({ error: "order_id required" }, { status: 400 })

  const tenantClient = createTenantSupabaseClient(tenant.supabase_url, tenant.supabase_anon_key)

  const { data: order, error: fetchErr } = await tenantClient
    .from("orders")
    .select("id, driver_id, status")
    .eq("id", order_id)
    .single()

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  if (order.driver_id !== driver.id) {
    return NextResponse.json({ error: "Forbidden — not your order" }, { status: 403 })
  }

  if (!["out_for_delivery", "ready"].includes(order.status)) {
    return NextResponse.json({ error: "Order cannot be marked as delivered" }, { status: 400 })
  }

  const { error: updateErr } = await tenantClient
    .from("orders")
    .update({ status: "completed", payment_status: "paid" })
    .eq("id", order_id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  logger.info("Order delivered by driver", { orderId: order_id, driverId: driver.id })
  return NextResponse.json({ success: true })
}
