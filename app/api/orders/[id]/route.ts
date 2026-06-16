import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequest, isTenantMismatch, parseSession } from "@/lib/tenant"
import { createClientForRouteHandler } from "@/lib/supabase-server"
import { findOrderAcrossTenants } from "@/lib/order-tracking"
import { logger } from "@/lib/logger"
import { logAudit } from "@/lib/audit"
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

    // ── Public mode: customer tracking, requires email OR phone verification ─────────
    if (isPublic) {
      // Rate limit: 30 req/min per IP for public tracking
      const rl = await checkRateLimit(`order-tracking:${getClientIp(req)}`, { max: 30, windowMs: 60_000 })
      if (!rl.allowed) return rateLimitResponse(rl.resetAt)

      logger.info(`[orders GET] Public lookup for order ${id}`, { hasEmail: !!verifyEmail, hasPhone: !!verifyPhone })

      // 1. Try standard lookup first (works if x-tenant-slug header is present)
      const sb = await supabaseForRequest(req)
      const { data: directOrder, error: directError } = await (sb.from("orders"))
        .select("*, items:order_items(*)")
        .eq("id", id)
        .maybeSingle()

      if (directOrder) {
        // Verify ownership: email or phone must match
        if (verifyEmail && directOrder.customer_email?.toLowerCase() !== verifyEmail) {
          logger.warn(`[orders GET] Public: email mismatch for order ${id}`)
          return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }
        if (verifyPhone && directOrder.customer_phone !== verifyPhone) {
          logger.warn(`[orders GET] Public: phone mismatch for order ${id}`)
          return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }
        logger.info(`[orders GET] Public: found order ${id} via direct lookup`)
        if (directOrder.status) directOrder.status = DB_STATUS_TO_POS[directOrder.status as string] || directOrder.status
        return NextResponse.json({ order: sanitizePublicOrder(directOrder) })
      }
      if (directError) {
        logger.warn(`[orders GET] Public: direct lookup failed`, { error: directError.message })
      }

      // 2. No slug known → scan all active tenants ONLY if email/phone provided
      if (!verifyEmail && !verifyPhone) {
        logger.warn(`[orders GET] Public: missing verification for cross-tenant lookup`)
        return NextResponse.json({ error: "Verification required (email or phone)" }, { status: 400 })
      }

      logger.info(`[orders GET] Public: scanning all tenants for order ${id}`)
      const found = await findOrderAcrossTenants(id)
      if (found) {
        const orderData = found.order as Record<string, unknown> & { customer_email?: string; customer_phone?: string; status?: string }
        // Verify ownership matches
        if (verifyEmail && orderData.customer_email?.toLowerCase() !== verifyEmail) {
          return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }
        if (verifyPhone && orderData.customer_phone !== verifyPhone) {
          return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }
        if (orderData.status) orderData.status = DB_STATUS_TO_POS[orderData.status as string] || orderData.status
        return NextResponse.json({ order: sanitizePublicOrder(found.order), slug: found.slug })
      }

      logger.warn(`[orders GET] Public: order ${id} not found in any tenant`)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // ── Standard mode: requires session / x-tenant-slug ──────────────────
    const sb = await supabaseForRequest(req)
    const { data: order, error } = await (sb.from("orders"))
      .select("*, items:order_items(*)")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      logger.error(`[orders GET] Query error for order ${id}`, { error: error.message })
      throw new Error(error.message || JSON.stringify(error))
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

    const sb = await supabaseForRequest(req)

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
      logAudit(sb, req, { table_name: "order_items", record_id: id, operation: "UPDATE", new_data: { total, itemsCount: body.items?.length } })
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
    if (payment_status) updateData.payment_status = payment_status
    if (driver_id !== undefined) updateData.driver_id = driver_id

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
    logAudit(sb, req, { table_name: "orders", record_id: id, operation: "UPDATE", new_data: updateData as Record<string, unknown> })

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
    const sb = await supabaseForRequest(req)
    const { error: ie } = await (sb.from("order_items")).delete().eq("order_id", id)
    if (ie) throw new Error(ie.message || JSON.stringify(ie))
    const { error: oe } = await (sb.from("orders")).delete().eq("id", id)
    if (oe) throw new Error(oe.message || JSON.stringify(oe))
    logger.info("Order deleted", { id })
    logAudit(sb, req, { table_name: "orders", record_id: id, operation: "DELETE" })
    return NextResponse.json({ success: true })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Failed to delete order: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
