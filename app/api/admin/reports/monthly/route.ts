import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/api-auth"
import { supabaseForRequestAdmin, getTenantConfig } from "@/lib/tenant"
import { buildMonthlyReportPdf } from "@/lib/pdf-reports"

export async function GET(req: NextRequest) {
  const session = requireAdmin(req)
  if (isErrorResponse(session)) return session

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()))
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1))

  const sb = await supabaseForRequestAdmin(req)
  const tenant = await getTenantConfig(session.slug ?? "")

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01T00:00:00Z`
  const monthEnd = month === 12
    ? `${year + 1}-01-01T00:00:00Z`
    : `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00Z`

  const { data: ordersData } = await sb
    .from("orders")
    .select("id, total, order_type, status, discount_amount, created_at")
    .gte("created_at", monthStart)
    .lte("created_at", monthEnd)

  const orders = ordersData ?? []
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0)
  const totalDiscount = orders.reduce((s: number, o: any) => s + Number(o.discount_amount || 0), 0)

  const byType: Record<string, { count: number; revenue: number }> = {}
  const byDay: Record<string, { count: number; revenue: number }> = {}

  for (const o of orders as any[]) {
    const t = o.order_type || "takeaway"
    if (!byType[t]) byType[t] = { count: 0, revenue: 0 }
    byType[t].count++
    byType[t].revenue += Number(o.total || 0)

    const day = String(o.created_at).slice(0, 10)
    if (!byDay[day]) byDay[day] = { count: 0, revenue: 0 }
    byDay[day].count++
    byDay[day].revenue += Number(o.total || 0)
  }

  const days = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]))

  const orderIds = (orders as any[]).map((o: any) => o.id)

  let topProducts: [string, { qty: number; rev: number }][] = []
  if (orderIds.length > 0) {
    const { data: items } = await sb
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .in("order_id", orderIds)
      .limit(500)

    const productSales: Record<string, { qty: number; rev: number }> = {}
    for (const i of items ?? []) {
      const ii = i as any
      const name = ii.product_name || "Unknown"
      if (!productSales[name]) productSales[name] = { qty: 0, rev: 0 }
      productSales[name].qty += Number(ii.quantity || 0)
      productSales[name].rev += Number(ii.unit_price || 0) * Number(ii.quantity || 0)
    }

    topProducts = Object.entries(productSales).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10)
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  const pdfBuffer = buildMonthlyReportPdf({
    restaurantName: tenant?.name ?? session.slug ?? "Restaurant",
    month: `${monthNames[month - 1]} ${year}`,
    summary: [
      { label: "Total Orders", value: String(totalOrders) },
      { label: "Total Revenue", value: `${totalRevenue.toFixed(2)} DZD` },
      { label: "Total Discounts", value: `${totalDiscount.toFixed(2)} DZD` },
      { label: "Avg Order", value: totalOrders > 0 ? `${(totalRevenue / totalOrders).toFixed(2)} DZD` : "0" },
      { label: "Avg Day", value: days.length > 0 ? `${(totalRevenue / days.length).toFixed(2)} DZD` : "0" },
    ],
    dailyBreakdown: {
      headers: ["Date", "Orders", "Revenue"],
      rows: days.map(([d, info]) => [d, String(info.count), `${info.revenue.toFixed(2)} DZD`]),
    },
    orderTypeBreakdown: {
      headers: ["Type", "Count", "Revenue"],
      rows: Object.entries(byType).map(([type, d]) => [
        type === "dine_in" ? "Dine-in" : type === "takeaway" ? "Takeaway" : "Delivery",
        String(d.count),
        `${d.revenue.toFixed(2)} DZD`,
      ]),
    },
    topProducts: {
      headers: ["Product", "Qty", "Revenue"],
      rows: topProducts.map(([name, d]) => [name, String(d.qty), `${d.rev.toFixed(2)} DZD`]),
    },
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="monthly-report-${year}-${String(month).padStart(2, "0")}.pdf"`,
    },
  })
}
