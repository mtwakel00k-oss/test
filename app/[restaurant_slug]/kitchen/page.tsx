"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import Link from "next/link"
import { ExternalLink, Volume2, VolumeX } from "lucide-react"
import { fetchApi } from "@/lib/tenant"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { useRealtime } from "@/lib/use-realtime"
import { logger } from "@/lib/logger"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { playNewOrderSound, initAudio } from "@/lib/sound"

interface KitchenItem {
  id: number | string
  name: string
  quantity: number
}

interface KitchenOrder {
  id: string | number
  orderNumber: number | null
  tableNumber: number | null
  orderType: string
  status: "pending" | "preparing"
  items: KitchenItem[]
  createdAt: Date
}

interface RawOrder {
  id: string
  status: string
  order_number: number | null
  table_number: number | null
  order_type: string
  created_at: string
}

interface RawOrderItem {
  id: string
  order_id: string
  product_name: string
  size: string | null
  quantity: number
}

const ACTIVE_STATUSES = ["pending", "preparing"]
const TERMINAL_STATUSES = ["completed", "delivered", "cancelled"]

export default function KitchenPage() {
  const slug = useSlug()
  const { t, lang } = useTranslation()
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [currentTime, setCurrentTime] = useState("")
  const [currentDate, setCurrentDate] = useState("")
  const [soundOn, setSoundOn] = useState(true)
  const prevOrderIdsRef = useRef<Set<string | number>>(new Set())
  const [now, setNow] = useState(() => Date.now())
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    if (soundOn) {
      const unlock = () => { initAudio(); document.removeEventListener("pointerdown", unlock) }
      document.addEventListener("pointerdown", unlock)
      return () => document.removeEventListener("pointerdown", unlock)
    }
  }, [soundOn])

  useEffect(() => {
    const updateTime = () => {
      const n = new Date()
      const locale = lang === "fr" ? "fr-FR" : "en-US"
      setCurrentTime(n.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }))
      setCurrentDate(n.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" }))
      setNow(Date.now())
    }
    updateTime()
    const interval = setInterval(updateTime, 30000)
    return () => clearInterval(interval)
  }, [lang])

  function fmtTime(date: Date): string {
    const diff = Math.floor((now - date.getTime()) / 60000)
    if (diff < 1) return t("time.justNow")
    if (diff < 60) return `${diff} ${t("time.minsAgo")}`
    const h = Math.floor(diff / 60)
    return `${h}${t("time.h")} ${diff % 60}${t("time.min")}`
  }

  const fetchOrders = useCallback(async (): Promise<KitchenOrder[]> => {
    try {
      const res = await fetchApi(`/api/orders?status_in=${ACTIVE_STATUSES.join(",")}&include_items=true`)
      if (!res.ok) { logger.error("Kitchen fetch error", res.status); return [] }
      const raw: (RawOrder & { items?: RawOrderItem[] })[] = await res.json()
      setLastRefresh(new Date())
      const mapped: KitchenOrder[] = (raw || []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number ?? null,
        tableNumber: o.table_number ?? null,
        orderType: o.order_type || "dine_in",
        status: o.status === "preparing" ? "preparing" : "pending",
        items: (o.items || []).map((it) => ({
          id: it.id,
          name: it.product_name + (it.size && it.size !== "UNIQUE" ? ` (${it.size})` : ""),
          quantity: it.quantity,
        })),
        createdAt: new Date(o.created_at),
      }))

      if (prevOrderIdsRef.current.size > 0 && soundOn) {
        const newOrders = mapped.filter(o => !prevOrderIdsRef.current.has(o.id))
        if (newOrders.length > 0) playNewOrderSound()
      }
      prevOrderIdsRef.current = new Set(mapped.map(o => o.id))
      return mapped
    } catch {
      logger.error("Kitchen fetch error")
      return []
    }
  }, [soundOn])

  useEffect(() => { fetchOrders().then(setOrders) }, [fetchOrders])

  const subscriptions = useMemo(() => [
    {
      table: "orders" as const, event: "INSERT" as const,
      filter: (p: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = p.new as { status?: string }
        return !!(row.status && ACTIVE_STATUSES.includes(row.status))
      },
      handler: () => { fetchOrders().then(setOrders) },
    },
    {
      table: "orders" as const, event: "UPDATE" as const,
      handler: (p: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const newRow = p.new as { status?: string; id?: string }
        const oldRow = p.old as { id?: string }
        const newStatus = newRow.status
        const orderId = newRow.id || oldRow.id
        if (newStatus && ACTIVE_STATUSES.includes(newStatus)) {
          fetchOrders().then(setOrders)
        } else if (newStatus && TERMINAL_STATUSES.includes(newStatus)) {
          if (orderId) {
            setOrders(prev => prev.filter(o => o.id !== orderId))
            prevOrderIdsRef.current.delete(orderId)
          }
        }
      },
    },
    {
      table: "orders" as const, event: "DELETE" as const,
      handler: (p: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const deletedId = (p.old as { id?: string })?.id
        if (deletedId) {
          setOrders(prev => prev.filter(o => o.id !== deletedId))
          prevOrderIdsRef.current.delete(deletedId)
        }
      },
    },
    { table: "order_items" as const, event: "*" as const, handler: () => { fetchOrders().then(setOrders) } },
  ], [fetchOrders])

  useRealtime({ channelName: "kitchen", subscriptions, pollInterval: 10000 })

  const pendingOrders = orders.filter(o => o.status === "pending")
  const preparingOrders = orders.filter(o => o.status === "preparing")

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-3 lg:px-5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">{t("kitchen.title")}</h1>
              <p className="text-[11px] text-muted-foreground">{t("kitchen.subtitle")}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                <span className="font-bold text-base">{pendingOrders.length}</span>
                <span className="hidden lg:inline"> {t("kitchen.new")}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span className="text-xs text-sky-700 dark:text-sky-300 font-medium">
                <span className="font-bold text-base">{preparingOrders.length}</span>
                <span className="hidden lg:inline"> {t("kitchen.preparing")}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="text-end hidden sm:block">
              <p className="text-xs font-medium text-foreground tabular-nums">{currentTime}</p>
              <p className="text-[10px] text-muted-foreground">{currentDate}</p>
            </div>
            <div className="w-px h-4 bg-border mx-0.5 hidden sm:block" />
            <button onClick={() => setSoundOn(!soundOn)}
              className="h-8 w-8 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
              title={soundOn ? t("kitchen.mute") : t("kitchen.unmute")}>
              {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <ThemeToggle />
            <LanguageSwitcher />
            <Link href={`/${slug}/pos`} title={t("kitchen.posLink")}
              className="h-8 w-8 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors">
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="p-3 lg:p-5">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-20 h-20 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-lg font-semibold opacity-60">{t("kitchen.noOrders")}</p>
            <p className="text-sm opacity-40 mt-1">{t("kitchen.waiting")}</p>
          </div>
        ) : (
          <>
            {pendingOrders.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="text-sm font-bold text-amber-600 dark:text-amber-400">{t("kitchen.newOrders")}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">({pendingOrders.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {pendingOrders.map(order => (
                    <div key={order.id} className="bg-card rounded-xl border-l-4 border-l-amber-500 shadow-sm overflow-hidden transition-all hover:shadow-md">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-foreground">
                                {order.orderType === "takeaway" ? "🥡 " + t("pos.takeaway") : "🍽️ " + t("pos.table") + " " + order.tableNumber}
                              </span>
                              <span className="text-xs text-muted-foreground">#{order.orderNumber}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium dark:bg-amber-900/20 dark:text-amber-400">
                              {order.orderType === "takeaway" ? t("pos.takeaway") : t("pos.dineIn")}
                            </span>
                            <span className="text-xs font-mono text-amber-600 dark:text-amber-400 tabular-nums">{fmtTime(order.createdAt)}</span>
                          </div>
                        </div>
                        <div className="border-t border-border/30 pt-3 space-y-2">
                          {order.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3">
                              <span className="text-lg font-bold text-amber-600 dark:text-amber-400 min-w-[2.5rem] tabular-nums">{item.quantity}x</span>
                              <span className="text-sm font-medium text-foreground">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {preparingOrders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <h2 className="text-sm font-bold text-sky-600 dark:text-sky-400">{t("kitchen.preparingOrders")}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">({preparingOrders.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {preparingOrders.map(order => (
                    <div key={order.id} className="bg-card rounded-xl border-l-4 border-l-sky-400 shadow-sm overflow-hidden transition-all hover:shadow-md">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-foreground">
                                {order.orderType === "takeaway" ? "🥡 " + t("pos.takeaway") : "🍽️ " + t("pos.table") + " " + order.tableNumber}
                              </span>
                              <span className="text-xs text-muted-foreground">#{order.orderNumber}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 font-medium dark:bg-sky-900/20 dark:text-sky-400">
                              {order.orderType === "takeaway" ? t("pos.takeaway") : t("pos.dineIn")}
                            </span>
                            <span className="text-xs font-mono text-sky-600 dark:text-sky-400 tabular-nums">{fmtTime(order.createdAt)}</span>
                          </div>
                        </div>
                        <div className="border-t border-border/30 pt-3 space-y-2">
                          {order.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3">
                              <span className="text-lg font-bold text-sky-600 dark:text-sky-400 min-w-[2.5rem] tabular-nums">{item.quantity}x</span>
                              <span className="text-sm font-medium text-foreground">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
