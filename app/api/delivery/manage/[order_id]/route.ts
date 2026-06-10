import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequest, isTenantMismatch } from "@/lib/tenant"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest, { params }: { params: Promise<{ order_id: string }> }) {
  try {
    const { order_id } = await params
    const sb = await supabaseForRequest(req)
    const { data, error } = await sb.from("orders")
      .select(`
        *,
        delivery_men:delivery_man_id (id, name, whatsapp_number)
      `)
      .eq("id", order_id)
      .single()
    if (error || !data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("delivery/manage GET failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ order_id: string }> }) {
  try {
    const { order_id } = await params
    const body = await req.json()
    const sb = await supabaseForRequest(req)

    const updates: Record<string, unknown> = {}
    if (body.driver_lat !== undefined) updates.driver_lat = body.driver_lat
    if (body.driver_lng !== undefined) updates.driver_lng = body.driver_lng

    if (body.driver_lat !== undefined || body.driver_lng !== undefined) {
      updates.driver_location_updated_at = new Date().toISOString()
    }

    if (body.status === "completed") {
      updates.status = "completed"
      const { data: order } = await sb.from("orders")
        .select("delivery_man_id")
        .eq("id", order_id)
        .single()
      if (order?.delivery_man_id) {
        await sb.from("delivery_men")
          .update({ is_busy: false })
          .eq("id", order.delivery_man_id)
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { error } = await sb.from("orders").update(updates).eq("id", order_id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("delivery/manage PATCH failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
