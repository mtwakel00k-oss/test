import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequest, isTenantMismatch, parseSession } from "@/lib/tenant"
import type { SupabaseClient } from "@supabase/supabase-js"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import type { OrderType, MenuProduct } from "@/lib/types"
import { getPrice } from "@/lib/types"
import { DB_STATUS_TO_POS } from "@/lib/constants"
import { phoneRegex } from "@/lib/validations"

const ORDER_COLS = [
  "id", "customer_name", "total", "status", "order_type",
  "table_number", "created_at", "order_number", "customer_phone", "payment_status",
  "delivery_lat", "delivery_lng", "delivery_address", "driver_id",
  "processed_by_staff_id", "processed_by_staff_name",
]

async function queryOrders(sb: SupabaseClient, statusIn: string | null, limit: number) {
  for (let i = 0; i <= ORDER_COLS.length; i++) {
    const cols = ORDER_COLS.filter((_, idx) => idx < ORDER_COLS.length - i)
    let q = sb.from("orders").select(cols.join(","))
    if (statusIn) {
      const statuses = statusIn.split(",")
      q = q.in("status", statuses)
    }
    const { data, error } = await q.order("created_at", { ascending: false }).limit(limit)
    if (data) return { data, availableCols: cols }
    if (!error?.message?.includes("does not exist") && !error?.message?.includes("column")) {
      throw new Error(error?.message || JSON.stringify(error))
    }
  }
  return { data: [], availableCols: [] as string[] }
}

