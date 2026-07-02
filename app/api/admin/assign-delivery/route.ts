import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequestAdmin, isTenantMismatch } from "@/lib/tenant"
import { requireStaff, resolveTenantSlug, isErrorResponse } from "@/lib/api-auth"
import { logger } from "@/lib/logger"
import { recordAuditEvent, EVENT_TYPES } from "@/lib/audit-events"
import { sendDriverWhatsApp } from "@/lib/whatsapp"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import { assignDeliverySchema, validationError } from "@/lib/validations"

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`admin:assign-delivery:${getClientIp(req)}`, { max: 30, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireStaff(req)
    if (isErrorResponse(session)) return session

    const body = await req.json()
    const parsed = assignDeliverySchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)
    const { order_id, delivery_man_id } = parsed.data
    const bodySlug = (body as { slug?: string }).slug

    const tenantSlug = resolveTenantSlug(req, session, bodySlug)
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 })
    }

    const sb = await supabaseForRequestAdmin(req)

    const { data: order, error: orderErr } = await sb.from("orders")
      .select("id, customer_name, customer_phone, order_number, status, total, delivery_lat, delivery_lng, delivery_address")
      .eq("id", order_id)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (!["ready", "preparing"].includes(order.status)) {
      return NextResponse.json({ error: "الطلب يجب أن يكون جاهزاً أو قيد التحضير" }, { status: 400 })
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
      `اضغط على زر "💰 قبضت" بعد استلام المبلغ`,
    ].join("\n")

    sendDriverWhatsApp(man.whatsapp_number, message).then((sent: boolean) => {
      if (sent) {
        logger.info("WhatsApp sent to delivery man", { id: delivery_man_id, order_id })
      } else {
        logger.warn("WhatsApp failed, delivery assigned anyway", { id: delivery_man_id, order_id })
      }
    })

    logger.info("Delivery assigned", { order_id, delivery_man_id })
    recordAuditEvent(req, { event_type: EVENT_TYPES.DELIVERY_ASSIGNED, operation: "UPDATE", table_name: "orders", record_id: order_id, new_data: { delivery_man_id, driver_id: delivery_man_id, status: "out_for_delivery", payment_status: "paid" } }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("assign-delivery POST failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
