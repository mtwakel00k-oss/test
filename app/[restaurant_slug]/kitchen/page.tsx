"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, ChefHat, Timer, Bell, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
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
  const router = useRouter()
  const { t, lang } = useTranslation()

  useEffect(() => {
    fetchApi("/api/me").then(r => r.ok ? r.json() : null).then(data => {
      if (!data || (data.role !== "admin" && data.role !== "owner" && data.role !== "chef")) {
        router.push(`/${slug}/login`)
      }
    }).catch(() => router.push(`/${slug}/login`))
  }, [router, slug])

  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [currentTime, setCurrentTime] = useState("")
  const [currentDate, setCurrentDate] = useState("")
  const [soundOn, setSoundOn] = useState(true)
  const prevOrderIdsRef = useRef<Set<string | number>>(new Set())
  const [now, setNow] = useState(Date.now())
  const [countdown, setCountdown] = useState(10)
  const countdownRef = useRef(10)

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

  useEffect(() => {
    const interval = setInterval(() => {
      countdownRef.current = countdownRef.current > 0 ? countdownRef.current - 1 : 10
      setCountdown(countdownRef.current)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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
      countdownRef.current = 10
      setCountdown(10)
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-3 lg:px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">{t("kitchen.title")}</h1>
              <p className="text-xs text-white/40">{t("kitchen.subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Bell className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-sm text-white/70">
                  <span className="font-bold text-amber-400">{pendingOrders.length}</span>
                  <span className="hidden lg:inline"> {t("kitchen.new")}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                <Timer className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sm text-white/70">
                  <span className="font-bold text-sky-400">{preparingOrders.length}</span>
                  <span className="hidden lg:inline"> {t("kitchen.preparing")}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 text-white/40 text-[10px] font-mono tabular-nums border border-white/5">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  countdown <= 3 ? "bg-amber-500" : countdown <= 6 ? "bg-amber-400" : "bg-emerald-400"
                )} />
                {countdown}s
              </div>
              <button onClick={() => setSoundOn(!soundOn)}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-white/40 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-white/50 text-xs font-mono tabular-nums">
                <span>{currentTime}</span>
              </div>
              <ThemeToggle />
              <LanguageSwitcher />
              <Link href={`/${slug}/pos`} title={t("kitchen.posLink")}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-white/40 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="p-3 lg:p-5">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5 mb-6">
              <ChefHat className="w-12 h-12" />
            </div>
            <p className="text-2xl font-bold text-white/20">{t("kitchen.noOrders")}</p>
            <p className="text-base text-white/10 mt-2">{t("kitchen.waiting")}</p>
          </div>
        ) : (
          <>
            {pendingOrders.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4 px-1">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                  </span>
                  <h2 className="text-lg font-black text-amber-400 tracking-tight">{t("kitchen.newOrders")} ({pendingOrders.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {pendingOrders.map(order => (
                    <div key={order.id} className="group relative bg-gradient-to-br from-amber-500/10 to-transparent border-2 border-amber-500/30 rounded-2xl p-5 shadow-xl shadow-amber-500/5 hover:shadow-amber-500/15 hover:border-amber-500/50 transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex justify-between items-start w-full mb-4 relative">
                        <div>
                          <div className="text-2xl font-black text-white">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : `${t("pos.table")} ${order.tableNumber}`}
                          </div>
                          <p className="text-sm text-white/40 mt-0.5 font-mono">#{order.orderNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : t("pos.dineIn")}
                          </span>
                          <span className="text-sm font-mono text-amber-400/80 tabular-nums">{fmtTime(order.createdAt)}</span>
                        </div>
                      </div>
                      <div className="border-t border-amber-500/10 pt-4 space-y-2.5 relative">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            <span className="text-lg font-black text-amber-400 min-w-[3rem]">{item.quantity}×</span>
                            <span className="text-sm text-white/90 font-medium">{item.name}</span>
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
                <div className="flex items-center gap-3 mb-4 px-1">
                  <Timer className="w-4 h-4 text-sky-400" />
                  <h2 className="text-lg font-black text-sky-400 tracking-tight">{t("kitchen.preparingOrders")} ({preparingOrders.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {preparingOrders.map(order => (
                    <div key={order.id} className="relative bg-gradient-to-br from-sky-500/5 to-transparent border border-sky-500/20 rounded-2xl p-5 hover:shadow-lg hover:shadow-sky-500/5 hover:border-sky-500/30 transition-all">
                      <div className="absolute top-0 left-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex justify-between items-start w-full mb-4 relative">
                        <div>
                          <div className="text-2xl font-black text-white">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : `${t("pos.table")} ${order.tableNumber}`}
                          </div>
                          <p className="text-sm text-white/40 mt-0.5 font-mono">#{order.orderNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : t("pos.dineIn")}
                          </span>
                          <span className="text-sm font-mono text-sky-400/80 tabular-nums">{fmtTime(order.createdAt)}</span>
                        </div>
                      </div>
                      <div className="border-t border-sky-500/10 pt-4 space-y-2.5 relative">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            <span className="text-lg font-black text-sky-400 min-w-[3rem]">{item.quantity}×</span>
                            <span className="text-sm text-white/90 font-medium">{item.name}</span>
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
