"use client"

import { useEffect, useState } from "react"
import { Printer, XCircle, Search } from "lucide-react"
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
    printReceipt(order.id)
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
      <SheetHeader className="px-8 pt-8 pb-6 border-b border-border/50 bg-muted/5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-xl font-black text-foreground tracking-tight leading-none mb-2">
              {order
                ? String(order.order_type ?? "").toLowerCase() === "takeaway"
                  ? t("order.type.takeaway")
                  : `${t("pos.table")} ${order.table_number ?? "—"}`
                : ""}
            </SheetTitle>
            <SheetDescription className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              {order
                ? `#${order.order_number ?? "—"}${order.customer_name ? " · " + order.customer_name : ""}`
                : ""}
            </SheetDescription>
          </div>
          {order && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrint}
                className="size-10 rounded-xl border-border/50 hover:bg-primary/10 hover:text-primary transition-all"
              >
                <Printer className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background/50 backdrop-blur-xl">
        {!orderId ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/30">
            <Search className="size-10 mb-4 opacity-30" />
            <p className="text-xs font-black uppercase tracking-widest">—</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("common.loading") || "جاري التحميل..."}</p>
          </div>
        ) : !order ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/30">
            <XCircle className="size-10 mb-4 opacity-30" />
            <p className="text-xs font-black uppercase tracking-widest">—</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
              {(() => {
                const { label, color } = resolveOrderStatus(orderStatus, orderPaymentStatus, t)
                return (
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${colorMap[color]}`}>
                    {label}
                  </span>
                )
              })()}
              <div className="flex items-center gap-1.5 text-muted-foreground/60">
                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {formatDateTime(order.created_at)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">{t("pos.items")}</label>
              <div className="space-y-3">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-4 rounded-2xl bg-muted/20 border border-border/30 hover:border-primary/20 transition-all group">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-black text-foreground leading-tight">
                        {item.product_name}
                        {item.size && item.size !== "UNIQUE" ? (
                          <span className="ms-2 text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-lg">{item.size}</span>
                        ) : ""}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground/60">
                        {item.quantity}x {fmtNum(Number(item.unit_price))} {currency}
                      </span>
                    </div>
                    <span className="text-sm font-black text-foreground tabular-nums">
                      {fmtNum(Number(item.unit_price) * item.quantity)} <span className="text-[10px] opacity-40">{currency}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 shadow-inner">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1">{t("track.total")}</span>
                  <span className="text-[10px] font-bold text-muted-foreground/40">{order.items?.length || 0} {t("pos.items")}</span>
                </div>
                <span className="text-3xl font-black text-foreground tracking-tighter">
                  {fmtNum(Number(order.total) || 0)} <span className="text-xs opacity-40">{currency}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {order && (
        <div className="p-8 border-t border-border/50 bg-background/50 backdrop-blur-xl space-y-4">
          <Button variant="outline" className="w-full h-14 rounded-2xl border-border/50 text-xs font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all shadow-sm" onClick={handlePrint}>
            <Printer className="size-4 ms-3" />
            {t("common.print")}
          </Button>
          {isActive && (
            <Button
              variant="destructive"
              className="w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-rose-500/20"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {t("order.cancelling")}
                </span>
              ) : (
                <>
                  <XCircle className="size-4 ms-3" />
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
