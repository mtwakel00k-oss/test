import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { supabaseForRequest, parseSession, isTenantMismatch } from "@/lib/tenant"
import { logger } from "@/lib/logger"

type Period = "7d" | "30d" | "6m" | "12m"
const PERIOD_DAYS: Record<Period, number> = { "7d": 7, "30d": 30, "6m": 180, "12m": 365 }

interface OrderRow { id: string; status: string; total: number | string; created_at: string; driver_id: string | null; cashier_id?: string | null; cashier_name?: string | null }
interface ItemRow { product_name: string; quantity: number }
interface RatingRow { id: string; rating: number; comment: string | null; created_at: string }

export async function GET(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get("mode") || "tenant"
    const sb = await supabaseForRequest(req)

    if (mode === "root") {
      const masterSb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      return handleRootDashboard(masterSb)
    }

    const periodParam = (searchParams.get("period") || "30d") as Period
    const days = PERIOD_DAYS[periodParam] || 30
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const { data: rawOrders } = await sb.from("orders").select("*").gte("created_at", since).limit(200).returns<OrderRow[]>()
    const completedOrders = (rawOrders || []).filter((o) => o.status === "out_for_delivery" || o.status === "completed")

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const revenue = completedOrders.reduce((s, o) => s + Number(o.total || 0), 0)
    const todayRev = completedOrders
      .filter((o) => new Date(o.created_at) >= todayStart)
      .reduce((s, o) => s + Number(o.total || 0), 0)

    const { data: rawItems } = await sb.from("order_items").select("product_name, quantity").gte("created_at", since).limit(1000).returns<ItemRow[]>()
    const prodMap = new Map<string, number>()
    for (const item of (rawItems || [])) {
      prodMap.set(item.product_name, (prodMap.get(item.product_name) || 0) + (item.quantity || 0))
    }
    const topProducts = [...prodMap.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, qty]) => ({ name, quantity: qty, revenue: 0 }))

    const dailyMap = new Map<string, { revenue: number; orders: number }>()
    for (const o of completedOrders) {
      const day = (o as OrderRow).created_at?.slice(0, 10)
      if (!day) continue
      const entry = dailyMap.get(day) || { revenue: 0, orders: 0 }
      entry.revenue += Number((o as OrderRow).total || 0)
      entry.orders += 1
      dailyMap.set(day, entry)
    }
    const salesData = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders }))

    const hourCounts: Record<number, number> = {}
    for (const o of completedOrders) {
      const h = new Date((o as OrderRow).created_at).getHours()
      hourCounts[h] = (hourCounts[h] || 0) + 1
    }
    const peakHours = Array.from({ length: 24 }, (_, i) => ({ hour: i, orders: hourCounts[i] || 0 }))

    const { data: rawRatings } = await sb.from("ratings").select("*").order("created_at", { ascending: false }).limit(50).returns<RatingRow[]>()
    let avgRating = 0
    let reviews: { id: string; rating: number; text: string | null; timestamp: Date }[] = []
    if (rawRatings) {
      avgRating = rawRatings.length > 0 ? rawRatings.reduce((s, r) => s + r.rating, 0) / rawRatings.length : 0
      reviews = rawRatings.map((r) => ({ id: r.id, rating: r.rating, text: r.comment || null, timestamp: new Date(r.created_at) }))
    }

    let driverStats: { id: string; name: string; phone: string; deliveries: number; revenue: number }[] = []
    const slug = session.slug
    if (slug) {
      const { data: driverOrders } = await sb.from("orders")
        .select("driver_id, total")
        .eq("status", "out_for_delivery")
        .gte("created_at", since)
        .not("driver_id", "is", null)
        .returns<{ driver_id: string; total: number }[]>()
      const driverMap = new Map<string, { deliveries: number; revenue: number }>()
      for (const o of (driverOrders || [])) {
        const entry = driverMap.get(o.driver_id) || { deliveries: 0, revenue: 0 }
        entry.deliveries += 1
        entry.revenue += Number(o.total || 0)
        driverMap.set(o.driver_id, entry)
      }
      const masterSb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: tenantData } = await masterSb.from("tenants").select("drivers").eq("slug", slug).single()
      const drivers: { id: string; name: string; phone: string }[] = Array.isArray(tenantData?.drivers) ? tenantData.drivers : []
      driverStats = [...driverMap.entries()].map(([id, stats]) => {
        const driver = drivers.find(d => d.id === id)
        return { id, name: driver?.name || id, phone: driver?.phone || "", ...stats }
      }).sort((a, b) => b.deliveries - a.deliveries)
    }

    const cashierMap = new Map<string, { name: string; orders: number; revenue: number }>()
    for (const o of (rawOrders || [])) {
      const cid = (o as OrderRow).cashier_id
      if (!cid) continue
      const cname = (o as OrderRow).cashier_name || cid
      const entry = cashierMap.get(cid) || { name: cname, orders: 0, revenue: 0 }
      entry.orders += 1
      if (o.status === "out_for_delivery") entry.revenue += Number(o.total || 0)
      cashierMap.set(cid, entry)
    }
    const cashierStats = [...cashierMap.entries()]
      .map(([id, s]) => ({ id, name: s.name, orders: s.orders, revenue: s.revenue }))
      .sort((a, b) => b.orders - a.orders)

    return NextResponse.json({
      totalRevenue: revenue,
      totalOrders: completedOrders.length,
      avgOrderValue: completedOrders.length > 0 ? revenue / completedOrders.length : 0,
      dailyRevenue: todayRev,
      topProducts, salesData, peakHours, avgRating, reviews, driverStats, cashierStats,
    })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Unknown"
    logger.error("Admin stats error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function handleRootDashboard(sb: SupabaseClient) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()

  const { data: rawOrders } = await sb.from("orders").select("*").gte("created_at", twoMonthsAgo).limit(500).returns<OrderRow[]>()
  const orders = (rawOrders || [])

  const thisMonth = orders.filter((o) => o.status === "out_for_delivery" && new Date(o.created_at) >= monthStart)
  const thisRev = thisMonth.reduce((s, o) => s + Number(o.total), 0)
  const lastMonth = orders.filter(
    (o) => o.status === "out_for_delivery" && new Date(o.created_at) >= prevMonthStart && new Date(o.created_at) < monthStart,
  )
  const lastRev = lastMonth.reduce((s, o) => s + Number(o.total), 0)

  const active = orders.filter((o) => o.status === "preparing" || o.status === "ready").length
  const prevActive = orders.filter(
    (o) => new Date(o.created_at) >= prevMonthStart && new Date(o.created_at) < monthStart && (o.status === "preparing" || o.status === "ready"),
  ).length

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayOrders = orders.filter((o) => new Date(o.created_at) >= todayStart).length

  const peakHours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    orders: orders.filter((o) => new Date(o.created_at).getHours() === i).length,
  }))

  const dailyMap = new Map<string, { revenue: number; orders: number }>()
  for (const o of orders) {
    if (o.status !== "out_for_delivery") continue
    const day = o.created_at?.slice(0, 10)
    if (!day) continue
    const entry = dailyMap.get(day) || { revenue: 0, orders: 0 }
    entry.revenue += Number(o.total || 0)
    entry.orders += 1
    dailyMap.set(day, entry)
  }
  const chartData = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders }))

  const { data: rawItems } = await sb.from("order_items").select("product_name, quantity").gte("created_at", twoMonthsAgo).limit(1000).returns<ItemRow[]>()
  const grouped: Record<string, number> = {}
  for (const item of (rawItems || [])) {
    grouped[item.product_name] = (grouped[item.product_name] || 0) + (item.quantity || 1)
  }
  const topProducts = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity }))

  const { data: rawRatings } = await sb.from("ratings").select("*").order("created_at", { ascending: false }).limit(50).returns<RatingRow[]>()
  let avg = 0; let prevAvg = 0
  let reviews: { id: string; rating: number; text: string | null; timestamp: Date }[] = []
  if (rawRatings) {
    const monthR = rawRatings.filter((r) => new Date(r.created_at) >= monthStart)
    const prevR = rawRatings.filter((r) => new Date(r.created_at) >= prevMonthStart && new Date(r.created_at) < monthStart)
    avg = monthR.length ? monthR.reduce((s, r) => s + r.rating, 0) / monthR.length : 0
    prevAvg = prevR.length ? prevR.reduce((s, r) => s + r.rating, 0) / prevR.length : 0
    reviews = rawRatings.map((r) => ({ id: r.id, rating: r.rating, text: r.comment || null, timestamp: new Date(r.created_at) }))
  }

  return NextResponse.json({
    totalRevenue: thisRev, prevRevenue: lastRev,
    activeOrders: active, prevActiveOrders: prevActive,
    avgRating: avg, prevAvgRating: prevAvg,
    todayOrders, chartData, peakHours, topProducts, reviews,
  })
}
