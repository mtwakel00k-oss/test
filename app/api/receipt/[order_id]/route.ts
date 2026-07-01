import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequest, getTenantConfig, parseSession } from "@/lib/tenant"
import { requireAdmin } from "@/lib/api-auth"
import { logger } from "@/lib/logger"

function h(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function extractSlug(req: NextRequest): string {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.slug) return session.slug
  const referer = req.headers.get("referer") || ""
  const m = referer.match(/\/([^/]+)\/(?:admin|menu|pos|kitchen|order|login)\b/)
  if (m && !new Set(["admin", "menu", "pos", "kitchen", "order", "login"]).has(m[1])) {
    return m[1]
  }
  return ""
}

function buildReceiptHtml(opts: {
  restaurantName: string
  orderNumber: number | null
  typeLabel: string
  date: string
  itemsHtml: string
  total: string
  paidHtml: string
  customerPhone: string | null
}): string {
  const phoneHtml = opts.customerPhone
    ? `<p style="text-align:center;margin-top:4px;font-size:14px;font-weight:bold">${h(opts.customerPhone)}</p>`
    : ""

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt #${h(String(opts.orderNumber ?? ""))}</title>
<style>
  @page { margin:0; size:80mm auto; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body {
    width:80mm; margin:0 auto; padding:6mm 4mm;
    font-family:'Courier New',Courier,monospace;
    font-size:11px; color:#000; background:#fff;
    line-height:1.4;
  }
  .center { text-align:center; }
  .header { margin-bottom:6px; }
  .header .logo { font-size:20px; font-weight:bold; letter-spacing:1px; margin-bottom:2px; }
  .header p { margin:1px 0; font-size:10px; color:#333; }
  .divider { border-top:1px dashed #000; margin:6px 0; }
  .divider-dense { border-top:1px dashed #000; margin:3px 0; }
  table { width:100%; border-collapse:collapse; }
  td { padding:1px 0; font-size:10px; }
  th { font-size:9px; text-transform:uppercase; color:#555; padding:2px 0; }
  .total td { font-weight:bold; padding-top:4px; font-size:11px; }
  .footer { text-align:center; margin-top:10px; font-size:10px; color:#555; }
</style></head><body>
<div class="center header">
  <div class="logo">${h(opts.restaurantName)}</div>
  <p>Receipt #${h(String(opts.orderNumber ?? ""))}</p>
  <p>${h(opts.typeLabel)}</p>
  <p>${h(opts.date)}</p>
</div>
<div class="divider"></div>
<table><thead><tr><th style="text-align:left">Item</th><th style="text-align:right">Price</th></tr></thead>
<tbody>${opts.itemsHtml}</tbody></table>
<div class="divider-dense"></div>
<table>
  <tr class="total"><td style="text-align:left">TOTAL</td><td style="text-align:right">${opts.total}</td></tr>
  ${opts.paidHtml}
</table>
<div class="footer">— Thank You —</div>
${phoneHtml}
<script>
window.onload = function() { setTimeout(function() { window.print(); }, 300); };
window.onafterprint = function() { setTimeout(function() { window.close(); }, 500); };
</script>
</body></html>`
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ order_id: string }> }) {
  try {
    const auth = requireAdmin(req)
    if (auth instanceof NextResponse) return auth

    const { order_id } = await params
    const { searchParams } = new URL(req.url)
    const paidParam = searchParams.get("paid")
    const changeParam = searchParams.get("change")

    const sb = await supabaseForRequest(req)

    const { data: order, error } = await sb
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", order_id)
      .maybeSingle()

    if (error || !order) {
      return new NextResponse("Order not found", { status: 404 })
    }

    const slug = extractSlug(req)
    const tenantConfig = slug ? await getTenantConfig(slug) : null
    const restaurantName = tenantConfig?.name || "Restaurant"

    const itemsHtml = (order.items || [])
      .map((i: { product_name: string; size?: string; unit_price: string | number; quantity: number }) => {
        const name = h(i.product_name + (i.size && i.size !== "UNIQUE" ? ` (${i.size})` : ""))
        const subtotal = (Number(i.unit_price) * i.quantity).toFixed(2)
        return `<tr><td style="text-align:left;padding:1px 0">${i.quantity}x ${name}</td><td style="text-align:right;padding:1px 0;white-space:nowrap">${subtotal} DA</td></tr>`
      })
      .join("")

    const date = order.created_at
      ? new Date(order.created_at).toLocaleString()
      : new Date().toLocaleString()

    const typeLabel =
      order.order_type === "takeaway" ? "Takeaway" :
      order.order_type === "delivery" ? "Delivery" :
      `Table ${order.table_number || "—"}`

    const paid = paidParam !== null ? Number(paidParam) : undefined
    const change = changeParam !== null ? Number(changeParam) : undefined

    const paidHtml =
      paid !== undefined && change !== undefined && !isNaN(paid) && !isNaN(change)
        ? `<tr><td style="text-align:left;padding:2px 0">Cash</td><td style="text-align:right;padding:2px 0">${paid.toFixed(2)} DA</td></tr><tr><td style="text-align:left;padding:2px 0">Change</td><td style="text-align:right;padding:2px 0">${change.toFixed(2)} DA</td></tr>`
        : ""

    const html = buildReceiptHtml({
      restaurantName,
      orderNumber: order.order_number,
      typeLabel,
      date,
      itemsHtml,
      total: `${Number(order.total).toFixed(2)} DA`,
      paidHtml,
      customerPhone: order.customer_phone,
    })

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  } catch (e) {
    logger.error("Receipt generation failed", e)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
