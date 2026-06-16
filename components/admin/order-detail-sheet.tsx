"use client"

import { useEffect, useState } from "react"
import { Printer, XCircle } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { printReceipt } from "@/lib/print-receipt"
import { logger } from "@/lib/logger"
import { fetchApi } from "@/lib/tenant"
import { useTranslation } from "@/lib/use-translation"

// ─── Types ─────────────────────────────────────────────────

interface Item {
  id: number | string
  product_name: string
  quantity: number
  unit_price: number
  size?: string | null
}

interface OrderDetail {
  id: string
  order_number: number | null
  status: string | null
  total: number | null
  order_type: string | null
  table_number?: number | null
  customer_name?: string | null
  payment_status?: string | null
  created_at: string | null
  items?: Item[] | null
}

interface OrderDetailSheetProps {
  orderId: string | null
  open: boolean
  onClose: () => void
  onOrderUpdated: () => void
}

type BadgeColor = "green" | "blue" | "yellow" | "red" | "gray" | "purple" | "gold"

interface DisplayStatus {
  label: string
  color: BadgeColor
}

// ─── Helpers ──────────────────────────────────────────────

const resolveOrderStatus = (status: string | null | undefined, paymentStatus: string | null | undefined, t: (key: string) => string): DisplayStatus => {
  const s = String(status ?? "").toLowerCase()
  const p = String(paymentStatus ?? "").toLowerCase()

  if (p === "paid" && ["delivered", "completed", "out_for_delivery"].includes(s)) {
    return { label: `${t("order.status.completed")} · ${t("order.payment.paid")}`, color: "green" }
  }
  if (p === "refunded") return { label: t("order.payment.refunded"), color: "gray" }
  if (s === "cancelled") return { label: t("order.status.cancelled"), color: "red" }
  if (s === "preparing") return { label: t("order.status.preparing"), color: "blue" }
  if (s === "ready") return { label: t("order.status.ready"), color: "green" }
  if (s === "out_for_delivery") return { label: t("order.status.onTheWay"), color: "purple" }
  if (s === "pending") return { label: t("order.status.pending"), color: "yellow" }
  if (s === "completed" || s === "delivered") return { label: t("order.status.completed"), color: "green" }
  return { label: t("common.unknown"), color: "gray" }
}

const colorMap: Record<BadgeColor, string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  red: "bg-red-100 text-red-800 border-red-200",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  gold: "bg-amber-100 text-amber-800 border-amber-200",
}

// ─── Main Component ──────────────────────────────────────

export function OrderDetailSheet({ orderId, open, onClose, onOrderUpdated }: OrderDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <OrderDetailPanel key={orderId || "no-order"} orderId={orderId} onOrderUpdated={onOrderUpdated} />
      </SheetContent>
    </Sheet>
  )
}

function OrderDetailPanel({ orderId, onOrderUpdated }: { orderId: string | null; onOrderUpdated: () => void }) {
  const { t, lang } = useTranslation()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  const fmtNum = (n: number) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")
  const currency = lang === "ar" ? "د.ج" : "DA"

  const formatDateTime = (iso: string | null | undefined): string => {
    if (!iso) return "—"
    try {
      return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(iso))
    } catch {
      return "—"
    }
  }

  useEffect(() => {
    if (!orderId) return
    const controller = new AbortController()
    fetchApi(`/api/orders/${orderId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: OrderDetail & { error?: string }) => {
        if (data.error) {
          logger.error("Failed to load order", data.error)
          return
        }
        setOrder(data)
      })
      .catch((e: Error) => logger.error("Failed to load order", e))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [orderId])

  const handlePrint = () => {
    if (!order) return
    const items = (order.items || []).map((i) => ({
      name: i.product_name + (i.size && i.size !== "UNIQUE" ? ` (${i.size})` : ""),
      quantity: i.quantity,
      price: Number(i.unit_price),
    }))
    printReceipt({
      items,
      total: Number(order.total),
      orderNumber: order.order_number,
      orderType: order.order_type ?? "",
      tableNumber: order.table_number,
      createdAt: order.created_at ?? undefined,
    })
  }

  const handleCancel = async () => {
    if (!order) return
    setCancelling(true)
    try {
      const res = await fetchApi(`/api/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      })
      if (res.ok) {
        setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : null))
        onOrderUpdated()
      } else {
        const err: { error?: string } = await res.json().catch(() => ({}))
        logger.error("Cancel failed", err)
      }
    } catch {
      logger.error("Cancel failed: network error")
    }
    setCancelling(false)
  }

  const orderStatus = order?.status ?? null
  const orderPaymentStatus = order?.payment_status ?? null
  const isCancelled = String(orderStatus).toLowerCase() === "cancelled"
  const isCompleted = String(orderStatus).toLowerCase() === "completed" ||
    String(orderStatus).toLowerCase() === "out_for_delivery"
  const isActive = !isCancelled && !isCompleted

  return (
    <>
      <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-lg font-semibold">
              {order
                ? String(order.order_type ?? "").toLowerCase() === "takeaway"
                  ? t("order.type.takeaway")
                  : `${t("pos.table")} ${order.table_number ?? "—"}`
                : ""}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5">
              {order
                ? `#${order.order_number ?? "—"}${order.customer_name ? " · " + order.customer_name : ""}`
                : ""}
            </SheetDescription>
          </div>
          {order && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handlePrint}
                className="text-muted-foreground hover:text-foreground"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!orderId ? (
          <p className="text-sm text-muted-foreground text-center py-12">—</p>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !order ? (
          <p className="text-sm text-muted-foreground text-center py-12">—</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {(() => {
                const { label, color } = resolveOrderStatus(orderStatus, orderPaymentStatus, t)
                return (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorMap[color]}`}>
                    {label}
                  </span>
                )
              })()}
              <span className="text-xs text-muted-foreground">
                {formatDateTime(order.created_at)}
              </span>
            </div>

            <div className="space-y-1.5">
              {(order.items || []).map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                  <span className="text-sm text-foreground/80">
                    <span className="text-muted-foreground">{item.quantity}x</span>{" "}
                    {item.product_name}
                    {item.size && item.size !== "UNIQUE" ? ` (${item.size})` : ""}
                  </span>
                  <span className="text-sm text-foreground font-medium">
                    {fmtNum(Number(item.unit_price) * item.quantity)} {currency}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-foreground">{t("track.total")}</span>
                <span className="text-xl font-bold text-foreground">
                  {fmtNum(Number(order.total) || 0)} {currency}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {order && (
        <div className="p-4 border-t border-border space-y-2">
          <Button variant="outline" className="w-full" onClick={handlePrint}>
            <Printer className="h-4 w-4 ms-2" />
            {t("common.print")}
          </Button>
          {isActive && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {t("order.cancelling")}
                </span>
              ) : (
                <>
                  <XCircle className="h-4 w-4 ms-2" />
                  {t("pos.cancelOrder")}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </>
  )
}
