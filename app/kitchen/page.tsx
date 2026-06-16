"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { supabase, fetchApi } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
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
  id: string | number
  order_number: number | null
  table_number: number | null
  order_type: string
  status: string
  created_at: string
}

interface RawOrderItem {
  id: string | number
  order_id: string | number
  product_name: string
  size: string | null
  quantity: number
}

interface OrderChangePayload {
  new: { id?: string | number; status?: string }
  old: { id?: string | number }
}

const ACTIVE_STATUSES = ["pending", "preparing"]
const TERMINAL_STATUSES = ["completed", "delivered", "cancelled"]

export default function KitchenPage() {
  const router = useRouter()
  const { t, lang } = useTranslation()
  // Guard — blocks data queries until tenant config is confirmed
  const hasConfig = useMemo(() => !!(typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__TENANT_CONFIG__), [])

  // SECURITY FIX: Redirect if no tenant config (prevents master DB leakage)
  useEffect(() => {
    const config = (window as unknown as Record<string, unknown>).__TENANT_CONFIG__
    if (!config) {
      fetch("/api/auth/login").then(r => r.json()).then(d => {
        if (d.slug) router.replace(`/${d.slug}/kitchen`)
        else router.replace("/login")
      }).catch(() => router.replace("/login"))
    }
  }, [router])
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [currentTime, setCurrentTime] = useState("")
  const [currentDate, setCurrentDate] = useState("")
  const prevOrderIdsRef = useRef<Set<string | number>>(new Set())
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const unlock = () => { initAudio(); document.removeEventListener("pointerdown", unlock) }
    document.addEventListener("pointerdown", unlock)
    return () => document.removeEventListener("pointerdown", unlock)
  }, [])

  useEffect(() => {
    const updateTime = () => {
      const n = new Date()
      const locale = lang === "fr" ? "fr-FR" : "en-US"
      setCurrentTime(n.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }))
      setCurrentDate(n.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" }))
    }
    updateTime()
    const id = setTimeout(() => setNow(Date.now()), 0)
    const interval = setInterval(() => { updateTime(); setNow(Date.now()) }, 30000)
    return () => { clearTimeout(id); clearInterval(interval) }
  }, [lang])

  function fmtTime(date: Date): string {
    if (now === null) return "—"
    const diff = Math.floor((now - date.getTime()) / 60000)
    if (diff < 1) return t("time.justNow")
    if (diff < 60) return `${t("time.minsAgo")} ${diff} ${t("time.min")}`
    const h = Math.floor(diff / 60)
    return `${t("time.hoursAgo")} ${h} ${t("time.h")} ${diff % 60} ${t("time.min")}`
  }

  const fetchOrders = useCallback(async (): Promise<KitchenOrder[]> => {
    try {
      const res = await fetchApi(`/api/orders?status_in=${ACTIVE_STATUSES.join(",")}&include_items=true`)
      if (!res.ok) { logger.error("Kitchen fetch error", res.status); return [] }
      const raw: (RawOrder & { items?: RawOrderItem[] })[] = await res.json()

      const mapped: KitchenOrder[] = (raw || []).map(o => {
        const data = o.items || []
        return {
          id: o.id,
          orderNumber: o.order_number ?? null,
          tableNumber: o.table_number ?? null,
          orderType: o.order_type || "dine_in",
          status: o.status === "preparing" ? "preparing" : "pending",
          items: data.map(it => ({
            id: it.id,
            name: it.product_name + (it.size && it.size !== "UNIQUE" ? ` (${it.size})` : ""),
            quantity: it.quantity,
          })),
          createdAt: new Date(o.created_at),
        }
      })

      if (prevOrderIdsRef.current.size > 0) {
        const newOrders = mapped.filter(o => !prevOrderIdsRef.current.has(o.id))
        if (newOrders.length > 0) playNewOrderSound()
      }
      prevOrderIdsRef.current = new Set(mapped.map(o => o.id))
      return mapped
    } catch {
      logger.error("Kitchen fetch error")
      return []
    }
  }, [])

  useEffect(() => {
    if (!hasConfig) return
    fetchOrders().then(setOrders)
  }, [fetchOrders, hasConfig])

  useEffect(() => {
    if (!hasConfig) return
    const channel = supabase().channel("kitchen-passive")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: OrderChangePayload) => {
          const status = payload.new?.status
          if (status && ACTIVE_STATUSES.includes(status)) fetchOrders().then(setOrders)
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload: OrderChangePayload) => {
          const newStatus = payload.new?.status
          const orderId = payload.new?.id
          if (newStatus && ACTIVE_STATUSES.includes(newStatus)) fetchOrders().then(setOrders)
          else if (newStatus && TERMINAL_STATUSES.includes(newStatus)) {
            setOrders(prev => prev.filter(o => o.id !== orderId))
            if (orderId != null) prevOrderIdsRef.current.delete(orderId)
          }
        }
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "orders" },
        (payload: OrderChangePayload) => {
          const deletedId = payload.old?.id
          if (deletedId) {
            setOrders(prev => prev.filter(o => o.id !== deletedId))
            prevOrderIdsRef.current.delete(deletedId)
          }
        }
      )
      .subscribe()
    return () => { supabase().removeChannel(channel) }
  }, [fetchOrders, hasConfig])

  const pendingOrders = orders.filter(o => o.status === "pending")
  const preparingOrders = orders.filter(o => o.status === "preparing")

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground tracking-tight">{t("kitchen.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("kitchen.subtitle")}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{pendingOrders.length}</span> {t("kitchen.new")}
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{preparingOrders.length}</span> {t("kitchen.preparing")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-end hidden sm:block">
              <p className="text-sm font-medium text-foreground">{currentTime}</p>
              <p className="text-xs text-muted-foreground">{currentDate}</p>
            </div>
            <ThemeToggle />
            <LanguageSwitcher />
            <Link href="/pos" title={t("kitchen.posLink")}
              className="h-9 w-9 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <svg className="w-24 h-24 mb-6 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-2xl font-bold opacity-50">{t("kitchen.noOrders")}</p>
            <p className="text-base opacity-30 mt-2">{t("kitchen.waiting")}</p>
          </div>
        ) : (
          <>
            {pendingOrders.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold text-amber-600 dark:text-amber-400 mb-4 border-b border-amber-500/30 pb-2 flex items-center gap-3">
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                  {t("kitchen.newOrders")} ({pendingOrders.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pendingOrders.map(order => (
                    <div key={order.id} className="bg-card border-2 border-amber-500/40 rounded-xl p-5 shadow-lg">
                      <div className="flex justify-between items-start w-full mb-4">
                        <div>
                          <div className="text-2xl font-black text-foreground text-start">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : `${t("pos.table")} ${order.tableNumber}`}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 text-start">{t("kitchen.orderHash")}{order.orderNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : t("pos.dineIn")}
                          </span>
                          <span className="text-sm font-mono text-amber-600 dark:text-amber-400">{fmtTime(order.createdAt)}</span>
                        </div>
                      </div>
                      <div className="border-t border-border pt-3 space-y-2">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            <span className="text-lg font-bold text-amber-600 dark:text-amber-400 min-w-[2.5rem]">{item.quantity}x</span>
                            <span className="text-base text-foreground">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {preparingOrders.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 border-b border-blue-500/30 pb-2 flex items-center gap-3">
                  <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
                  {t("kitchen.preparingOrders")} ({preparingOrders.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {preparingOrders.map(order => (
                    <div key={order.id} className="bg-card border border-blue-500/30 rounded-xl p-5">
                      <div className="flex justify-between items-start w-full mb-4">
                        <div>
                          <div className="text-2xl font-black text-foreground text-start">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : `${t("pos.table")} ${order.tableNumber}`}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 text-start">{t("kitchen.orderHash")}{order.orderNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : t("pos.dineIn")}
                          </span>
                          <span className="text-sm font-mono text-blue-600 dark:text-blue-400">{fmtTime(order.createdAt)}</span>
                        </div>
                      </div>
                      <div className="border-t border-border pt-3 space-y-2">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400 min-w-[2.5rem]">{item.quantity}x</span>
                            <span className="text-base text-foreground">{item.name}</span>
                          </div>
                        ))}
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
