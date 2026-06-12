"use client"

import { useEffect, useState } from "react"
import type { PosOrder, PosOrderStatus } from "@/lib/pos-types"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"

interface OrderCardProps {
  order: PosOrder
  isSelected: boolean
  onSelect: () => void
  onStatusChange: (orderId: string | number, status: PosOrderStatus) => void
  onCancel: (orderId: string | number) => void
}

function formatTimeAgo(date: Date, t: (key: string) => string): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return t("time.justNow")
  if (minutes === 1) return t("time.minAgo")
  if (minutes < 60) return `${minutes} ${t("time.minsAgo")}`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return t("time.hourAgo")
  return `${hours} ${t("time.hoursAgo")}`
}

const STATUS_STYLES = {
  pending: { label: "statusNew", badge: "badge-amber", dot: "bg-amber-500", bar: "bg-amber-500", shadow: "shadow-amber-500/10" },
  preparing: { label: "statusPreparing", badge: "badge-sky", dot: "bg-sky-500", bar: "bg-sky-500", shadow: "shadow-sky-500/10" },
  ready: { label: "statusReady", badge: "badge-emerald", dot: "bg-emerald-500", bar: "bg-emerald-500", shadow: "shadow-emerald-500/10" },
  out_for_delivery: { label: "statusOutForDelivery", badge: "badge-violet", dot: "bg-violet-500", bar: "bg-violet-500", shadow: "shadow-violet-500/10" },
  completed: { label: "statusCompleted", badge: "badge-neutral", dot: "bg-neutral-400", bar: "bg-neutral-400", shadow: "" },
  cancelled: { label: "statusCancelled", badge: "badge-rose", dot: "bg-rose-500", bar: "bg-rose-500", shadow: "" },
} as const

export function OrderCard({ order, isSelected, onSelect, onStatusChange, onCancel }: OrderCardProps) {
  const { t, lang } = useTranslation()
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(order.createdAt, t))
  const s = STATUS_STYLES[order.status]
  const cur = lang === "ar" ? "د.ج" : "DA"

  const orderTypeInfo = {
    delivery: { icon: "🛵", label: t("pos.delivery"), badge: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20" },
    takeaway: { icon: "🥡", label: t("pos.takeaway"), badge: "bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20" },
    dine_in: { icon: order.tableNumber ? "🪑" : "🍽️", label: order.tableNumber ? `${t("pos.table")} ${order.tableNumber}` : t("pos.dineIn"), badge: "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20" },
  }[order.orderType] || { icon: "🍽️", label: t("pos.dineIn"), badge: "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20" }

  useEffect(() => {
    const interval = setInterval(() => setTimeAgo(formatTimeAgo(order.createdAt, t)), 30000)
    return () => clearInterval(interval)
  }, [order.createdAt, t])

  const getNextStatus = (): PosOrderStatus | null => {
    switch (order.status) {
      case "pending": return "preparing"
      case "preparing": return "ready"
      case "ready": return order.orderType === "delivery" ? "out_for_delivery" : "completed"
      case "out_for_delivery": return "completed"
      default: return null
    }
  }

  const handleAdvanceStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = getNextStatus()
    if (next) onStatusChange(order.id, next)
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative bg-card rounded-2xl border border-border/50 overflow-hidden cursor-pointer",
        "transition-all duration-200 hover:shadow-lg hover:border-border/80 active:scale-[0.99]",
        isSelected && "ring-2 ring-primary/30 border-primary/30 shadow-xl",
      )}
    >
      {/* Top status bar */}
      <div className={cn("h-1.5 w-full", s.bar)} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold", s.badge)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
                {t(`pos.${s.label}`)}
              </span>
              <span className={cn("inline-flex px-2 py-1 rounded-lg text-[11px] font-semibold",
                order.paymentStatus === "paid"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              )}>
                {order.paymentStatus === "paid" ? t("pos.paid") : t("pos.unpaid")}
              </span>
              {order.orderType === "delivery" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
                  🛵 {t("pos.delivery")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border", orderTypeInfo.badge)}>
                {orderTypeInfo.icon} {orderTypeInfo.label}
              </span>
              <span className="text-xs text-muted-foreground font-mono">#{order.orderNumber}</span>
              {order.status === "pending" && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {order.items.slice(0, 4).map((item) => (
                <span key={item.id} className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1">
                  {item.quantity}× {item.name}
                </span>
              ))}
              {order.items.length > 4 && (
                <span className="text-xs text-muted-foreground font-semibold">+{order.items.length - 4}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-lg font-black text-foreground tabular-nums">{order.total.toLocaleString()} {cur}</span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2">
            {getNextStatus() && (
              <button onClick={handleAdvanceStatus}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 min-h-[44px]">
                {t(`pos.${STATUS_STYLES[getNextStatus()!].label}`)}
              </button>
            )}
            {order.status === "pending" && (
              <button onClick={(e) => { e.stopPropagation(); onCancel(order.id) }}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all min-h-[44px]">
                {t("common.cancel")}
              </button>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">{t("pos.viewDetails")}</span>
        </div>
      </div>
    </div>
  )
}
