import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/api-auth"
import { supabaseForRequestAdmin, getTenantConfig } from "@/lib/tenant"
import { buildDailyReportPdf } from "@/lib/pdf-reports"

export async function GET(req: NextRequest) {
  const session = requireAdmin(req)
  if (isErrorResponse(session)) return session

  const { searchParams } = new URL(req.url)
  const dateStr: string = searchParams.get("date") ?? new Date().toISOString().slice(0, 10)

  const sb = await supabaseForRequestAdmin(req)
  const tenant = await getTenantConfig(session.slug ?? "")

  const dayStart = `${dateStr}T00:00:00Z`
  const dayEnd = `${dateStr}T23:59:59Z`

  const { data: ordersData } = await sb
    .from("orders")
    .select("id, total, order_type, status, discount_amount")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)

  const orders = ordersData ?? []
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0)
  const totalDiscount = orders.reduce((s: number, o: any) => s + Number(o.discount_amount || 0), 0)

  const byType: Record<string, { count: number; revenue: number }> = {}
  for (const o of orders as any[]) {
    const t = o.order_type || "takeaway"
    if (!byType[t]) byType[t] = { count: 0, revenue: 0 }
    byType[t].count++
    byType[t].revenue += Number(o.total || 0)
  }

  const orderIds = (orders as any[]).map((o: any) => o.id)

  let topProducts: [string, { qty: number; rev: number }][] = []
  if (orderIds.length > 0) {
    const { data: items } = await sb
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .in("order_id", orderIds)
      .limit(200)

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

  const pdfBuffer = buildDailyReportPdf({
    restaurantName: tenant?.name ?? session.slug ?? "Restaurant",
    date: dateStr,
    summary: [
      { label: "Total Orders", value: String(totalOrders) },
      { label: "Total Revenue", value: `${totalRevenue.toFixed(2)} DZD` },
      { label: "Total Discounts", value: `${totalDiscount.toFixed(2)} DZD` },
      { label: "Avg Order", value: totalOrders > 0 ? `${(totalRevenue / totalOrders).toFixed(2)} DZD` : "0" },
    ],
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
      "Content-Disposition": `attachment; filename="daily-report-${dateStr}.pdf"`,
    },
  })
}