export async function GET(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner" && session.role !== "cashier") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200)
    const includeItems = searchParams.get("include_items") === "true"
    const statusIn = searchParams.get("status_in")

    const sb = await supabaseForRequest(req)

    const { data: rawOrders, availableCols } = await queryOrders(sb, statusIn, limit)

    const hasPaymentColumn = availableCols.includes("payment_status")
    const hasOrderType = availableCols.includes("order_type")

    const enrichedOrders = (rawOrders || []) as unknown as Record<string, unknown>[]
    if (!hasPaymentColumn) {
      for (const o of enrichedOrders) o.payment_status = "unpaid"
    }
    if (!hasOrderType) {
      for (const o of enrichedOrders) o.order_type = "dine_in"
    }

    if (includeItems && enrichedOrders.length > 0) {
      const orderIds = enrichedOrders.map((o) => o.id as string)
      const { data: items } = await sb.from("order_items").select("*").in("order_id", orderIds)
      const itemsByOrder: Record<string, unknown[]> = {}
      for (const item of items || []) {
        const oid = (item as { order_id: string }).order_id
        if (!itemsByOrder[oid]) itemsByOrder[oid] = []
        itemsByOrder[oid].push(item)
      }
      for (const o of enrichedOrders) {
        o.items = itemsByOrder[o.id as string] || []
      }
    }

    for (const o of enrichedOrders) {
      if (o.status) o.status = DB_STATUS_TO_POS[o.status as string] || o.status
    }
    return NextResponse.json(enrichedOrders)
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Orders GET failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/* ──────────────────────────────────────────────────────────
 *  POST /api/orders — Bulletproof order creation
 *
 *  Design:
 *  1. Idempotency: client sends `idempotency_key` to prevent duplicates
 *  2. Status flow: tries `pending` first, falls back to `preparing`
 *     if the tenant's CHECK constraint doesn't allow `pending` yet
 *  3. Column detection: strips unknown columns gracefully
 *  4. Verification: after insert, re-queries the row to confirm it's readable
 *  5. Error codes: logs PostgREST error codes for diagnostics
 * ────────────────────────────────────────────────────────── */

const PG_ERROR_CODES: Record<string, string> = {
  "23505": "Unique violation (duplicate idempotency_key or order_number)",
  "23514": "Check constraint violation (usually status value not in allowed list)",
  "23503": "Foreign key violation (product_id references a non-existent produit)",
  "42P01": "Undefined table",
  "42703": "Undefined column (column does not exist)",
}

function classifyPgError(msg: string): string {
  for (const [code, label] of Object.entries(PG_ERROR_CODES)) {
    if (msg.includes(code)) return `${code}: ${label}`
  }
  return msg
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    const body = await req.json()
    const { items, customer_name, table_number, idempotency_key, cashier_id, cashier_name, processed_by_staff_id, processed_by_staff_name, google_maps_link } = body
    const order_type = (body.order_type || "takeaway") as OrderType
    const customer_phone = body.customer_phone || null
    const delivery_address = body.delivery_address || null
    const delivery_lat = body.delivery_lat ?? null
    const delivery_lng = body.delivery_lng ?? null

    if (!items?.length || !customer_name) {
      return NextResponse.json({ error: "Missing items or customer_name" }, { status: 400 })
    }
    if (order_type === "dine_in" && (!table_number || table_number < 1)) {
      return NextResponse.json({ error: "Missing table_number for dine-in" }, { status: 400 })
    }
    if (order_type === "delivery") {
      if (!customer_phone) {
        return NextResponse.json({ error: "customer_phone required for delivery" }, { status: 400 })
      }
      if (!phoneRegex.test(customer_phone)) {
        return NextResponse.json({ error: "رقم الهاتف غير صحيح — يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام" }, { status: 400 })
      }
    }

    const rl = await checkRateLimit(`orders:${getClientIp(req)}`, { max: 20, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const sb = await supabaseForRequest(req)

    // ── Validate products & compute server-side prices ──
    const prodIds = [...new Set(items.map((i: { product_id: number }) => i.product_id))] as number[]
    const { data: rawProducts } = await sb.from("v_products_flat").select("*").in("id", prodIds)
    const productMap = new Map<number, MenuProduct>()
    for (const p of rawProducts || []) {
      productMap.set(p.id as number, p as MenuProduct)
    }

    const removedProductIds: number[] = []
    const validItems: Array<{
      product_id: number
      product_name: string
      size: string
      sauce: number | null
      quantity: number
      unit_price: number
    }> = []

    for (const i of items as Array<{
      product_id: number
      product_name: string
      size: string
      sauce: number | null
      quantity: number
      unit_price: number
    }>) {
      const product = productMap.get(i.product_id)
      if (!product) {
        removedProductIds.push(i.product_id)
        continue
      }
      const serverPrice = getPrice(product, i.size, i.sauce)
      if (serverPrice <= 0) {
        return NextResponse.json(
          { error: `Invalid price for product ${i.product_id}`, code: "INVALID_PRICE" },
          { status: 400 },
        )
      }
      if (Math.abs(serverPrice - i.unit_price) > 0.01) {
        logger.warn("Client price mismatch — using server price", {
          product_id: i.product_id,
          client: i.unit_price,
          server: serverPrice,
        })
      }
      validItems.push({
        product_id: i.product_id,
        product_name: product.name || i.product_name,
        size: i.size,
        sauce: i.sauce,
        quantity: i.quantity,
        unit_price: serverPrice,
      })
    }

    if (removedProductIds.length > 0) {
      logger.warn("Products missing from tenant DB — removed from order", { removedProductIds })
      if (validItems.length === 0) {
        return NextResponse.json(
          { error: "All products in this order no longer exist in the menu. Please clear your cart and try again.", code: "ALL_PRODUCTS_STALE" },
          { status: 400 },
        )
      }
    }

    const total = validItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)

    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    // ── Payload ─────────────────────────────────────────
    const payload: Record<string, unknown> = {
      customer_name,
      total,
      status: "pending",
      order_type: order_type.toLowerCase(),
      payment_status: "unpaid",
    }
    if (order_type === "dine_in") payload.table_number = table_number
    if (customer_phone) payload.customer_phone = customer_phone
    if (idempotency_key) payload.idempotency_key = idempotency_key
    if (order_type === "delivery") {
      if (delivery_address) payload.delivery_address = delivery_address
      if (delivery_lat != null) payload.delivery_lat = delivery_lat
      if (delivery_lng != null) payload.delivery_lng = delivery_lng
      if (google_maps_link) payload.google_maps_link = google_maps_link
    }
    if (cashier_id) payload.cashier_id = cashier_id
    if (cashier_name) payload.cashier_name = cashier_name
    if (processed_by_staff_id) payload.processed_by_staff_id = processed_by_staff_id
    if (processed_by_staff_name) payload.processed_by_staff_name = processed_by_staff_name

    // ── Column-aware insert ─────────────────────────────
    const OPTIONAL_COLS = ["payment_status", "order_type", "order_number", "idempotency_key", "delivery_address", "delivery_lat", "delivery_lng", "google_maps_link", "cashier_id", "cashier_name", "processed_by_staff_id", "processed_by_staff_name"]
    const STATUS_FALLBACKS = ["preparing"] // if status check constraint rejects "pending"
    const ORDER_TYPE_FALLBACKS: Record<string, string> = { delivery: "takeaway" } // if order_type check constraint rejects value

    async function tryInsert(row: Record<string, unknown>): Promise<Record<string, unknown> | null> {
      for (let attempt = 0; attempt <= OPTIONAL_COLS.length + STATUS_FALLBACKS.length + Object.keys(ORDER_TYPE_FALLBACKS).length; attempt++) {
        const { data, error } = await (sb.from("orders")).insert(row).select().maybeSingle()
        if (data) return data
        const msg = error?.message || ""
        // Column missing → strip and retry
        if (msg.includes("does not exist") || msg.includes("column")) {
          const found = OPTIONAL_COLS.find((c) => row[c] !== undefined && msg.includes(c))
          if (found) { delete row[found]; continue }
        }
        // Check constraint violation → try fallback order_type first, then status
        if (msg.includes("23514") || msg.includes("check constraint")) {
          if (typeof row.order_type === "string") {
            const fallbackOrderType = ORDER_TYPE_FALLBACKS[row.order_type]
            if (fallbackOrderType) {
              row.order_type = fallbackOrderType
              delete row.delivery_address
              delete row.delivery_lat
              delete row.delivery_lng
              delete row.google_maps_link
              continue
            }
          }
          const nextStatus = STATUS_FALLBACKS.shift()
          if (nextStatus) { row.status = nextStatus; continue }
        }
        // Unknown error → throw with classified code
        throw new Error(classifyPgError(msg) || JSON.stringify(error))
      }
      return null
    }

    // ── Order number: atomic RPC (no fallback race) ───
    let orderNumber: number | undefined
    let order: Record<string, unknown> | null = null

    const { data: rpcNum, error: rpcErr } = await sb.rpc("next_order_number")
    if (rpcErr || rpcNum == null) {
      logger.error("next_order_number RPC failed — run migration SQL", { error: rpcErr })
      throw new Error("Order numbering service unavailable. Please contact administrator.")
    }
    orderNumber = Number(rpcNum)
    payload.order_number = orderNumber

    order = await tryInsert(payload)
    if (!order) {
      throw new Error("Failed to create order with atomic order_number")
    }

    // ── Verification: re-query the inserted row ──────────
    let verified = false
    for (let v = 0; v < 3; v++) {
      const { data: check } = await (sb.from("orders")).select("id").eq("id", order.id).maybeSingle()
      if (check) { verified = true; break }
      await new Promise((r) => setTimeout(r, 200 * (v + 1)))
    }
    if (!verified) {
      logger.error("Order inserted but verification SELECT returned no row — possible RLS issue", { id: order.id })
      throw new Error("Order was inserted but could not be read back (RLS or replication delay)")
    }

    // ── Insert items ────────────────────────────────────
    const orderItems = validItems.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      product_name: i.product_name,
      size: i.size,
      sauce: i.sauce != null ? String(i.sauce) : null,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.unit_price * i.quantity,
    }))

    const { error: itemsErr } = await sb.from("order_items").insert(orderItems)
    if (itemsErr) {
      await sb.from("orders").delete().eq("id", order.id)
      throw new Error(`Failed to insert order items: ${itemsErr.message}`)
    }

    const finalTotal = total
    const elapsed = Date.now() - startTime
    logger.info("Order created", { id: order.id, total: finalTotal, itemCount: orderItems.length, removedCount: removedProductIds.length, orderNumber, elapsedMs: elapsed })
    return NextResponse.json({
      id: order.id,
      orderNumber,
      ...(removedProductIds.length > 0 ? { removed_product_ids: removedProductIds } : {}),
    })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Order creation failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
