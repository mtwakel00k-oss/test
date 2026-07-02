import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequestAdmin, getTenantConfig } from "@/lib/tenant"
import { requireAdmin, isErrorResponse } from "@/lib/api-auth"
import { sendToNetworkPrinter, buildReceipt } from "@/lib/escpos"

export async function GET(req: NextRequest, { params }: { params: Promise<{ order_id: string }> }) {
  try {
    const session = requireAdmin(req)
    if (isErrorResponse(session)) return session

    const { order_id } = await params
    const sb = await supabaseForRequestAdmin(req)

    const { data: order, error } = await sb
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", order_id)
      .maybeSingle()

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const { data: printer, error: pe } = await sb
      .from("printer_config")
      .select("*")
      .eq("tenant_slug", session.slug)
      .eq("enabled", true)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pe || !printer) {
      return NextResponse.json({ error: "No configured printer found." }, { status: 404 })
    }

    const slug = session.slug || ""
    if (!slug) return NextResponse.json({ error: "No tenant slug" }, { status: 400 })
    const tenantConfig = await getTenantConfig(slug)
    const restaurantName = tenantConfig?.name || "Restaurant"

    const data = buildReceipt(
      {
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name || "",
        table_number: order.table_number,
        order_type: order.order_type,
        total: order.total,
        paid: order.paid,
        change: order.change,
        created_at: order.created_at,
        items: (order.items || []).map((i: any) => ({
          name: i.product_name,
          quantity: i.quantity,
          price: i.unit_price,
          total_price: i.unit_price,
        })),
      },
      printer,
      restaurantName,
    )

    if (printer.connection_type === "network") {
      await sendToNetworkPrinter(data, {
        ipAddress: printer.ip_address,
        port: printer.port,
      })
      return NextResponse.json({ ok: true, message: "Receipt sent to printer" })
    }

    return NextResponse.json({
      ok: true,
      encoding: "escpos",
      data: Array.from(data),
      printer_type: printer.connection_type,
      copies: printer.copies_receipt || 1,
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Print error: ${err.message}` }, { status: 500 })
  }
}
