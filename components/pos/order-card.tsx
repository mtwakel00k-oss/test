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

const STATUS_CONFIG = {
  pending: { label: "statusNew", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", dot: "bg-amber-500", border: "border-l-amber-500" },
  preparing: { label: "statusPreparing", badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300", dot: "bg-sky-500", border: "border-l-sky-500" },
  ready: { label: "statusReady", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", dot: "bg-emerald-500", border: "border-l-emerald-500" },
  out_for_delivery: { label: "statusOutForDelivery", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", dot: "bg-violet-500", border: "border-l-violet-500" },
  completed: { label: "statusCompleted", badge: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800/30 dark:text-neutral-400", dot: "bg-neutral-400", border: "border-l-neutral-400" },
  cancelled: { label: "statusCancelled", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300", dot: "bg-rose-500", border: "border-l-rose-500" },
} as const

const ORDER_TYPE_CONFIG = {
  delivery: { icon: "🛵", label: "pos.delivery" },
  takeaway: { icon: "🥡", label: "pos.takeaway" },
  dine_in: { icon: "🍽️", label: "pos.dineIn" },
} as const

export function OrderCard({ order, isSelected, onSelect, onStatusChange, onCancel }: OrderCardProps) {
  const { t, lang } = useTranslation()
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(order.createdAt, t))
  const status = STATUS_CONFIG[order.status]
  const cur = lang === "ar" ? "د.ج" : "DA"

  const orderTypeLabel = order.orderType === "dine_in" && order.tableNumber
    ? `${t("pos.table")} ${order.tableNumber}`
    : t(ORDER_TYPE_CONFIG[order.orderType]?.label || "pos.dineIn")
  const orderTypeIcon = ORDER_TYPE_CONFIG[order.orderType]?.icon || "🍽️"

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
        "relative bg-card rounded-xl border border-border cursor-pointer overflow-hidden",
        "transition-all duration-200",
        "hover:border-primary/20 hover:shadow-sm",
        isSelected && "ring-2 ring-primary/20 border-primary/30 shadow-sm",
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", status.border)} />

      <div className="flex items-start justify-between p-3 pr-4 gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold", status.badge)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
              {t(`pos.${status.label}`)}
            </span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              order.paymentStatus === "paid"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                : "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
            )}>
              {order.paymentStatus === "paid" ? t("pos.paid") : t("pos.unpaid")}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">{orderTypeIcon} {orderTypeLabel}</span>
            <span className="text-xs text-muted-foreground">#{order.orderNumber}</span>
            {order.status === "pending" && (
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-sm font-bold text-foreground tabular-nums">{order.total.toLocaleString()} {cur}</span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo}</span>
        </div>
      </div>

      <div className="px-3 pb-3 pr-4">
        <div className="flex items-center gap-1 flex-wrap mt-1">
          {order.items.slice(0, 3).map((item) => (
            <span key={item.id} className="text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
              {item.quantity}x {item.name}
            </span>
          ))}
          {order.items.length > 3 && (
            <span className="text-xs text-muted-foreground">+{order.items.length - 3}</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            {getNextStatus() && (
              <button onClick={handleAdvanceStatus}
                className={cn(
                  "text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all",
                  "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground active:scale-95"
                )}>
                {t(`pos.${STATUS_CONFIG[getNextStatus()!].label}`)}
              </button>
            )}
            {order.status === "pending" && (
              <button onClick={(e) => { e.stopPropagation(); onCancel(order.id) }}
                className="text-[11px] font-medium px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors">
                {t("common.cancel")}
              </button>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {isSelected ? t("pos.viewDetails") : t("pos.viewDetails")}
          </span>
        </div>
      </div>
    </div>
  )
}
