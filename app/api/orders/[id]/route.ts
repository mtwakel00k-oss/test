import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequestAdmin, isTenantMismatch, parseSession } from "@/lib/tenant"
import { createClientForRouteHandler } from "@/lib/supabase-server"
import { findOrderAcrossTenants } from "@/lib/order-tracking"
import { logger } from "@/lib/logger"
import { recordAuditEvent, EVENT_TYPES } from "@/lib/audit-events"
import { DB_STATUS_TO_POS } from "@/lib/constants"
import { notifyDriverAssigned } from "@/lib/whatsapp"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

const ALLOWED_STATUSES = ["pending", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]

function getRole(req: NextRequest): string | null {
  return parseSession(req.headers.get("cookie") || "").role ?? null
}

function sanitizePublicOrder(order: Record<string, unknown>) {
  return {
    id: order.id,
    status: order.status,
    order_number: order.order_number,
    order_type: order.order_type,
    total: order.total,
    created_at: order.created_at,
    table_number: order.table_number,
    driver_lat: order.driver_lat ?? null,
    driver_lng: order.driver_lng ?? null,
    driver_location_updated_at: order.driver_location_updated_at ?? null,
    delivery_lat: order.delivery_lat ?? null,
    delivery_lng: order.delivery_lng ?? null,
    delivery_address: order.delivery_address ?? null,
    items: (order.items as Array<Record<string, unknown>> | undefined)?.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      size: i.size,
      subtotal: i.subtotal,
    })),
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const isPublic = searchParams.get("public") === "true"
    const verifyEmail = searchParams.get("email")?.toLowerCase().trim()
    const verifyPhone = searchParams.get("phone")?.trim()

    // ── Public mode: customer tracking ─────────────────────────────────────────────
    if (isPublic) {
      // Rate limit: 30 req/min per IP for public tracking
      const rl = await checkRateLimit(`order-tracking:${getClientIp(req)}`, { max: 30, windowMs: 60_000 })
      if (!rl.allowed) return rateLimitResponse(rl.resetAt)

      logger.info(`[orders GET] Public lookup for order ${id}`, { hasEmail: !!verifyEmail, hasPhone: !!verifyPhone })

      // 1. Try standard lookup first (works if x-tenant-slug header is present)
      const sb = await supabaseForRequestAdmin(req)
      const PUBLIC_ORDER_COLS = ["id", "status", "order_number", "order_type", "total", "created_at", "table_number", "customer_name", "customer_phone", "delivery_address", "delivery_lat", "delivery_lng", "driver_id", "driver_lat", "driver_lng", "driver_location_updated_at"]
      let directOrder: Record<string, unknown> | null = null
      let directError: { message: string } | null = null
      for (let i = 0; i <= PUBLIC_ORDER_COLS.length; i++) {
        const cols = PUBLIC_ORDER_COLS.filter((_, idx) => idx < PUBLIC_ORDER_COLS.length - i).join(",")
        const { data, error }: { data: unknown; error: unknown } = await (sb.from("orders"))
          .select(`${cols}, items:order_items(id, product_id, product_name, quantity, unit_price, subtotal, size)`)
          .eq("id", id)
          .maybeSingle()
        if (data) { directOrder = data as Record<string, unknown>; break }
        const errMsg = error && typeof error === "object" ? String((error as Record<string, unknown>).message || "") : ""
        if (errMsg.includes("does not exist") || errMsg.includes("column")) { directError = error as { message: string }; continue }
        directError = error as { message: string }; break
      }

      if (directOrder) {
        if (directOrder.customer_phone) {
          if (!verifyPhone) {
            logger.warn(`[orders GET] Public: phone required for order ${id}`)
            return NextResponse.json({ error: "Phone verification required for this order" }, { status: 400 })
          }
          if (directOrder.customer_phone !== verifyPhone) {
            logger.warn(`[orders GET] Public: phone mismatch for order ${id}`)
            return NextResponse.json({ error: "Order not found" }, { status: 404 })
          }
        }
        logger.info(`[orders GET] Public: found order ${id} via direct lookup`)
        if (directOrder.status) directOrder.status = DB_STATUS_TO_POS[directOrder.status as string] || directOrder.status
        return NextResponse.json({ order: sanitizePublicOrder(directOrder) })
      }
      if (directError) {
        logger.warn(`[orders GET] Public: direct lookup failed`, { error: directError.message })
      }

      // 2. No slug known → scan all active tenants
      logger.info(`[orders GET] Public: scanning all tenants for order ${id}`)
      const found = await findOrderAcrossTenants(id)
      if (found) {
        const orderData = found.order as Record<string, unknown> & { customer_phone?: string; status?: string }
        if (orderData.customer_phone) {
          if (!verifyPhone) {
            return NextResponse.json({ error: "Phone verification required for this order" }, { status: 400 })
          }
          if (orderData.customer_phone !== verifyPhone) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 })
          }
        }
        if (orderData.status) orderData.status = DB_STATUS_TO_POS[orderData.status as string] || orderData.status
        return NextResponse.json({ order: sanitizePublicOrder(found.order), slug: found.slug })
      }

      logger.warn(`[orders GET] Public: order ${id} not found in any tenant`)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // ── Standard mode: requires staff session / x-tenant-slug ────────────
    const role = getRole(req)
    if (!role || !["admin", "owner", "cashier", "chef"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const sb = await supabaseForRequestAdmin(req)
    const STAFF_ORDER_COLS = ["id", "status", "order_number", "order_type", "total", "created_at", "table_number", "customer_name", "customer_phone", "delivery_address", "delivery_lat", "delivery_lng", "driver_id", "processed_by_staff_id", "processed_by_staff_name", "payment_status", "cashier_id", "cashier_name"]
    let order: Record<string, unknown> | null = null
    for (let i = 0; i <= STAFF_ORDER_COLS.length; i++) {
      const cols = STAFF_ORDER_COLS.filter((_, idx) => idx < STAFF_ORDER_COLS.length - i).join(",")
      const { data, error }: { data: unknown; error: unknown } = await (sb.from("orders"))
        .select(`${cols}, items:order_items(id, product_id, product_name, quantity, unit_price, subtotal, size)`)
        .eq("id", id)
        .maybeSingle()
      if (data) { order = data as Record<string, unknown>; break }
      const errMsg = error && typeof error === "object" ? String((error as Record<string, unknown>).message || "") : ""
      if (errMsg.includes("does not exist") || errMsg.includes("column")) continue
      logger.error(`[orders GET] Query error for order ${id}`, { error: errMsg })
      throw new Error(errMsg || JSON.stringify(error))
    }

    if (!order) {
      logger.warn(`[orders GET] Order ${id} not found in tenant`)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.status) order.status = DB_STATUS_TO_POS[order.status as string] || order.status
    return NextResponse.json(order)
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Failed to fetch order: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let role: string | null = getRole(req)
    if (!role) {
      const supabase = createClientForRouteHandler(req)
      const { data: { user } } = await supabase.auth.getUser()
      role = user?.user_metadata?.role ?? null
    }
    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const sb = await supabaseForRequestAdmin(req)

    if (body.items) {
      if (role !== "admin" && role !== "owner") {
        return NextResponse.json({ error: "Forbidden — only admins can edit items" }, { status: 403 })
      }
      const { items, total } = body
      const { error: delErr } = await sb.from("order_items").delete().eq("order_id", id)
      if (delErr) throw new Error(delErr.message || JSON.stringify(delErr))
      if (items.length > 0) {
        const prodIds = [...new Set(items.map((i: { product_id: number }) => i.product_id))] as number[]
        const { data: existingProds } = await (sb.from("produits")).select("id").in("id", prodIds)
        const existingSet = new Set((existingProds || []).map((r: { id: number }) => r.id))
        const validItems = items.filter((i: { product_id: number }) => existingSet.has(i.product_id))
        const removedCount = items.length - validItems.length
        if (removedCount > 0) {
          logger.warn("PATCH items: some products no longer exist, filtering them out", { orderId: id, removedCount })
          if (validItems.length === 0) {
            return NextResponse.json({ error: "None of the submitted products exist in the current menu.", code: "ALL_PRODUCTS_STALE" }, { status: 400 })
          }
        }
        const { error: insErr } = await sb.from("order_items").insert(
          validItems.map((i: { product_id: number; product_name: string; size: string; sauce: number | null; quantity: number; unit_price: number }) => ({
            order_id: id,
            product_id: i.product_id,
            product_name: i.product_name,
            size: i.size,
            sauce: i.sauce != null ? String(i.sauce) : null,
            quantity: i.quantity,
            unit_price: i.unit_price,
            subtotal: i.unit_price * i.quantity,
          }))
        )
        if (insErr) throw new Error(insErr.message || JSON.stringify(insErr))
      }
      const { error: updErr } = await sb.from("orders").update({ total }).eq("id", id)
      if (updErr) throw new Error(updErr.message || JSON.stringify(updErr))
      logger.info("Order items updated", { id, total })
      recordAuditEvent(req, { event_type: EVENT_TYPES.ORDER_UPDATED, operation: "UPDATE", table_name: "order_items", record_id: id, new_data: { total, itemsCount: body.items?.length } }).catch(() => {})
      return NextResponse.json({ success: true })
    }

    const { status, payment_status, driver_id } = body as {
      status?: string
      payment_status?: string
      driver_id?: string | null
    }
    if (!status && payment_status === undefined && driver_id === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Role checks
    if (payment_status !== undefined && role !== "admin" && role !== "owner" && role !== "cashier") {
      return NextResponse.json({ error: "Only admin, owner, or cashier can change payment status" }, { status: 403 })
    }
    if (driver_id !== undefined && role !== "admin" && role !== "owner") {
      return NextResponse.json({ error: "Only admin or owner can assign drivers" }, { status: 403 })
    }

    // When assigning a driver, verify they are not already busy
    if (driver_id) {
      const { data: busyOrder } = await sb
        .from("orders")
        .select("id")
        .eq("driver_id", driver_id)
        .eq("status", "out_for_delivery")
        .neq("id", id)
        .maybeSingle()

      if (busyOrder) {
        return NextResponse.json({ error: "هذا السائق مشغول حالياً بأمر توصيل آخر" }, { status: 409 })
      }
    }

    const STATUS_FALLBACKS = ["on_the_way"] as const

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (status === "ready") {
      updateData.ready_at = new Date().toISOString()
    }
    if (payment_status) updateData.payment_status = payment_status
    if (driver_id !== undefined) updateData.driver_id = driver_id

    // TODO: Simplify to direct update once all tenants have applied
    // supabase/migrations/00002_tenant_schema.sql. The retry/column-drop
    // logic below exists only to paper over schema drift.
    async function tryUpdate(data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
      for (let attempt = 0; attempt < 6; attempt++) {
        const { data: result, error } = await (sb.from("orders"))
          .update(data)
          .eq("id", id)
          .select()
          .single()
        if (result) return result
        const msg = error?.message || ""
        // Column missing → strip and retry
        if (msg.includes("does not exist") || msg.includes("column")) {
          const missing = Object.keys(data).find((c) => msg.includes(c))
          if (missing) { delete data[missing]; continue }
        }
        // Status CHECK constraint violation → try fallback statuses (not for cancelled)
        if ((msg.includes("23514") || msg.includes("check constraint")) && data.status && data.status !== "cancelled") {
          const fallback = STATUS_FALLBACKS.find((s) => s !== data.status)
          if (fallback) { data.status = fallback; continue }
        }
        if (status === "cancelled" && msg.includes("violates check constraint")) {
          logger.error("Cannot cancel order - DB constraint may not include 'cancelled'. Run migration SQL.")
        }
        throw new Error(msg || JSON.stringify(error))
      }
      return null
    }

    const result = await tryUpdate(updateData)
    if (!result) throw new Error("Failed to update order after exhausting retries")
    logger.info("Order updated", { id, status })
    recordAuditEvent(req, { event_type: EVENT_TYPES.ORDER_UPDATED, operation: "UPDATE", table_name: "orders", record_id: id, new_data: updateData as Record<string, unknown> }).catch(() => {})

    if (driver_id) {
      const slug =
        req.headers.get("x-tenant-slug") ||
        (() => {
          const referer = req.headers.get("referer") || ""
          const m = referer.match(/\/([^/]+)\/(?:pos|admin|menu|kitchen)\b/)
          return m ? m[1] : ""
        })()
      const origin =
        req.headers.get("origin") ||
        req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
        ""
      notifyDriverAssigned(slug, driver_id, String(result.order_number ?? ""), Number(result.total ?? 0), origin)
        .catch((e: unknown) => logger.error("WhatsApp notify failed", e))
    }

    return NextResponse.json(result)
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Failed to update order: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let role: string | null = getRole(req)
    if (!role) {
      const supabase = createClientForRouteHandler(req)
      const { data: { user } } = await supabase.auth.getUser()
      role = user?.user_metadata?.role ?? null
    }
    if (role !== "admin" && role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const sb = await supabaseForRequestAdmin(req)
    const { error: ie } = await (sb.from("order_items")).delete().eq("order_id", id)
    if (ie) throw new Error(ie.message || JSON.stringify(ie))
    const { error: oe } = await (sb.from("orders")).delete().eq("id", id)
    if (oe) throw new Error(oe.message || JSON.stringify(oe))
    logger.info("Order deleted", { id })
    recordAuditEvent(req, { event_type: EVENT_TYPES.ORDER_DELETED, operation: "DELETE", table_name: "orders", record_id: id }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Failed to delete order: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
