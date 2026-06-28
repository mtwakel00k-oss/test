"use client"

import { useEffect, useState, useRef, useCallback, useMemo, startTransition } from "react"
import { ChefHat, Timer, Bell, Volume2, VolumeX, ExternalLink, CheckCircle2, Play } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { fetchApi } from "@/lib/tenant"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { useRealtime } from "@/lib/use-realtime"
import { debounce } from "@/lib/debounce"
import { logger } from "@/lib/logger"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { useFeatures } from "@/lib/use-features"
import { playNewOrderSound, initAudio } from "@/lib/sound"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface KdsItem {
  id: string | number
  name: string
  quantity: number
  size: string | null
  sauce: string | null
  modifiers: string[]
}

interface KdsOrder {
  id: string | number
  orderNumber: number | null
  tableNumber: number | null
  orderType: string
  status: "pending" | "preparing"
  items: KdsItem[]
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
  sauce: string | null
  quantity: number
}

const ACTIVE_STATUSES = ["pending", "preparing"]
const TERMINAL_STATUSES = ["ready", "completed", "cancelled"]

const TIME_THRESHOLDS = {
  WARNING: 12 * 60 * 1000,
  DANGER: 20 * 60 * 1000,
}

const springCard = (delay: number) => ({
  initial: { opacity: 0, y: 20, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 70, damping: 16, delay } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.2 } },
})

function extractModifiers(name: string, size: string | null, sauce: string | null): string[] {
  const mods: string[] = []
  if (size && size !== "UNIQUE" && size !== "N/A") mods.push(size)
  if (sauce && sauce !== "UNIQUE") mods.push(sauce)
  const parenMatch = name.match(/\(([^)]+)\)/g)
  if (parenMatch) {
    for (const p of parenMatch) {
      const inner = p.slice(1, -1).trim()
      if (inner && !mods.includes(inner)) mods.push(inner)
    }
  }
  return mods
}

function stripModifiers(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, "").trim()
}

