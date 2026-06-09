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
  pending: { label: "statusNew", dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-300", border: "border-l-amber-500" },
  preparing: { label: "statusPreparing", dot: "bg-sky-500", bg: "bg-sky-50 dark:bg-sky-950/20", text: "text-sky-700 dark:text-sky-300", border: "border-l-sky-500" },
  ready: { label: "statusReady", dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-300", border: "border-l-emerald-500" },
  out_for_delivery: { label: "statusOutForDelivery", dot: "bg-violet-500", bg: "bg-violet-50 dark:bg-violet-950/20", text: "text-violet-700 dark:text-violet-300", border: "border-l-violet-500" },
  completed: { label: "statusCompleted", dot: "bg-neutral-400", bg: "bg-neutral-100 dark:bg-neutral-800/20", text: "text-neutral-600 dark:text-neutral-400", border: "border-l-neutral-400" },
  cancelled: { label: "statusCancelled", dot: "bg-rose-500", bg: "bg-rose-50 dark:bg-rose-950/20", text: "text-rose-700 dark:text-rose-300", border: "border-l-rose-500" },
} as const

export function OrderCard({ order, isSelected, onSelect, onStatusChange, onCancel }: OrderCardProps) {
  const { t, lang } = useTranslation()
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(order.createdAt, t))
  const status = STATUS_CONFIG[order.status]
  const isActive = order.status === "pending" || order.status === "preparing"
  const cur = lang === "ar" ? "د.ج" : "DA"

  const orderTypeDisplay = () => {
    if (order.orderType === "delivery") return { label: t("pos.delivery"), icon: "🛵" }
    if (order.orderType === "takeaway") return { label: t("pos.takeaway"), icon: "🥡" }
    if (order.tableNumber) return { label: `${t("pos.table")} ${order.tableNumber}`, icon: "🪑" }
    return { label: t("pos.dineIn"), icon: "🍽️" }
  }
  const typeInfo = orderTypeDisplay()

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
        "transition-all duration-200 ease-out",
        "hover:shadow-sm hover:border-primary/20",
        isSelected && "ring-1 ring-primary/30 border-primary/30 shadow-sm",
        isActive && "hover:shadow-md",
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", status.border)} />

      <div className="flex items-start justify-between p-3 pr-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold",
              status.bg, status.text
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
              {t(`pos.${status.label}`)}
            </span>
            <span className={cn(
              "text-[11px] px-1.5 py-0.5 rounded font-medium",
              order.paymentStatus === "paid"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400",
            )}>
              {order.paymentStatus === "paid" ? t("pos.paid") : t("pos.unpaid")}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm font-semibold text-foreground">{typeInfo.icon} {typeInfo.label}</span>
            <span className="text-xs text-muted-foreground">#{order.orderNumber}</span>
            {order.status === "pending" && (
              <span className="flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{order.serverName}</p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-sm font-bold text-foreground tabular-nums">{order.total.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} {cur}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {timeAgo}
          </span>
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

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            {getNextStatus() && (
              <button onClick={handleAdvanceStatus}
                className={cn(
                  "text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all",
                  "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground active:scale-95"
                )}>
                {t(`pos.${STATUS_CONFIG[getNextStatus()!].label}`)} →
              </button>
            )}
            {order.status === "pending" && (
              <button onClick={(e) => { e.stopPropagation(); onCancel(order.id) }}
                className="text-[11px] font-medium px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors">
                {t("common.cancel")}
              </button>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onSelect() }}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            {isSelected ? t("common.close") : t("pos.viewDetails")}
          </button>
        </div>
      </div>
    </div>
  )
}
