import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseForRequest, parseSession, isTenantMismatch } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

type Period = "1d" | "7d" | "30d"
const PERIOD_DAYS: Record<Period, number> = { "1d": 1, "7d": 7, "30d": 30 }

interface AuditRow {
  id: string
  record_id: string | null
  new_data: Record<string, unknown> | null
  old_data: Record<string, unknown> | null
  changed_by: string
  changed_by_role: string
  created_at: string
}

interface OrderRow {
  id: string
  status: string
  total: number | string
  created_at: string
  driver_id: string | null
}

export async function GET(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const periodParam = (searchParams.get("period") || "7d") as Period
    const days = PERIOD_DAYS[periodParam] || 7
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const sb = await supabaseForRequest(req)
    const slug = session.slug || searchParams.get("slug") || ""

    const [ordersResult, auditResult] = await Promise.allSettled([
      sb.from("orders").select("id, status, total, created_at, driver_id").gte("created_at", since).limit(200).returns<OrderRow[]>(),
      sb.from("audit_log").select("id, record_id, new_data, old_data, changed_by, changed_by_role, created_at")
        .eq("table_name", "orders").eq("operation", "UPDATE")
        .gte("created_at", since).order("created_at", { ascending: true }).limit(1000).returns<AuditRow[]>(),
    ])

    const orders: OrderRow[] = ordersResult.status === "fulfilled" ? (ordersResult.value.data || []) : []
    const auditEntries: AuditRow[] = auditResult.status === "fulfilled" ? (auditResult.value.data || []) : []

    const totalOrders = orders.length
    const statusDistribution: Record<string, number> = {}
    for (const o of orders) {
      statusDistribution[o.status] = (statusDistribution[o.status] || 0) + 1
    }
    const statusDistArray = Object.entries(statusDistribution)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)

    const orderTimelines = new Map<string, AuditRow[]>()
    for (const entry of auditEntries) {
      if (!entry.record_id) continue
      const existing = orderTimelines.get(entry.record_id) || []
      existing.push(entry)
      orderTimelines.set(entry.record_id, existing)
    }

    let totalPrepMinutes = 0
    let prepOrdersTracked = 0

    for (const order of orders) {
      const timeline = orderTimelines.get(order.id)
      if (!timeline) continue
      const readyEntry = timeline.find(e => {
        const nd = e.new_data as Record<string, unknown> | null
        return nd && nd.status === "ready"
      })
      if (readyEntry) {
        const orderTime = new Date(order.created_at).getTime()
        const readyTime = new Date(readyEntry.created_at).getTime()
        const diffMinutes = (readyTime - orderTime) / 60000
        if (diffMinutes > 0 && diffMinutes < 1440) {
          totalPrepMinutes += diffMinutes
          prepOrdersTracked++
        }
      }
    }

    const avgPrepTime = prepOrdersTracked > 0 ? Math.round(totalPrepMinutes / prepOrdersTracked) : null

    const driverOrders = orders.filter(o => o.driver_id)
    const driverMap = new Map<string, { completedOrders: number; totalTransitMinutes: number; transitTracked: number; totalRevenue: number }>()

    for (const order of driverOrders) {
      const did = order.driver_id!
      const entry = driverMap.get(did) || { completedOrders: 0, totalTransitMinutes: 0, transitTracked: 0, totalRevenue: 0 }
      if (order.status === "completed" || order.status === "out_for_delivery") {
        entry.completedOrders++
        entry.totalRevenue += Number(order.total || 0)
      }
      const timeline = orderTimelines.get(order.id)
      if (timeline) {
        const collectEntry = timeline.find(e => {
          const nd = e.new_data as Record<string, unknown> | null
          return nd && nd.action === "driver_collected"
        })
        const assignedEntry = timeline.find(e => {
          const nd = e.new_data as Record<string, unknown> | null
          return nd && (nd.status === "out_for_delivery" || nd.driver_id === did)
        })
        if (collectEntry && assignedEntry) {
          const startTime = new Date(assignedEntry.created_at).getTime()
          const endTime = new Date(collectEntry.created_at).getTime()
          const diffMinutes = (endTime - startTime) / 60000
          if (diffMinutes > 0 && diffMinutes < 1440) {
            entry.totalTransitMinutes += diffMinutes
            entry.transitTracked++
          }
        }
      }
      driverMap.set(did, entry)
    }

    let driverNames = new Map<string, string>()
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

    const drivers = [...driverMap.entries()].map(([id, stats]) => ({
      name: driverNames.get(id) || id,
      completedOrders: stats.completedOrders,
      avgTransitTimeMinutes: stats.transitTracked > 0 ? Math.round(stats.totalTransitMinutes / stats.transitTracked) : null,
      ordersTracked: stats.transitTracked,
    })).sort((a, b) => b.completedOrders - a.completedOrders)

    return NextResponse.json({
      kitchen: {
        avgPrepTimeMinutes: avgPrepTime,
        ordersTracked: prepOrdersTracked,
        totalOrders,
        statusDistribution: statusDistArray,
      },
      delivery: {
        drivers,
      },
    })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("Reports API error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
