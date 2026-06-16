"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
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

const statusStyling: Record<string, { color: string; bgColor: string }> = {
  pending: { color: "text-amber-700", bgColor: "bg-amber-50" },
  preparing: { color: "text-blue-700", bgColor: "bg-blue-50" },
  ready: { color: "text-emerald-700", bgColor: "bg-emerald-50" },
  out_for_delivery: { color: "text-purple-700", bgColor: "bg-purple-50" },
  completed: { color: "text-slate-500", bgColor: "bg-slate-100" },
  cancelled: { color: "text-rose-700", bgColor: "bg-rose-50" },
}

function formatTimeAgo(date: Date, t: (key: string) => string): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return t("time.justNow")
  if (minutes === 1) return t("time.minAgo")
  if (minutes < 60) return `${t("time.minsAgo")} ${minutes}`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return t("time.hourAgo")
  return `${t("time.hoursAgo")} ${hours}`
}

export function OrderCard({ order, isSelected, onSelect, onStatusChange, onCancel }: OrderCardProps) {
  const { t, lang } = useTranslation()
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(order.createdAt, t))
  const [isExpanded, setIsExpanded] = useState(false)
  const status = statusStyling[order.status]
  const isActive = order.status === "pending" || order.status === "preparing"
  const cur = lang === "ar" ? "د.ج" : "DA"

  const STATUS_LABELS: Record<string, string> = {
    pending: t("pos.statusNew"),
    preparing: t("pos.statusPreparing"),
    ready: t("pos.statusReady"),
    out_for_delivery: t("pos.statusOutForDelivery"),
    completed: t("pos.statusCompleted"),
    cancelled: t("pos.statusCancelled"),
  }

  const orderTypeDisplay = () => {
    if (order.orderType === "delivery")   return { label: t("pos.delivery"),  icon: "🛵", cls: "text-purple-700 bg-purple-50" }
    if (order.orderType === "takeaway")   return { label: t("pos.takeaway"),  icon: "🥡", cls: "text-orange-700 bg-orange-50" }
    if (order.tableNumber)               return { label: `${t("pos.table")} ${order.tableNumber}`, icon: "🪑", cls: "text-blue-700 bg-blue-50" }
    return { label: t("pos.dineIn"), icon: "🪑", cls: "text-blue-700 bg-blue-50" }
  }

  const typeInfo = orderTypeDisplay()

  useEffect(() => {
    const interval = setInterval(() => setTimeAgo(formatTimeAgo(order.createdAt, t)), 30000)
    return () => clearInterval(interval)
  }, [order.createdAt, t])

  const getNextStatus = (): PosOrderStatus | null => {
    switch (order.status) {
      case "pending":
        return "preparing"
      case "preparing":
        return "ready"
      case "ready":
        return order.orderType === "delivery" ? "out_for_delivery" : "completed"
      case "out_for_delivery":
        return "completed"
      default:
        return null
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
        "group relative bg-card rounded-xl border border-border cursor-pointer",
        "transition-all duration-300 ease-in-out",
        "hover:shadow-md hover:border-primary/20",
        isSelected && "ring-2 ring-primary/30 border-primary/30 shadow-lg",
        isActive,
      )}
    >
      <div
        className="flex items-start justify-between p-4"
        onClick={(e) => {
          e.stopPropagation()
          setIsExpanded((v) => !v)
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xl font-semibold", typeInfo.cls.split(" ")[0])}>
              {typeInfo.icon} {typeInfo.label}
            </span>
            {order.status === "pending" && (
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("kitchen.orderHash")}{order.orderNumber} &bull; {order.serverName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300", status.bgColor, status.color)}>
            {STATUS_LABELS[order.status]}
          </div>
          <div
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium border",
              order.paymentStatus === "paid"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
            )}
          >
            {order.paymentStatus === "paid" ? t("pos.paid") : t("pos.unpaid")}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-96" : "max-h-0"}`}>
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          <div className="space-y-1.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground/80">
                  <span className="text-muted-foreground">{item.quantity}x</span> {item.name}
                </span>
                <span className="text-muted-foreground font-medium">{(item.price * item.quantity).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} {cur}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timeAgo}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-semibold text-foreground">{order.total.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} {cur}</span>
              {order.status !== "completed" && order.status !== "cancelled" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancel(order.id)
                  }}
                  className={cn("p-1.5 rounded-lg transition-all duration-200", "text-rose-500 hover:bg-rose-50 hover:text-rose-700")}
                  aria-label={t("common.cancel")}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {getNextStatus() && (
                <button
                  onClick={handleAdvanceStatus}
                  className={cn("p-1.5 rounded-lg transition-all duration-200", "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground")}
                  aria-label={STATUS_LABELS[getNextStatus()!]}
                >
                  <svg className="w-4 h-4 rtl:scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {order.orderType === "delivery" && order.customerPhone && (
            <div className="pt-1">
              <a
                href={`https://wa.me/${order.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `مرحباً ${order.serverName}، طلبك رقم #${order.orderNumber} في الطريق إليك! 🛵`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded-lg hover:bg-green-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.558 4.136 1.535 5.874L.057 23.215a.75.75 0 00.918.919l5.442-1.479A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22.5a10.43 10.43 0 01-5.318-1.452l-.38-.228-3.935 1.069 1.083-3.847-.247-.396A10.449 10.449 0 011.5 12C1.5 6.21 6.21 1.5 12 1.5S22.5 6.21 22.5 12 17.79 22.5 12 22.5z"/>
                </svg>
                واتساب للزبون
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
