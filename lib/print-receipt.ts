"use client"

export function printReceipt(orderId: string | number, options?: { paid?: number; change?: number }) {
  const params = new URLSearchParams()
  if (options?.paid !== undefined) params.set("paid", String(options.paid))
  if (options?.change !== undefined) params.set("change", String(options.change))
  const qs = params.toString()
  const url = `/api/receipt/${orderId}${qs ? `?${qs}` : ""}`

  const w = window.open(url, "_blank", "width=400,height=600")
  if (!w) {
    alert("Please allow pop-ups to print receipts")
    return
  }
  w.focus()
}
