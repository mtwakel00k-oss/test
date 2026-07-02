import { EscPosBuilder, Justification, CharSize, CutMode } from "./commands"
import type { OrderData, PrinterConfig } from "./types"

export function buildReceipt(
  order: OrderData,
  config: Pick<PrinterConfig, "header_text" | "footer_text" | "paper_width" | "charset_per_line" | "receipt_lang" | "show_logo" | "auto_cut" | "primary_color">,
  restaurantName: string,
): Uint8Array {
  const w = config.charset_per_line || 42
  const isAr = config.receipt_lang === "ar"
  const p = new EscPosBuilder()

  p.init()
  p.feed(2)

  // Restaurant name
  p.justify(Justification.CENTER)
  p.bold(true)
  p.charSize(CharSize.WIDE_TALL)
  p.writeline(restaurantName)
  p.charSize(CharSize.NORMAL)
  p.bold(false)
  p.feed(1)

  // Custom header
  if (config.header_text) {
    const header = renderTemplate(config.header_text, order, restaurantName)
    p.writeline(header)
    p.feed(1)
  }

  // Order info
  p.justify(Justification.LEFT)
  p.text(isAr ? `الطلب: #${order.order_number || order.order_id.slice(0, 8)}` : `Order: #${order.order_number || order.order_id.slice(0, 8)}`)
  p.feed(1)
  p.text(isAr ? `التاريخ: ${formatDate(order.created_at, isAr)}` : `Date: ${formatDate(order.created_at, isAr)}`)
  p.feed(1)
  if (order.customer_name) {
    p.text(isAr ? `العميل: ${order.customer_name}` : `Customer: ${order.customer_name}`)
    p.feed(1)
  }
  if (order.table_number) {
    p.text(isAr ? `الطاولة: ${order.table_number}` : `Table: ${order.table_number}`)
    p.feed(1)
  }
  if (order.order_type) {
    p.text(isAr ? `النوع: ${order.order_type}` : `Type: ${order.order_type}`)
    p.feed(1)
  }
  p.feed(1)

  // Header row
  p.hr("=", w)
  if (isAr) {
    p.text(`#  ${"الصنف".padEnd(18)} ${"الكمية".padStart(6)} ${"السعر".padStart(7)}`)
  } else {
    p.text(`#  ${"Item".padEnd(18)} ${"Qty".padStart(6)} ${"Price".padStart(7)}`)
  }
  p.hr("=", w)

  // Items
  if (order.items && order.items.length > 0) {
    for (const item of order.items) {
      const name = (item.name || "").substring(0, 18).padEnd(18)
      const qty = String(item.quantity || 1).padStart(6)
      const price = formatPrice((item.total_price || item.price || 0) * (item.quantity || 1), isAr).padStart(7)
      p.writeline(`   ${name} ${qty} ${price}`)
    }
  }
  p.hr("-", w)

  // Totals
  p.justify(Justification.RIGHT)
  p.bold(true)
  p.charSize(CharSize.WIDE)
  p.writeline(`${isAr ? "المجموع:" : "Total:"} ${formatPrice(order.total || 0, isAr)}`)
  p.charSize(CharSize.NORMAL)
  p.bold(false)

  if (order.paid !== undefined) {
    p.writeline(`${isAr ? "المدفوع:" : "Paid:"} ${formatPrice(order.paid, isAr)}`)
  }
  if (order.change !== undefined && order.change > 0) {
    p.writeline(`${isAr ? "الباقي:" : "Change:"} ${formatPrice(order.change, isAr)}`)
  }

  p.feed(1)
  p.justify(Justification.CENTER)

  // Custom footer
  if (config.footer_text) {
    const footer = renderTemplate(config.footer_text, order, restaurantName)
    p.writeline(footer)
    p.feed(1)
  }

  // Thank you
  p.bold(false)
  p.writeline(isAr ? "شكراً لزيارتكم" : "Thank You!")
  p.feed(2)

  // QR with order link if available
  if (order.tracking_url) {
    p.qrCode(order.tracking_url, 4)
    p.feed(1)
  }

  p.feed(3)

  // Cut
  if (config.auto_cut) {
    p.cut(CutMode.FULL)
  }

  return p.build()
}

export function buildKitchenTicket(
  order: OrderData,
  config: Pick<PrinterConfig, "header_text" | "footer_text" | "paper_width" | "charset_per_line" | "receipt_lang" | "auto_cut">,
  restaurantName: string,
): Uint8Array {
  const w = config.charset_per_line || 42
  const isAr = config.receipt_lang === "ar"
  const p = new EscPosBuilder()

  p.init()
  p.feed(1)
  p.justify(Justification.CENTER)
  p.bold(true)
  p.charSize(CharSize.WIDE_TALL)
  p.writeline(isAr ? "🍳 المطبخ" : "🍳 KITCHEN")
  p.charSize(CharSize.NORMAL)
  p.bold(false)
  p.feed(1)

  // Order info
  p.justify(Justification.LEFT)
  if (order.table_number) {
    p.charSize(CharSize.WIDE)
    p.bold(true)
    p.writeline(`${isAr ? "طاولة:" : "Table:"} ${order.table_number}`)
    p.bold(false)
    p.charSize(CharSize.NORMAL)
  }
  p.text(`${isAr ? "الطلب: #" : "Order: #"}${order.order_number || order.order_id.slice(0, 8)}`)
  p.feed(1)
  if (order.customer_name) {
    p.text(`${isAr ? "العميل:" : "Customer:"} ${order.customer_name}`)
    p.feed(1)
  }
  p.text(`${isAr ? "الوقت:" : "Time:"} ${new Date(order.created_at).toLocaleTimeString(isAr ? "ar-DZ" : "en-US", { hour: "2-digit", minute: "2-digit" })}`)
  p.feed(1)
  p.writeline(isAr ? `النوع: ${order.order_type}` : `Type: ${order.order_type}`)
  p.feed(1)

  p.hr("=", w)

  // Items
  if (order.items && order.items.length > 0) {
    for (const item of order.items) {
      p.bold(true)
      p.writeline(`   ${item.quantity || 1}x ${(item.name || "").substring(0, 24)}`)
      p.bold(false)
      if (item.notes) {
        p.writeline(`     ${isAr ? "ملاحظات:" : "Notes:"} ${item.notes}`)
      }
    }
  }

  p.feed(2)
  p.hr("-", w)
  p.feed(1)

  if (order.instructions) {
    p.bold(true)
    p.writeline(isAr ? "تعليمات:" : "Instructions:")
    p.bold(false)
    p.writeline(order.instructions)
    p.feed(1)
  }

  p.feed(3)
  if (config.auto_cut) {
    p.cut(CutMode.FULL)
  }

  return p.build()
}

function renderTemplate(tmpl: string, order: OrderData, restaurant: string): string {
  return tmpl
    .replace(/\{\{restaurant_name\}\}/g, restaurant)
    .replace(/\{\{order_number\}\}/g, String(order.order_number || ""))
    .replace(/\{\{date\}\}/g, formatDate(order.created_at, true))
    .replace(/\{\{customer_name\}\}/g, order.customer_name || "")
}

function formatDate(dateStr: string, isAr: boolean): string {
  const d = new Date(dateStr)
  return d.toLocaleString(isAr ? "ar-DZ" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPrice(amount: number, isAr: boolean): string {
  return `${amount.toFixed(2)} ${isAr ? "د.ج" : "DZD"}`
}
