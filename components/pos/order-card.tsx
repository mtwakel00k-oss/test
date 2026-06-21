"use client"

import { useEffect, useState, memo, type ReactNode } from "react"
import type { PosOrder, PosOrderStatus } from "@/lib/pos-types"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"
import { Bike, ShoppingBag, UtensilsCrossed, AlertTriangle, Truck } from "lucide-react"

interface DriverCard {
  id: string
  name: string
  phone: string
  isBusy: boolean
}

interface OrderCardProps {
  order: PosOrder
  isSelected: boolean
  onSelect: () => void
  onStatusChange: (orderId: string | number, status: PosOrderStatus) => void
  onCancel: (orderId: string | number) => void
  drivers?: DriverCard[]
  assigningDriver?: boolean
  onAssignDriver?: (orderId: string | number, driverId: string) => void
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
  pending: { label: "statusNew", badge: "badge-success", dot: "bg-success", bar: "bg-success", shadow: "shadow-success/10" },
  preparing: { label: "statusPreparing", badge: "badge-sky", dot: "bg-sky-500", bar: "bg-sky-500", shadow: "shadow-sky-500/10" },
  ready: { label: "statusReady", badge: "badge-emerald", dot: "bg-emerald-500", bar: "bg-emerald-500", shadow: "shadow-emerald-500/10" },
  out_for_delivery: { label: "statusOutForDelivery", badge: "badge-violet", dot: "bg-violet-500", bar: "bg-violet-500", shadow: "shadow-violet-500/10" },
  completed: { label: "statusCompleted", badge: "badge-neutral", dot: "bg-neutral-400", bar: "bg-neutral-400", shadow: "" },
  cancelled: { label: "statusCancelled", badge: "badge-destructive", dot: "bg-destructive", bar: "bg-destructive", shadow: "" },
} as const

export function OrderCard(props: OrderCardProps) {
  return <OrderCardInner {...props} />
}

const OrderCardInner = memo(function OrderCardInner({
  order, isSelected, onSelect, onStatusChange, onCancel, drivers = [], assigningDriver, onAssignDriver,
}: OrderCardProps) {
  const { t, lang } = useTranslation()
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(order.createdAt, t))
  const s = STATUS_STYLES[order.status]
  const cur = lang === "ar" ? "د.ج" : "DA"

  const orderTypeInfo = (() => {
    const base = {
      delivery: { icon: <Truck className="size-5" />, label: t("pos.delivery"), badge: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20" },
      takeaway: { icon: <ShoppingBag className="size-5" />, label: t("pos.takeaway"), badge: "bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20" },
      dine_in: { icon: <UtensilsCrossed className="size-5" />, label: order.tableNumber ? `${t("pos.table")} ${order.tableNumber}` : t("pos.dineIn"), badge: "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20" },
    }
    return base[order.orderType as keyof typeof base] || base.dine_in
  })()

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
    <div data-testid="order-card"
      onClick={onSelect}
      className={cn(
        "group relative bg-card rounded-[1.75rem] border border-border/50 overflow-hidden cursor-pointer",
        "transition-all duration-500 hover:shadow-2xl hover:border-primary/20 hover:-translate-y-1 active:scale-[0.98]",
        isSelected ? "ring-4 ring-primary/20 border-primary/40 shadow-2xl bg-primary/[0.02]" : "shadow-sm",
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider", s.badge)}>
                <span className={cn("size-1.5 rounded-full", s.dot, order.status === "pending" && "animate-pulse")} />
                {t(`pos.${s.label}`)}
              </span>
              <span className={cn("inline-flex px-3 py-1 rounded-xl text-[10px] font-bold",
                order.paymentStatus === "paid"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-amber-500/10 text-amber-600"
              )}>
                {order.paymentStatus === "paid" ? t("pos.paid") : t("pos.unpaid")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={cn("flex items-center justify-center size-11 rounded-xl text-xl shadow-inner border border-border/50 bg-card", orderTypeInfo.badge.split(' ')[0])}>
                {orderTypeInfo.icon}
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-semibold text-foreground leading-none mb-1">{orderTypeInfo.label}</h3>
                <span className="text-[10px] font-medium text-muted-foreground">#{order.orderNumber}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {order.items.slice(0, 3).map((item) => (
                <span key={item.id} className="text-[11px] font-medium text-muted-foreground bg-muted/30 border border-border/30 rounded-lg px-2.5 py-1">
                  <span className="text-primary font-semibold">x{item.quantity}</span> {item.name}
                </span>
              ))}
              {order.items.length > 3 && (
                <span className="text-[10px] font-semibold text-primary bg-primary/5 rounded-lg px-2 py-1">+{order.items.length - 3}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-2xl font-semibold text-foreground tabular-nums leading-none mb-1">{order.total.toLocaleString()} <span className="text-xs text-muted-foreground font-medium">{cur}</span></span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30">
              <span className="size-1 rounded-full bg-muted-foreground/30" />
              <span className="text-[10px] font-medium text-muted-foreground/60">{timeAgo}</span>
            </div>
          </div>
        </div>

        {order.orderType === "delivery" && order.status === "ready" && !order.driverId && onAssignDriver && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground/70 ms-1">اختر سائقاً للتوصيل:</p>
            {drivers.filter(d => !d.isBusy).length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px]">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>كل السائقين مشغولون حالياً</span>
              </div>
            ) : drivers.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 text-muted-foreground text-[11px]">
                <Truck className="size-3.5 shrink-0" />
                <span>لا يوجد سائقون — أضف من الإعدادات</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1 max-h-28 overflow-y-auto">
                {drivers.filter(d => !d.isBusy).map(driver => (
                  <button key={driver.id} onClick={e => { e.stopPropagation(); onAssignDriver(order.id, driver.id) }}
                    disabled={assigningDriver}
                    className="flex items-center gap-2 w-full rounded-lg border border-border/40 bg-card px-3 py-2 text-right hover:border-primary/30 hover:bg-primary/[0.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      {driver.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{driver.name}</p>
                      <p className="text-[10px] text-muted-foreground/60 font-mono dir-ltr text-left">{driver.phone}</p>
                    </div>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">متاح</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {order.orderType === "delivery" && order.status === "out_for_delivery" && order.driverId && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                  {order.driverName?.charAt(0) || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{order.driverName || "—"}</p>
                  <p className="text-[10px] text-muted-foreground font-mono dir-ltr text-left truncate">{order.driverPhone || ""}</p>
                </div>
              </div>
              <a href={`tel:${order.driverPhone || ""}`}
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-center h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/40">
          <div className="flex items-center gap-2">
            {getNextStatus() && (
              <button data-testid="advance-status" onClick={handleAdvanceStatus}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-[var(--shadow-md),var(--shadow-glow)] hover:brightness-110 active:scale-95 transition-all">
                {t(`pos.${STATUS_STYLES[getNextStatus()!].label}`)}
              </button>
            )}
            {order.status === "pending" && (
              <button onClick={(e) => { e.stopPropagation(); onCancel(order.id) }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-all">
                {t("common.cancel")}
              </button>
            )}
          </div>
          <div className="size-9 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary/60 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </div>
      </div>
    </div>
  )
}, (prev, next) =>
  prev.order.id === next.order.id &&
  prev.order.status === next.order.status &&
  prev.order.paymentStatus === next.order.paymentStatus &&
  prev.order.total === next.order.total &&
  prev.order.driverId === next.order.driverId &&
  prev.isSelected === next.isSelected &&
  prev.assigningDriver === next.assigningDriver &&
  prev.order.items.length === next.order.items.length,
)
