import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequest, isTenantMismatch, getTenantConfig } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { sendDriverWhatsApp } from "@/lib/whatsapp"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { order_id, delivery_man_id, slug } = body
    if (!order_id || !delivery_man_id) {
      return NextResponse.json({ error: "order_id and delivery_man_id required" }, { status: 400 })
    }

    const tenantSlug = slug || req.headers.get("x-tenant-slug") || ""
    if (!tenantSlug) {
      return NextResponse.json({ error: "Could not resolve tenant slug" }, { status: 400 })
    }

    const sb = await supabaseForRequest(req)

    const { data: order, error: orderErr } = await sb.from("orders")
      .select("id, customer_name, customer_phone, order_number, status, total, delivery_lat, delivery_lng, delivery_address")
      .eq("id", order_id)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.status !== "ready") {
      return NextResponse.json({ error: "Order must be in 'ready' status to assign delivery" }, { status: 400 })
    }

    const { data: man, error: manErr } = await sb.from("delivery_men")
      .select("*")
      .eq("id", delivery_man_id)
      .single()

    if (manErr || !man) {
      return NextResponse.json({ error: "Delivery man not found" }, { status: 404 })
    }

    if (man.is_busy) {
      return NextResponse.json({ error: "Delivery man is currently busy" }, { status: 409 })
    }

    const { error: updateErr } = await sb.from("orders")
      .update({
        delivery_man_id,
        driver_id: delivery_man_id,
        status: "out_for_delivery",
        payment_status: "paid",
      })
      .eq("id", order_id)

    if (updateErr) throw new Error(updateErr.message)

    const { error: busyErr } = await sb.from("delivery_men")
      .update({ is_busy: true })
      .eq("id", delivery_man_id)

    if (busyErr) {
      logger.error("Failed to mark delivery man as busy", busyErr)
    }

    const origin = req.headers.get("origin") || `https://${tenantSlug}.app`
    const manageLink = `${origin}/delivery/manage/${order_id}`

    let mapsLink = ""
    if (order.delivery_lat != null && order.delivery_lng != null) {
      mapsLink = `https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`
    }

    const message = [
      `🛵 *${man.name}*`,
      ``,
      `تم تعيينك لتوصيل الطلب رقم #${order.order_number}`,
      `الزبون: ${order.customer_name}`,
      `رقم الزبون: ${order.customer_phone || "غير متوفر"}`,
      `المبلغ: ${order.total} د.ج`,
      ...(order.delivery_address ? [`العنوان: ${order.delivery_address}`] : []),
      ...(mapsLink ? [`📍 خرائط جوجل: ${mapsLink}`] : []),
      ``,
      `رابط التوصيل الخاص بك:`,
      manageLink,
    ].join("\n")

    sendDriverWhatsApp(man.whatsapp_number, message).then((sent) => {
      if (sent) {
        logger.info("WhatsApp sent to delivery man", { id: delivery_man_id, order_id })
      } else {
        logger.warn("WhatsApp delivery notification failed, delivery assigned anyway", { id: delivery_man_id, order_id })
      }
    })

    logger.info("Delivery assigned", { order_id, delivery_man_id })
    return NextResponse.json({ success: true, manageLink })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("assign-delivery POST failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
