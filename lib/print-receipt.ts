"use client";

interface ReceiptItem {
  name: string
  quantity: number
  price: number
}

interface ReceiptData {
  items: ReceiptItem[]
  total: number
  orderNumber: number | null
  orderType: string
  tableNumber?: number | null
  paid?: number
  change?: number
  createdAt?: string
}

export function printReceipt(data: ReceiptData) {
  const { items, total, orderNumber, orderType, tableNumber, paid, change, createdAt } = data

  const date = createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString()
  const typeLabel = orderType === "takeaway" ? "Takeaway" : `Table ${tableNumber || "—"}`

  const itemsHtml = items
    .map(
      (item) =>
        `<tr><td style="text-align:left;padding:1px 0">${item.quantity}x ${item.name}</td><td style="text-align:right;padding:1px 0;white-space:nowrap">${(item.price * item.quantity).toFixed(2)} DA</td></tr>`
    )
    .join("")

  const paymentHtml =
    paid !== undefined && change !== undefined
      ? `
    <tr><td style="text-align:left;padding:2px 0">Cash</td><td style="text-align:right;padding:2px 0">${paid.toFixed(2)} DA</td></tr>
    <tr><td style="text-align:left;padding:2px 0">Change</td><td style="text-align:right;padding:2px 0">${change.toFixed(2)} DA</td></tr>`
      : ""

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt #${orderNumber}</title>
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
  .line-items td { border-bottom:1px dotted #ccc; }
</style></head><body>
<div class="center header">
  <div class="logo">🍔 BURGER HOUSE</div>
  <p>Receipt #${orderNumber}</p>
  <p>${typeLabel}</p>
  <p>${date}</p>
</div>
<div class="divider"></div>
<table><thead><tr><th style="text-align:left">Item</th><th style="text-align:right">Price</th></tr></thead>
<tbody>${itemsHtml}</tbody></table>
<div class="divider-dense"></div>
<table>
  <tr class="total"><td style="text-align:left">TOTAL</td><td style="text-align:right">${total.toFixed(2)} DA</td></tr>
  ${paymentHtml}
</table>
<div class="footer">— Thank You —</div>
</body></html>`

  const w = window.open("", "_blank", "width=400,height=600")
  if (!w) { alert("Please allow pop-ups to print receipts"); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}
