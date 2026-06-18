import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createTenantSupabaseClient } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

interface Driver {
  id: string; name: string; phone: string; token: string; is_active: boolean
}

interface Tenant {
  slug: string; name: string; supabase_url: string;
  supabase_anon_key: string; drivers: Driver[]
}

async function findDriverByToken(token: string): Promise<{ driver: Driver; tenant: Tenant } | null> {
  const masterSb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY || "",
  )
  const { data: tenants, error } = await masterSb
    .from("tenants")
    .select("slug, name, supabase_url, supabase_anon_key, drivers")
    .not("drivers", "is", null)

  if (error || !tenants) return null

  for (const tenant of tenants as unknown as Tenant[]) {
    if (!Array.isArray(tenant.drivers)) continue
    const driver = tenant.drivers.find((d: Driver) => d.token === token && d.is_active)
    if (driver) return { driver, tenant }
  }
  return null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const rl = await checkRateLimit(`driver:*:location:${getClientIp(req)}`, { max: 60, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)
    const { token } = await params
    if (!token || token.length < 10) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const result = await findDriverByToken(token)
    if (!result) {
      return NextResponse.json({ error: "Invalid or inactive driver token" }, { status: 401 })
    }

    const { driver, tenant } = result

    const body = await req.json()
    const { order_id, lat, lng } = body
    if (!order_id || lat == null || lng == null) {
      return NextResponse.json({ error: "Missing order_id, lat, or lng" }, { status: 400 })
    }

    const tenantClient = createTenantSupabaseClient(tenant.supabase_url, tenant.supabase_anon_key)

    const { data: order } = await tenantClient
      .from("orders")
      .select("id, driver_id, status")
      .eq("id", order_id)
      .single()

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.driver_id !== driver.id) {
      return NextResponse.json({ error: "Order not assigned to this driver" }, { status: 403 })
    }

    if (order.status !== "out_for_delivery") {
      return NextResponse.json({ error: "Order is not out for delivery" }, { status: 400 })
    }

    const locationUpdate: Record<string, unknown> = {
      driver_lat: lat,
      driver_lng: lng,
      driver_location_updated_at: new Date().toISOString(),
    }

    let { error: updateError } = await tenantClient
      .from("orders")
      .update(locationUpdate)
      .eq("id", order_id)

    if (updateError?.message?.includes("does not exist") || updateError?.message?.includes("column")) {
      const missing = Object.keys(locationUpdate).find((c) => updateError?.message?.includes(c))
      if (missing) {
        delete locationUpdate[missing]
        const retry = await tenantClient.from("orders").update(locationUpdate).eq("id", order_id)
        updateError = retry.error
      }
    }

    if (updateError) {
      logger.error("Failed to update driver location", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    )
  }
}
