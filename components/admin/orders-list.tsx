"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle, Printer, Eye, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { logger } from "@/lib/logger"
import { printReceipt } from "@/lib/print-receipt"
import { useTranslation } from "@/lib/use-translation"
import { fetchApi } from "@/lib/tenant"

// ─── Types ─────────────────────────────────────────────────

interface OrderItem {
  product_name: string
  quantity: number
  unit_price: number
  size?: string | null
}

interface AdminOrder {
  id: string | number
  order_number: number | null
  status: string | null
  total: number | null
  order_type: string | null
  payment_status?: string | null
  table_number?: string | number | null
  created_at: string | null
  items?: OrderItem[]
}

interface OrdersListProps {
  onViewOrder?: (orderId: string) => void
}

type BadgeColor = "green" | "blue" | "yellow" | "red" | "gray" | "purple" | "gold"

interface DisplayStatus {
  label: string
  color: BadgeColor
  icon: string
}

// ─── Helpers ──────────────────────────────────────────────

const formatOrderId = (id: string | number | null | undefined): string => {
  const str = String(id ?? "")
  if (!str) return "#—"
  const short = str.includes("-")
    ? (str.split("-").pop()?.slice(-6).toUpperCase() ?? str)
    : String(id).padStart(4, "0")
  return `#${short}`
}

const resolveOrderStatus = (status: string | null | undefined, paymentStatus: string | null | undefined, t: (key: string) => string): DisplayStatus => {
  const s = String(status ?? "").toLowerCase()
  const p = String(paymentStatus ?? "").toLowerCase()

  if (p === "paid" && ["delivered", "completed", "out_for_delivery"].includes(s)) {
    return { label: `${t("order.status.completed")} · ${t("order.payment.paid")}`, color: "green", icon: "✓" }
  }
  if (p === "refunded") {
    return { label: t("order.payment.refunded"), color: "gray", icon: "↩" }
  }
  if (s === "cancelled") {
    return { label: t("order.status.cancelled"), color: "red", icon: "✕" }
  }
  if (s === "preparing") {
    return { label: t("order.status.preparing"), color: "blue", icon: "⏳" }
  }
  if (s === "ready") {
    return { label: t("order.status.ready"), color: "green", icon: "🛎️" }
  }
  if (s === "out_for_delivery") {
    return { label: t("order.status.onTheWay"), color: "purple", icon: "🚗" }
  }
  if (s === "pending") {
    return { label: t("order.status.pending"), color: "yellow", icon: "⏱" }
  }
  if (s === "completed" || s === "delivered") {
    return { label: t("order.status.completed"), color: "green", icon: "✓" }
  }
  return { label: t("common.unknown"), color: "gray", icon: "?" }
}

const COLUMNS = (t: (key: string) => string) => [
  { key: "id", label: t("order.colType.orderId") },
  { key: "type", label: t("order.colType.type") },
  { key: "table", label: t("order.colType.table") },
  { key: "status", label: t("order.colType.status") },
  { key: "total", label: t("order.colType.total") },
  { key: "created_at", label: t("order.colType.time") },
  { key: "actions", label: t("order.colType.actions") },
] as const

// ─── Sub-components ──────────────────────────────────────

