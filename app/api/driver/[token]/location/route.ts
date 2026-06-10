import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createTenantSupabaseClient } from "@/lib/tenant"

export async function PATCH(req: NextRequest) {
  try {
    const token = req.nextUrl.pathname.split("/")[3]
    if (!token) {
      return NextResponse.json({ error: "Missing driver token" }, { status: 400 })
    }

    const { order_id, lat, lng } = await req.json()
    if (!order_id || lat == null || lng == null) {
      return NextResponse.json({ error: "Missing order_id, lat, or lng" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, supabase_url, supabase_anon_key")
      .filter("drivers", "cs", JSON.stringify([{ id: token }]))
      .maybeSingle()

    if (!tenant) {
      return NextResponse.json({ error: "Invalid driver token" }, { status: 401 })
    }

    const tenantClient = createTenantSupabaseClient(tenant.supabase_url, tenant.supabase_anon_key)

    const { data: order } = await tenantClient
      .from("orders")
      .select("id, driver_id")
      .eq("id", order_id)
      .maybeSingle()

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.driver_id !== token) {
      return NextResponse.json({ error: "Order not assigned to this driver" }, { status: 403 })
    }

    const { error: updateError } = await tenantClient
      .from("orders")
      .update({
        driver_lat: lat,
        driver_lng: lng,
        driver_location_updated_at: new Date().toISOString(),
      })
      .eq("id", order_id)

    if (updateError) {
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
