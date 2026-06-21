"use client"

import { useEffect, useState, useRef, useCallback, useMemo, startTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, ChefHat, Timer, Bell, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchApi } from "@/lib/tenant"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { useRealtime } from "@/lib/use-realtime"
import { debounce } from "@/lib/debounce"
import { logger } from "@/lib/logger"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSlug } from "@/lib/use-slug"
import { PageTransition } from "@/components/page-transition"
import { useTranslation } from "@/lib/use-translation"
import { useFeatures } from "@/lib/use-features"
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
const TERMINAL_STATUSES = ["completed", "cancelled"]

export default function KitchenPage() {
  const slug = useSlug()
  const router = useRouter()
  const { t, lang } = useTranslation()
  const features = useFeatures()

  useEffect(() => {
    if (features && !features.hasKDS) {
      router.push(`/${slug}/pos`)
    }
  }, [features, slug, router])

  useEffect(() => {
    fetchApi("/api/me").then(r => r.ok ? r.json() : null).then(data => {
      if (!data || (data.role !== "admin" && data.role !== "owner" && data.role !== "chef")) {
        router.push(`/${slug}/login`)
      }
    }).catch(() => router.push(`/${slug}/login`))
  }, [router, slug])

  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [currentTime, setCurrentTime] = useState("")
  const [soundOn, setSoundOn] = useState(true)
  const prevOrderIdsRef = useRef<Set<string | number>>(new Set())
  const prevStatusMapRef = useRef<Record<string, string>>({})
  const [now, setNow] = useState(() => Date.now())
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
      const newStatusMap: Record<string, string> = {}
      for (const o of mapped) {
        newStatusMap[String(o.id)] = o.status
      }
      prevStatusMapRef.current = newStatusMap
      prevOrderIdsRef.current = new Set(mapped.map(o => o.id))
      return mapped
    } catch {
      logger.error("Kitchen fetch error")
      return []
    }
  }, [soundOn])

  const debouncedRefreshRef = useRef<ReturnType<typeof debounce> | null>(null)

  useEffect(() => {
    debouncedRefreshRef.current = debounce(
      () => { fetchOrders().then(data => startTransition(() => setOrders(data))) },
      350,
    )
    return () => debouncedRefreshRef.current?.cancel()
  }, [fetchOrders])

  const subscriptions = useMemo(() => [
    {
      table: "orders" as const, event: "INSERT" as const,
      filter: (p: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = p.new as { status?: string }
        return !!(row.status && ACTIVE_STATUSES.includes(row.status))
      },
      handler: () => { debouncedRefreshRef.current?.() },
    },
    {
      table: "orders" as const, event: "UPDATE" as const,
      handler: (p: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const newRow = p.new as { status?: string; id?: string }
        const oldRow = p.old as { id?: string }
        const newStatus = newRow.status
        const orderId = newRow.id || oldRow.id
        if (newStatus && ACTIVE_STATUSES.includes(newStatus)) {
          debouncedRefreshRef.current?.()
        } else if (newStatus && TERMINAL_STATUSES.includes(newStatus)) {
          if (orderId) {
            startTransition(() => {
              setOrders(prev => prev.filter(o => o.id !== orderId))
            })
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
          startTransition(() => {
            setOrders(prev => prev.filter(o => o.id !== deletedId))
          })
          prevOrderIdsRef.current.delete(deletedId)
        }
      },
    },
    { table: "order_items" as const, event: "*" as const, handler: () => { debouncedRefreshRef.current?.() } },
  ], [])

  useRealtime({
    channelName: "kitchen",
    subscriptions,
    pollInterval: 10000,
    onPoll: () => { fetchOrders().then(data => startTransition(() => setOrders(data))) },
  })

  const pendingOrders = useMemo(() => orders.filter(o => o.status === "pending"), [orders])
  const preparingOrders = useMemo(() => orders.filter(o => o.status === "preparing"), [orders])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[var(--shadow-sm)]">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold font-display text-foreground tracking-tight">{t("kitchen.title")}</h1>
              <p className="text-xs text-muted-foreground/60">{t("kitchen.subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/15">
                <Bell className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs text-muted-foreground">
                  <span className="font-bold text-accent">{pendingOrders.length}</span>
                  <span className="hidden lg:inline text-muted-foreground/50"> {t("kitchen.new")}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/15">
                <Timer className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs text-muted-foreground">
                  <span className="font-bold text-sky-400">{preparingOrders.length}</span>
                  <span className="hidden lg:inline text-muted-foreground/50"> {t("kitchen.preparing")}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 text-muted-foreground/50 text-[10px] font-mono tabular-nums">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  countdown <= 3 ? "bg-amber-400" : countdown <= 6 ? "bg-amber-400/60" : "bg-emerald-400"
                )} />
                {countdown}s
              </div>
              <button onClick={() => setSoundOn(!soundOn)}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground/40 hover:text-accent hover:bg-accent/10 transition-all active:scale-90">
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 text-muted-foreground/50 text-xs font-mono tabular-nums">
                <span>{currentTime}</span>
              </div>
              <ThemeToggle />
              <LanguageSwitcher />
              <Link href={`/${slug}/pos`} title={t("kitchen.posLink")}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all active:scale-90">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <PageTransition><main className="p-4 lg:p-6">
        {orders.length === 0 ? (
          <div data-testid="kitchen-empty" className="flex flex-col items-center justify-center py-28 text-center">
            <div className="premium-bezel mb-6">
              <div className="premium-bezel-inner p-5">
                <ChefHat className="size-10 text-muted-foreground/20" strokeWidth={1} />
              </div>
            </div>
            <p className="text-lg font-semibold text-foreground/60">{t("kitchen.noOrders")}</p>
            <p className="text-sm text-muted-foreground/40 mt-1">{t("kitchen.waiting")}</p>
          </div>
        ) : (
          <>
            {pendingOrders.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4 px-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
                  </span>
                  <h2 className="text-lg font-bold font-display text-success tracking-tight">{t("kitchen.newOrders")} ({pendingOrders.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {pendingOrders.map(order => (
                    <div data-testid="kds-order-card" key={order.id} className="premium-bezel order-card-pending border-accent/20 shadow-accent/5 hover:shadow-accent/10">
                      <div className="premium-bezel-inner p-5">
                        <div className="flex justify-between items-start w-full mb-4 relative">
                          <div>
                            <div className="text-xl font-semibold text-foreground">
                              {order.orderType === "takeaway"
                                ? t("pos.takeaway")
                                : order.orderType === "delivery"
                                  ? t("pos.delivery")
                                  : `${t("pos.table")} ${order.tableNumber ?? ""}`}
                            </div>
                            <p className="text-xs text-muted-foreground/50 mt-0.5">#{order.orderNumber}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-muted/30 text-muted-foreground/60">
                              {order.orderType === "takeaway"
                                ? t("pos.takeaway")
                                : order.orderType === "delivery"
                                  ? t("pos.delivery")
                                  : t("pos.dineIn")}
                            </span>
                            <span className="text-xs font-mono text-accent/60 tabular-nums">{fmtTime(order.createdAt)}</span>
                          </div>
                        </div>
                        <div className="border-t border-amber-500/10 pt-4 space-y-2.5">
                          {order.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3">
                              <span className="text-base font-bold text-accent min-w-[2.5rem] tabular-nums">{item.quantity}×</span>
                              <span className="text-sm text-foreground/80 font-medium">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {pendingOrders.length > 0 && preparingOrders.length > 0 && (
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/20" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/30 bg-background">
                    {t("kitchen.nextUp")}
                  </span>
                </div>
              </div>
            )}

            {preparingOrders.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4 px-1">
                  <Timer className="w-4 h-4 text-sky-500" />
                  <h2 className="text-lg font-bold font-display text-sky-500 tracking-tight">{t("kitchen.preparingOrders")} ({preparingOrders.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {preparingOrders.map(order => (
                    <div key={order.id} className="premium-bezel order-card-preparing border-sky-500/15 shadow-sky-500/5 hover:shadow-sky-500/10">
                      <div className="premium-bezel-inner p-5">
                        <div className="flex justify-between items-start w-full mb-4">
                          <div>
                            <div className="text-xl font-semibold text-foreground">
                              {order.orderType === "takeaway"
                                ? t("pos.takeaway")
                                : order.orderType === "delivery"
                                  ? t("pos.delivery")
                                  : `${t("pos.table")} ${order.tableNumber ?? ""}`}
                            </div>
                            <p className="text-xs text-muted-foreground/50 mt-0.5">#{order.orderNumber}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-muted/30 text-muted-foreground/60">
                              {order.orderType === "takeaway"
                                ? t("pos.takeaway")
                                : order.orderType === "delivery"
                                  ? t("pos.delivery")
                                  : t("pos.dineIn")}
                            </span>
                            <span className="text-xs font-mono text-sky-400/60 tabular-nums">{fmtTime(order.createdAt)}</span>
                          </div>
                        </div>
                        <div className="border-t border-sky-500/10 pt-4 space-y-2.5">
                          {order.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3">
                              <span className="text-base font-bold text-sky-400 min-w-[2.5rem] tabular-nums">{item.quantity}×</span>
                              <span className="text-sm text-foreground/80 font-medium">{item.name}</span>
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
      </main></PageTransition>
    </div>
  )
}