const StatusBadge = ({ status, paymentStatus }: { status?: string | null; paymentStatus?: string | null }) => {
  const { t } = useTranslation()
  const { label, color } = resolveOrderStatus(status, paymentStatus, t)

  const colorMap: Record<BadgeColor, string> = {
    green: "bg-green-100 text-green-800 border-green-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    red: "bg-red-100 text-red-800 border-red-200",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    gold: "bg-amber-100 text-amber-800 border-amber-200",
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorMap[color]}`}>
      {label}
    </span>
  )
}

// ─── Main Component ──────────────────────────────────────

export function OrdersList({ onViewOrder }: OrdersListProps) {
  const { t, lang } = useTranslation()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [cancellingId, setCancellingId] = useState<string | number | null>(null)
  const [printingId, setPrintingId] = useState<string | number | null>(null)
  const [isOrdersExpanded, setIsOrdersExpanded] = useState(true)
  const [showCancelled, setShowCancelled] = useState(false)
  const skipPollRef = useRef(false)

  const fmtNum = (n: number) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")
  const currency = lang === "ar" ? "د.ج" : "DA"
  const columns = COLUMNS(t)

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

  const fetchOrders = useCallback(async (): Promise<AdminOrder[]> => {
    if (skipPollRef.current) { skipPollRef.current = false; return [] }
    try {
      const res = await fetchApi("/api/orders?limit=50")
      if (!res.ok) { logger.warn("Orders fetch not ok", res.status); return [] }
      const text = await res.text()
      let data: unknown
      try { data = JSON.parse(text) } catch { logger.error("Orders JSON parse failed", text.slice(0, 200)); return [] }
      return Array.isArray(data) ? data : []
    } catch (err) {
      logger.error("Orders fetch error", err)
      return []
    }
  }, [])

  useEffect(() => {
    fetchOrders().then(setOrders)
    const poll = setInterval(() => { fetchOrders().then(setOrders) }, 10000)
    return () => clearInterval(poll)
  }, [fetchOrders])

  const visibleOrders = useMemo(
    () =>
      showCancelled
        ? orders
        : orders.filter((o) => String(o?.status ?? "").toLowerCase() !== "cancelled"),
    [orders, showCancelled]
  )

  const activeOrders = useMemo(
    () =>
      orders.filter((o) => {
        const s = String(o?.status ?? "").toLowerCase()
        return !["cancelled", "completed"].includes(s)
      }),
    [orders]
  )

  const completedOrders = useMemo(
    () =>
      orders.filter((o) => {
        const s = String(o?.status ?? "").toLowerCase()
        const p = String(o?.payment_status ?? "").toLowerCase()
        return s === "completed" || s === "delivered" || p === "paid"
      }),
    [orders]
  )

  const todayRevenue = useMemo(
    () =>
      completedOrders.reduce((sum, o) => sum + (Number(o?.total) || 0), 0),
    [completedOrders]
  )

  const totalExcludingCancelled = useMemo(
    () => orders.filter((o) => String(o?.status ?? "").toLowerCase() !== "cancelled").length,
    [orders]
  )

  const cancelOrder = useCallback(async (id: string | number) => {
    setCancellingId(id)
    try {
      const res = await fetchApi(`/api/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      })
      if (res.ok) {
        skipPollRef.current = true
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)))
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown" }))
        logger.error("Cancel order error", err)
      }
    } catch {
      logger.error("Cancel order request failed")
    }
    setCancellingId(null)
  }, [])

  const handlePrint = useCallback(async (id: string | number) => {
    setPrintingId(id)
    printReceipt(id)
    setPrintingId(null)
  }, [])

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl col-span-full rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
      <CardHeader
        className="p-8 pb-4 flex-row items-center justify-between cursor-pointer select-none"
        onClick={() => setIsOrdersExpanded((v) => !v)}
      >
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/10">
            {isOrdersExpanded ? (
              <ChevronUp className="size-6" />
            ) : (
              <ChevronDown className="size-6" />
            )}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-black text-foreground tracking-tight">
              {t("order.ordersWithCount")} <span className="text-primary opacity-40 ms-1">({totalExcludingCancelled})</span>
            </CardTitle>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              {completedOrders.length} {t("order.completedActive")} · {activeOrders.length} {t("pos.activeOrders")} · {fmtNum(todayRevenue)} {currency}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 cursor-pointer select-none hover:text-primary transition-colors">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={() => setShowCancelled((v) => !v)}
              className="size-4 rounded-lg border-border/50 bg-muted/50 text-primary focus:ring-primary/20"
            />
            {t("order.showCancelled")}
          </label>
          <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); fetchOrders().then(setOrders) }} className="size-10 rounded-xl border-border/50 hover:bg-primary/10 hover:text-primary transition-all">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOrdersExpanded ? "max-h-[2000px]" : "max-h-0"
        }`}
      >
        <CardContent className="pt-4">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("order.noOrders")}</p>
          ) : visibleOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("order.allCancelled")}</p>
          ) : (
            <div className="w-full overflow-x-auto rounded-[1.5rem] border border-border/50 shadow-inner bg-muted/10 mx-2 mb-2" dir="rtl">
              <table className="min-w-full divide-y divide-border/50 table-fixed">
                <thead className="bg-muted/30">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ${
                          col.key === "actions" ? "text-center" : "text-start"
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-border/50">
                  {visibleOrders.map((order) => {
                    const rawType = order?.order_type ?? "dine_in"
                    const cleanType = String(rawType).toLowerCase().trim()
                    const isDineIn = cleanType === "dine_in" || cleanType === "dinein"

                    return (
                      <tr key={String(order.id)} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {formatOrderId(order.order_number)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {isDineIn ? `🪑 ${t("pos.table")}` : `🛍️ ${t("order.type.takeaway")}`}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {isDineIn ? (order.table_number ?? "—") : "—"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <StatusBadge status={order?.status} paymentStatus={order?.payment_status} />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                          {fmtNum(Number(order?.total) || 0)} {currency}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDateTime(order?.created_at)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                          <div className="flex justify-center items-center gap-1">
                            <button
                              onClick={() => onViewOrder?.(String(order.id))}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1.5 hover:bg-accent rounded-md transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handlePrint(order.id)}
                              disabled={printingId === order.id}
                              className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted/50 rounded-md transition-colors disabled:opacity-40"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            {String(order?.status ?? "").toLowerCase() !== "cancelled" &&
                              String(order?.status ?? "").toLowerCase() !== "completed" && (
                                <button
                                  onClick={() => cancelOrder(order.id)}
                                  disabled={cancellingId === order.id}
                                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1.5 hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-40"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