export function KdsDashboard() {
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

  const [orders, setOrders] = useState<KdsOrder[]>([])
  const [soundOn, setSoundOn] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const [countdown, setCountdown] = useState(10)
  const [struckItems, setStruckItems] = useState<Set<string | number>>(new Set())
  const [updatingStatus, setUpdatingStatus] = useState<Set<string | number>>(new Set())
  const [newOrderIds, setNewOrderIds] = useState<Set<string | number>>(new Set())

  const prevOrderIdsRef = useRef<Set<string | number>>(new Set())
  const countdownRef = useRef(10)

  useEffect(() => {
    if (soundOn) {
      const unlock = () => { initAudio(); document.removeEventListener("pointerdown", unlock) }
      document.addEventListener("pointerdown", unlock)
      return () => document.removeEventListener("pointerdown", unlock)
    }
  }, [soundOn])

  useEffect(() => {
    const update = () => setNow(Date.now())
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [])

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

  function getUrgency(date: Date): "safe" | "warning" | "danger" {
    const elapsed = now - date.getTime()
    if (elapsed >= TIME_THRESHOLDS.DANGER) return "danger"
    if (elapsed >= TIME_THRESHOLDS.WARNING) return "warning"
    return "safe"
  }

  function toggleStrike(itemId: string | number) {
    setStruckItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  async function updateOrderStatus(orderId: string | number, newStatus: string) {
    setUpdatingStatus(prev => new Set(prev).add(orderId))
    try {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as "pending" | "preparing" } : o))
      const res = await fetchApi(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        debouncedRefreshRef.current?.()
      }
    } catch {
      debouncedRefreshRef.current?.()
    } finally {
      setUpdatingStatus(prev => { const n = new Set(prev); n.delete(orderId); return n })
    }
  }

  const fetchOrders = useCallback(async (): Promise<KdsOrder[]> => {
    try {
      const res = await fetchApi(`/api/orders?status_in=${ACTIVE_STATUSES.join(",")}&include_items=true`)
      if (!res.ok) { logger.error("KDS fetch error", res.status); return [] }
      const raw: (RawOrder & { items?: RawOrderItem[] })[] = await res.json()
      countdownRef.current = 10
      setCountdown(10)
      const mapped: KdsOrder[] = (raw || []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number ?? null,
        tableNumber: o.table_number ?? null,
        orderType: o.order_type || "dine_in",
        status: o.status === "preparing" ? "preparing" : "pending",
        items: (o.items || []).map((it) => ({
          id: it.id,
          name: stripModifiers(it.product_name),
          quantity: it.quantity,
          size: it.size || null,
          sauce: it.sauce || null,
          modifiers: extractModifiers(it.product_name, it.size, it.sauce),
        })),
        createdAt: new Date(o.created_at),
      }))

      const freshIds = new Set(mapped.filter(o => !prevOrderIdsRef.current.has(o.id)).map(o => o.id))
      if (prevOrderIdsRef.current.size > 0 && freshIds.size > 0 && soundOn) {
        playNewOrderSound()
      }
      if (freshIds.size > 0) {
        setNewOrderIds(freshIds)
        setTimeout(() => setNewOrderIds(new Set()), 4000)
      }
      prevOrderIdsRef.current = new Set(mapped.map(o => o.id))
      return mapped
    } catch {
      logger.error("KDS fetch error")
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
    channelName: "kds-dashboard",
    subscriptions,
    pollInterval: 10000,
    onPoll: () => { fetchOrders().then(data => startTransition(() => setOrders(data))) },
  })

  const pendingOrders = useMemo(() => orders.filter(o => o.status === "pending"), [orders])
  const preparingOrders = useMemo(() => orders.filter(o => o.status === "preparing"), [orders])

  function renderItem(item: KdsItem, index: number) {
    const isStruck = struckItems.has(item.id)
    return (
      <button
        key={item.id}
        onClick={() => toggleStrike(item.id)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl p-3 transition-all",
          "hover:bg-foreground/[0.02] active:scale-[0.98]",
          isStruck && "opacity-30",
        )}
      >
        <span className={cn(
          "shrink-0 text-center text-xl font-black tabular-nums leading-none w-10",
          index % 2 === 0 ? "text-malachite" : "text-amber-400",
        )}>
          {item.quantity}×
        </span>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={cn(
            "text-base font-semibold leading-snug text-foreground",
            isStruck && "line-through decoration-2 decoration-foreground/20",
          )}>
            {item.name}
          </span>
          {item.modifiers.map((mod, mi) => (
            <span key={mi} className="rounded-lg bg-forest/20 px-2 py-0.5 text-[11px] font-semibold text-mint whitespace-nowrap">{mod}</span>
          ))}
        </div>
      </button>
    )
  }

  function renderOrderCard(order: KdsOrder, index: number) {
    const urgency = getUrgency(order.createdAt)
    const isNew = newOrderIds.has(order.id)
    const isPending = order.status === "pending"
    const isUpdating = updatingStatus.has(order.id)
    const orderLabel = order.orderType === "takeaway"
      ? t("pos.takeaway")
      : order.orderType === "delivery"
        ? t("pos.delivery")
        : `${t("pos.table")} ${order.tableNumber ?? ""}`

    return (
      <motion.div
        data-testid="kds-order-card"
        key={order.id}
        {...springCard(index * 0.06)}
        className={cn(
          "rounded-3xl bg-card/60 overflow-hidden transition-shadow duration-500 border",
          urgency === "safe" && "border-chart-1/20",
          urgency === "warning" && "border-amber-400/25",
          urgency === "danger" && "border-rose-500/40 shadow-[0_0_20px_-6px_rgba(244,63,94,0.2)]",
          isNew && "ring-1 ring-malachite/30",
        )}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black leading-none text-foreground tracking-tight">
                  {t("kitchen.orderHash")}{order.orderNumber || ""}
                </span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded-lg",
                  order.orderType === "takeaway" && "bg-amber-500/15 text-amber-500",
                  order.orderType === "delivery" && "bg-sky-500/15 text-sky-500",
                  order.orderType !== "takeaway" && order.orderType !== "delivery" && "bg-accent/15 text-accent",
                )}>
                  {orderLabel}
                </span>
              </div>
            </div>
            <div className={cn(
              "shrink-0 text-right",
              urgency === "danger" && "text-rose-500",
              urgency === "warning" && "text-amber-500",
              urgency === "safe" && "text-malachite",
            )}>
              <div className="text-lg font-bold tabular-nums leading-tight">
                {fmtTime(order.createdAt)}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            {order.items.map((item, i) => renderItem(item, i))}
          </div>

          <div className="flex gap-2 pt-1">
            {isPending ? (
              <button
                onClick={() => updateOrderStatus(order.id, "preparing")}
                disabled={isUpdating}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all",
                  "bg-malachite/10 text-malachite hover:bg-malachite/20 active:scale-[0.97]",
                  isUpdating && "opacity-40 pointer-events-none",
                )}
              >
                {isUpdating ? (
                  <span className="w-4 h-4 rounded-full border-2 border-malachite/30 border-t-malachite animate-spin" />
                ) : (
                  <Play className="w-4 h-4" strokeWidth={2} />
                )}
                {t("kitchen.startPreparing")}
              </button>
            ) : (
              <button
                onClick={() => updateOrderStatus(order.id, "ready")}
                disabled={isUpdating}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all",
                  "bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 active:scale-[0.97]",
                  isUpdating && "opacity-40 pointer-events-none",
                )}
              >
                {isUpdating ? (
                  <span className="w-4 h-4 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                )}
                {t("kitchen.markReady")}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 shadow-[0_0_20px_-4px_rgba(251,191,36,0.15)]">
              <ChefHat className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-base font-bold font-display text-foreground tracking-tight">{t("kitchen.title")}</h1>
              <p className="text-[11px] text-muted-foreground/60">{t("kitchen.subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border",
                pendingOrders.length > 0
                  ? "bg-malachite/10 border-malachite/20"
                  : "bg-muted/30 border-border/50",
              )}>
                <Bell className={cn("w-3.5 h-3.5", pendingOrders.length > 0 ? "text-malachite" : "text-muted-foreground/40")} />
                <span className="text-xs text-muted-foreground/60">
                  <span className={cn("font-bold", pendingOrders.length > 0 ? "text-malachite" : "text-muted-foreground/60")}>
                    {pendingOrders.length}
                  </span>
                  <span className="hidden lg:inline text-muted-foreground/40"> {t("kitchen.new")}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/15">
                <Timer className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-xs text-muted-foreground/60">
                  <span className="font-bold text-sky-500">{preparingOrders.length}</span>
                  <span className="hidden lg:inline text-muted-foreground/40"> {t("kitchen.preparing")}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/30 text-muted-foreground/60 text-[10px] font-mono tabular-nums border border-border/50">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  countdown <= 3 ? "bg-amber-500" : countdown <= 6 ? "bg-amber-500/60" : "bg-malachite",
                )} />
                {countdown}s
              </div>
              <button onClick={() => setSoundOn(!soundOn)}
                className="flex items-center justify-center h-9 w-9 rounded-xl text-muted-foreground/50 hover:text-amber-500 hover:bg-amber-500/10 transition-all active:scale-90">
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <ThemeToggle />
              <LanguageSwitcher />
              <Link href={`/${slug}/pos`} title={t("kitchen.posLink")}
                className="flex items-center justify-center h-9 w-9 rounded-xl text-muted-foreground/50 hover:text-amber-500 hover:bg-amber-500/10 transition-all active:scale-90">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6" dir={lang === "ar" ? "rtl" : "ltr"}>
        {orders.length === 0 ? (
          <div data-testid="kitchen-empty" className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/30 border border-border/50">
              <ChefHat className="size-9 text-muted-foreground/30" strokeWidth={1} />
            </div>
            <p className="text-xl font-bold text-muted-foreground/70">{t("kitchen.noOrders")}</p>
            <p className="text-sm text-muted-foreground/40 mt-1.5">{t("kitchen.waiting")}</p>
          </div>
        ) : (
          <>
            {pendingOrders.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-5 px-1">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-malachite opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-malachite" />
                  </span>
                  <h2 className="text-lg font-black font-display text-malachite tracking-tight">
                    {t("kitchen.newOrders")} ({pendingOrders.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 auto-rows-max">
                  <AnimatePresence mode="popLayout">
                    {pendingOrders.map((o, i) => renderOrderCard(o, i))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {pendingOrders.length > 0 && preparingOrders.length > 0 && (
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30 bg-background">
                    {t("kitchen.nextUp")}
                  </span>
                </div>
              </div>
            )}

            {preparingOrders.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5 px-1">
                  <Timer className="w-5 h-5 text-sky-500" strokeWidth={1.5} />
                  <h2 className="text-lg font-black font-display text-sky-500 tracking-tight">
                    {t("kitchen.preparingOrders")} ({preparingOrders.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 auto-rows-max">
                  <AnimatePresence mode="popLayout">
                    {preparingOrders.map((o, i) => renderOrderCard(o, i))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
