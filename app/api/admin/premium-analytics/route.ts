import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseForRequest, parseSession, isTenantMismatch } from "@/lib/tenant"
import { requirePremiumTier } from "@/lib/require-premium"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

type Period = "7d" | "30d" | "6m" | "12m"
const PERIOD_DAYS: Record<Period, number> = { "7d": 7, "30d": 30, "6m": 180, "12m": 365 }

interface OrderRow {
  id: string
  status: string
  total: number | string
  created_at: string
  driver_id: string | null
  order_type: string | null
  order_number: string | number | null
  cashier_id: string | null
  cashier_name: string | null
}

interface AuditRow {
  id?: string
  record_id: string | null
  new_data?: Record<string, unknown> | null
  old_data?: Record<string, unknown> | null
  changed_by?: string
  created_at: string
}

interface ItemRow {
  product_id: number
  product_name: string
  quantity: number
  subtotal: number | string | null
}

interface ProduitRow {
  id: number
  nom: string
}

export async function GET(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const slug = session.slug || req.headers.get("x-tenant-slug") || searchParams.get("slug") || ""

    const tierCheck = await requirePremiumTier(slug)
    if (tierCheck) return tierCheck

    const periodParam = (searchParams.get("period") || "30d") as Period
    const days = PERIOD_DAYS[periodParam] || 30
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const prevSince = new Date(Date.now() - days * 2 * 86400000).toISOString()
    const prevEnd = since

    const sb = await supabaseForRequest(req)

    // ═══ detect optional columns via probe query ═══
    async function hasColumn(tbl: string, col: string): Promise<boolean> {
      try {
        const { data } = await sb.from(tbl).select(col).limit(1)
        const row = data?.[0] as Record<string, unknown> | undefined
        return row != null && col in row
      } catch { return false }
    }
    const [hasCashierId, hasReadyAt] = await Promise.all([
      hasColumn("orders", "cashier_id"),
      hasColumn("orders", "ready_at"),
    ])
    const orderCols = hasCashierId
      ? "id, status, total, created_at, driver_id, order_type, order_number, cashier_id, cashier_name"
      : "id, status, total, created_at, driver_id, order_type, order_number"
    const [ordersResult, itemsResult, auditResult, auditInsertResult, produitsResult, readyAtResult] = await Promise.allSettled([
      sb.from("orders").select(orderCols).gte("created_at", prevSince).limit(500).returns<Record<string, unknown>[]>(),
      sb.from("order_items").select("id, product_id, product_name, quantity, subtotal, created_at").gte("created_at", since).limit(2000).returns<Record<string, unknown>[]>(),
      sb.from("audit_log").select("id, record_id, new_data, old_data, changed_by, created_at")
        .eq("table_name", "orders").eq("operation", "UPDATE")
        .gte("created_at", since).order("created_at", { ascending: true }).limit(1000).returns<AuditRow[]>(),
      // INSERT audit entries for cashier matching (only needed when cashier_id column missing)
      !hasCashierId
        ? sb.from("audit_log").select("record_id, changed_by, created_at")
            .eq("table_name", "orders").eq("operation", "INSERT")
            .gte("created_at", since).limit(500).returns<{ record_id: string; changed_by: string; created_at: string }[]>()
        : Promise.resolve({ data: [] }),
      sb.from("produits").select("id, nom").limit(500).returns<ProduitRow[]>(),
      hasReadyAt
        ? sb.from("orders").select("id, ready_at").gte("created_at", since).limit(500).returns<{ id: string; ready_at: string | null }[]>()
        : Promise.resolve({ data: [] }),
    ])

    function mapOrder(row: Record<string, unknown>): OrderRow {
      return {
        id: String(row.id || ""),
        status: String(row.status || ""),
        total: row.total as number | string || 0,
        created_at: String(row.created_at || ""),
        driver_id: row.driver_id ? String(row.driver_id) : null,
        order_type: row.order_type ? String(row.order_type) : null,
        order_number: row.order_number as string | number | null || null,
        cashier_id: row.cashier_id ? String(row.cashier_id) : null,
        cashier_name: row.cashier_name ? String(row.cashier_name) : null,
      }
    }

    function mapItem(row: Record<string, unknown>): ItemRow {
      return {
        product_id: Number(row.product_id || 0),
        product_name: String(row.product_name || ""),
        quantity: Number(row.quantity || 0),
        subtotal: row.subtotal as number | string | null || null,
      }
    }

    const allOrders: OrderRow[] = ordersResult.status === "fulfilled"
      ? (ordersResult.value.data || []).map(mapOrder) : []
    const items: ItemRow[] = itemsResult.status === "fulfilled"
      ? (itemsResult.value.data || []).map(mapItem) : []
    const auditEntries: AuditRow[] = auditResult.status === "fulfilled" ? (auditResult.value.data || []) : []
    const produits: ProduitRow[] = produitsResult.status === "fulfilled" ? (produitsResult.value.data || []) : []
    type InsertRow = { record_id: string; changed_by: string; created_at: string }
    const auditInsertEntries: InsertRow[] = auditInsertResult.status === "fulfilled" ? (auditInsertResult.value.data || []) : []

    // Build ready_at map (if the column exists)
    const readyAtMap = new Map<string, string | null>()
    if (readyAtResult.status === "fulfilled") {
      const rows = (readyAtResult as PromiseFulfilledResult<{ data: { id: string; ready_at: string | null }[] }>).value.data
      if (rows) { for (const row of rows) { readyAtMap.set(row.id, row.ready_at) } }
    }

    // split into current / previous periods
    const currentOrders = allOrders.filter(o => o.created_at >= since)
    const prevOrders = allOrders.filter(o => o.created_at >= prevSince && o.created_at < prevEnd)

    const completedCurrent = currentOrders.filter(o => o.status === "completed" || o.status === "out_for_delivery")
    const completedPrev = prevOrders.filter(o => o.status === "completed" || o.status === "out_for_delivery")

    const currentRevenue = completedCurrent.reduce((s, o) => s + Number(o.total || 0), 0)
    const prevRevenue = completedPrev.reduce((s, o) => s + Number(o.total || 0), 0)

    const currentOrderCount = completedCurrent.length
    const prevOrderCount = completedPrev.length

    const avgTicket = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0
    const prevAvgTicket = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0
    const avgTicketChange = prevAvgTicket > 0 ? Math.round(((avgTicket - prevAvgTicket) / prevAvgTicket) * 100) : 0

    // dead stock — produits with 0 sales in current period
    const soldProductIds = new Set<number>()
    for (const item of items) {
      if (item.product_id) soldProductIds.add(item.product_id)
    }
    const deadStock = produits
      .filter(p => !soldProductIds.has(p.id))
      .map(p => ({ name: p.nom }))

    // cancellations
    const cancelledCurrent = currentOrders.filter(o => o.status === "cancelled")
    const cancelledValue = cancelledCurrent.reduce((s, o) => s + Number(o.total || 0), 0)
    const totalCurrent = currentOrders.length
    const cancelRate = totalCurrent > 0 ? Math.round((cancelledCurrent.length / totalCurrent) * 100) : 0

    // cancellation by order_type
    const cancelByType = new Map<string, number>()
    for (const o of cancelledCurrent) {
      const t = o.order_type || "unknown"
      cancelByType.set(t, (cancelByType.get(t) || 0) + 1)
    }
    const cancellationByOrderType = [...cancelByType.entries()].map(([type, count]) => ({ type, count }))

    // ── build audit-log timeline per order ──
    const orderTimelines = new Map<string, AuditRow[]>()
    for (const entry of auditEntries) {
      if (!entry.record_id) continue
      const existing = orderTimelines.get(entry.record_id) || []
      existing.push(entry)
      orderTimelines.set(entry.record_id, existing)
    }

    // ── prep time per order ──
    let redZoneCount = 0
    let redZoneTracked = 0
    let totalPrepMinutes = 0
    const prepOrders: { orderNumber: string; duration: number | null; status: "completed" | "preparing" | "unknown" }[] = []

    for (const order of currentOrders) {
      let prepDuration: number | null = null
      let prepStatus: "completed" | "preparing" | "unknown" = "unknown"

      if (order.status === "preparing") {
        prepDuration = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)
        prepStatus = "preparing"
        redZoneTracked++
      } else {
        // try ready_at map first (from DB column)
        const rawReadyAt = readyAtMap.get(order.id)
        if (rawReadyAt) {
          prepDuration = Math.round((new Date(rawReadyAt).getTime() - new Date(order.created_at).getTime()) / 60000)
          prepStatus = "completed"
          redZoneTracked++
        } else {
          // fallback to audit log
          const timeline = orderTimelines.get(order.id)
          if (timeline) {
            const preparingEntry = timeline.find(e => {
              const nd = e.new_data as Record<string, unknown> | null
              return nd && nd.status === "preparing"
            })
            const readyEntry = timeline.find(e => {
              const nd = e.new_data as Record<string, unknown> | null
              return nd && nd.status === "ready"
            })
            if (preparingEntry && readyEntry) {
              prepDuration = Math.round((new Date(readyEntry.created_at).getTime() - new Date(preparingEntry.created_at).getTime()) / 60000)
              prepStatus = "completed"
              redZoneTracked++
            }
          }
        }
      }

      if (prepDuration !== null) {
        if (prepDuration > 30) redZoneCount++
        totalPrepMinutes += prepDuration
      }

      prepOrders.push({
        orderNumber: String(order.order_number ?? order.id.slice(0, 8)),
        duration: prepDuration,
        status: prepStatus,
      })
    }

    const avgPrepTime = redZoneTracked > 0 ? Math.round(totalPrepMinutes / redZoneTracked) : null

    // ── resolve driver names ──
    const driverNames = new Map<string, string>()

    // 1) Try tenants.drivers JSONB (master DB)
    if (slug) {
      try {
        const masterSb = createClient(
          env.NEXT_PUBLIC_SUPABASE_URL!,
          env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )
        const { data: tenantData } = await masterSb.from("tenants").select("drivers").eq("slug", slug).single()
        const drivers: { id: string; name: string }[] = Array.isArray(tenantData?.drivers) ? tenantData.drivers : []
        for (const d of drivers) {
          driverNames.set(d.id, d.name)
        }
      } catch { /* fallback */ }
    }

    // 2) Try restaurant_staff as fallback (tenant DB — stored as driver role)
    if (driverNames.size === 0) {
      try {
        const { data: staff } = await sb.from("restaurant_staff")
          .select("id, name").eq("role", "driver").limit(100)
        if (staff) {
          for (const s of staff) {
            driverNames.set(s.id, s.name)
          }
        }
      } catch { /* fallback */ }
    }

    const driverHeroName = (id: string) => driverNames.get(id) || `سائق #${id.slice(0, 6)}`

    // ── driver data with transit time ──
    const driverOrdersMap = new Map<string, { completed: number; cancelled: number }>()
    for (const o of currentOrders) {
      if (!o.driver_id) continue
      const entry = driverOrdersMap.get(o.driver_id) || { completed: 0, cancelled: 0 }
      if (o.status === "completed" || o.status === "out_for_delivery") entry.completed++
      if (o.status === "cancelled") entry.cancelled++
      driverOrdersMap.set(o.driver_id, entry)
    }

    // average transit time per driver (ready → completed / out_for_delivery via audit log)
    const driverTransitMap = new Map<string, number[]>()
    for (const order of currentOrders) {
      if (!order.driver_id) continue
      const timeline = orderTimelines.get(order.id)
      if (!timeline) continue
      const readyEntry = timeline.find(e => {
        const nd = e.new_data as Record<string, unknown> | null
        return nd && nd.status === "ready"
      })
      const completionEntry = timeline.find(e => {
        const nd = e.new_data as Record<string, unknown> | null
        return nd && (nd.status === "out_for_delivery" || nd.status === "completed")
      })
      if (readyEntry && completionEntry) {
        const transit = (new Date(completionEntry.created_at).getTime() - new Date(readyEntry.created_at).getTime()) / 60000
        const existing = driverTransitMap.get(order.driver_id) || []
        existing.push(transit)
        driverTransitMap.set(order.driver_id, existing)
      }
    }
    const driverAvgTransitMap = new Map<string, number>()
    for (const [id, times] of driverTransitMap) {
      driverAvgTransitMap.set(id, Math.round(times.reduce((s, t) => s + t, 0) / times.length))
    }

    const drivers = [...driverOrdersMap.entries()].map(([id, s]) => ({
      id,
      name: driverHeroName(id),
      completedOrders: s.completed,
      cancelledOrders: s.cancelled,
      avgTransitTime: driverAvgTransitMap.get(id) ?? null,
    }))

    const sortedDrivers = [...drivers].sort((a, b) => b.completedOrders - a.completedOrders || a.cancelledOrders - b.cancelledOrders)
    const hero = sortedDrivers.length > 0 && sortedDrivers[0].completedOrders > 0
      ? sortedDrivers[0]
      : null

    // ── cashier aggregation ──
    // When cashier_id column is missing, fall back to audit_log INSERT entries
    // (changed_by stores the user email who created the order).
    async function buildCashierStats(): Promise<{
      cashiers: { id: string; name: string; orders: number; cancelled: number }[]
      hero: { id: string; name: string; orders: number; cancelled: number } | null
      mostCancelled: { id: string; name: string; orders: number; cancelled: number } | null
      avgOrders: number
    }> {
      if (hasCashierId) {
        // Path A: cashier_id column exists on orders table — direct query
        const cashierOrdersMap = new Map<string, { name: string; orders: number; cancelled: number }>()
        for (const o of currentOrders) {
          if (!o.cashier_id) continue
          const cname = o.cashier_name || `كاشير #${o.cashier_id.slice(0, 6)}`
          const entry = cashierOrdersMap.get(o.cashier_id) || { name: cname, orders: 0, cancelled: 0 }
          entry.orders += 1
          if (o.status === "cancelled") entry.cancelled++
          cashierOrdersMap.set(o.cashier_id, entry)
        }
        const cashiers = [...cashierOrdersMap.entries()].map(([id, s]) => ({ id, name: s.name, orders: s.orders, cancelled: s.cancelled }))
        const sorted = [...cashiers].sort((a, b) => b.orders - a.orders)
        return {
          cashiers,
          hero: sorted.length > 0 && sorted[0].orders > 0 ? sorted[0] : null,
          mostCancelled: [...cashiers].sort((a, b) => b.cancelled - a.cancelled)[0] || null,
          avgOrders: sorted.length > 0 ? Math.round(sorted.reduce((s, c) => s + c.orders, 0) / sorted.length) : 0,
        }
      }

      // Path B: cashier_id column missing — derive from audit_log INSERT changed_by
      const orderToCashier = new Map<string, string>() // order_id → email
      for (const entry of auditInsertEntries) {
        if (entry.record_id && entry.changed_by) {
          orderToCashier.set(entry.record_id, entry.changed_by)
        }
      }

      const statsMap = new Map<string, { name: string; orders: number; cancelled: number }>()
      for (const o of currentOrders) {
        const changedBy = orderToCashier.get(o.id)
        if (!changedBy) continue
        const cname = changedBy.split("@")[0] || `كاشير #${changedBy.slice(0, 6)}`
        const entry = statsMap.get(changedBy) || { name: cname, orders: 0, cancelled: 0 }
        entry.orders += 1
        if (o.status === "cancelled") entry.cancelled++
        statsMap.set(changedBy, entry)
      }
      const cashiers = [...statsMap.entries()].map(([id, s]) => ({ id, name: s.name, orders: s.orders, cancelled: s.cancelled }))
      const sorted = [...cashiers].sort((a, b) => b.orders - a.orders)
      return {
        cashiers,
        hero: sorted.length > 0 && sorted[0].orders > 0 ? sorted[0] : null,
        mostCancelled: [...cashiers].sort((a, b) => b.cancelled - a.cancelled)[0] || null,
        avgOrders: sorted.length > 0 ? Math.round(sorted.reduce((s, c) => s + c.orders, 0) / sorted.length) : 0,
      }
    }

    const { cashiers, hero: cashierHero, mostCancelled: cashierMostCancelled, avgOrders: cashierAvgOrders } = await buildCashierStats()
    const sortedCashiers = [...cashiers].sort((a, b) => b.orders - a.orders)

    // ── order-type breakdown (non-cancelled) ──
    const orderTypeCount = new Map<string, number>()
    for (const o of currentOrders) {
      if (o.status === "cancelled") continue
      const t = o.order_type || "unknown"
      orderTypeCount.set(t, (orderTypeCount.get(t) || 0) + 1)
    }
    const orderTypeBreakdown = [...orderTypeCount.entries()].map(([type, count]) => ({ type, count }))
    const totalActiveOrders = orderTypeBreakdown.reduce((s, ot) => s + ot.count, 0)
    const maxOrderTypeCount = orderTypeBreakdown.length > 0 ? Math.max(...orderTypeBreakdown.map(ot => ot.count), 1) : 1

    const deadStockEstimate = deadStock.length * Math.round(avgTicket * 0.6)

    return NextResponse.json({
      avgTicket: { value: Math.round(avgTicket), change: avgTicketChange },
      deadStock,
      cancellations: {
        total: cancelledCurrent.length,
        value: Math.round(cancelledValue),
        rate: cancelRate,
        byOrderType: cancellationByOrderType,
        avgTicket: Math.round(avgTicket),
        deadStockEstimate,
      },
      kitchenRedZone: {
        count: redZoneCount,
        totalTracked: redZoneTracked,
        totalOrders: currentOrders.length,
        avgPrepTime,
        prepOrders,
      },
      drivers: {
        hero,
        all: sortedDrivers,
      },
      cashiers: {
        hero: cashierHero,
        mostCancelled: cashierMostCancelled,
        all: sortedCashiers,
        avgOrders: cashierAvgOrders,
      },
      orderTypeBreakdown: {
        items: orderTypeBreakdown,
        total: totalActiveOrders,
        maxCount: maxOrderTypeCount,
      },
    })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Premium analytics error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
