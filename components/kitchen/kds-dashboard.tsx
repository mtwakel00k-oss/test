"use client"

import { useEffect, useState, useRef, useCallback, useMemo, startTransition } from "react"
import { ChefHat, Timer, Bell, Volume2, VolumeX, ExternalLink, CheckCircle2, Play, ListChecks } from "lucide-react"
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
  MAX_VISIBLE: 30 * 60 * 1000,
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

  function getProgressPct(date: Date): number {
    return Math.min(100, ((now - date.getTime()) / TIME_THRESHOLDS.MAX_VISIBLE) * 100)
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

  function UrgencyDot({ urgency }: { urgency: "safe" | "warning" | "danger" }) {
    return (
      <span className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        urgency === "safe" && "bg-emerald-500",
        urgency === "warning" && "bg-amber-500",
        urgency === "danger" && "bg-rose-500 animate-pulse",
      )} />
    )
  }

  function UrgencyBorder({ urgency, children }: { urgency: "safe" | "warning" | "danger"; children: React.ReactNode }) {
    return (
      <div className={cn(
        "rounded-3xl border-2 transition-colors duration-500",
        urgency === "safe" && "border-emerald-500/20",
        urgency === "warning" && "border-amber-500/30",
        urgency === "danger" && "border-rose-500/50 shadow-[0_0_24px_-4px_rgba(244,63,94,0.25)]",
      )}>
        {children}
      </div>
    )
  }

  function renderItem(item: KdsItem, index: number) {
    const isStruck = struckItems.has(item.id)
    return (
      <motion.button
        key={item.id}
        layout
        onClick={() => toggleStrike(item.id)}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl p-3 text-right transition-all",
          "hover:bg-white/[0.03] active:scale-[0.98]",
          isStruck && "opacity-40",
        )}
      >
        <span className={cn(
          "min-w-[3rem] text-center text-lg font-black tabular-nums leading-none pt-0.5",
          index % 2 === 0 ? "text-emerald-400" : "text-amber-400",
        )}>
          {item.quantity}×
        </span>
        <div className="flex-1 min-w-0">
          <span className={cn(
            "block text-[15px] font-semibold leading-snug text-white/90",
            isStruck && "line-through decoration-2 decoration-white/30",
          )}>
            {item.name}
          </span>
          {item.modifiers.length > 0 && (
            <motion.div
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-1.5 mt-1.5"
            >
              {item.modifiers.map((mod, mi) => (
                <span
                  key={mi}
                  className="inline-flex rounded-lg bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-300"
                >
                  {mod}
                </span>
              ))}
            </motion.div>
          )}
        </div>
      </motion.button>
    )
  }

  function renderOrderCard(order: KdsOrder, index: number) {
    const urgency = getUrgency(order.createdAt)
    const progress = getProgressPct(order.createdAt)
    const isNew = newOrderIds.has(order.id)
    const isPending = order.status === "pending"
    const isUpdating = updatingStatus.has(order.id)
    const allStruck = order.items.length > 0 && order.items.every(it => struckItems.has(it.id))
    const itemCount = order.items.length
    const struckCount = order.items.filter(it => struckItems.has(it.id)).length
    const orderLabel = order.orderType === "takeaway"
      ? t("pos.takeaway")
      : order.orderType === "delivery"
        ? t("pos.delivery")
        : `${t("pos.table")} ${order.tableNumber ?? ""}`

    return (
      <motion.div
        key={order.id}
        layout
        {...springCard(index * 0.05)}
      >
        <UrgencyBorder urgency={urgency}>
          <div className={cn(
            "rounded-[calc(1.5rem-2px)] bg-[#18181b] overflow-hidden",
            isNew && "ring-2 ring-emerald-500/30",
          )}>
            <div className="h-1 w-full bg-white/[0.03] relative overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-colors duration-700",
                  urgency === "danger" && "bg-rose-500",
                  urgency === "warning" && "bg-amber-500",
                  urgency === "safe" && "bg-emerald-500",
                )}
              />
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <UrgencyDot urgency={urgency} />
                  <div>
                    <div className="text-[22px] font-black leading-none text-white tracking-tight">
                      {t("kitchen.orderHash")}{order.orderNumber || ""}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-white/40 font-medium">
                        {orderLabel}
                      </span>
                      <span className="text-[10px] text-white/20">·</span>
                      <span className="text-[11px] text-white/30 font-medium flex items-center gap-1">
                        <ListChecks className="w-3 h-3" strokeWidth={2} />
                        {struckCount}/{itemCount}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    urgency === "danger" ? "text-rose-400/60" : urgency === "warning" ? "text-amber-400/60" : "text-emerald-400/60",
                  )}>
                    {t("time.minsAgo")}
                  </div>
                  <div className={cn(
                    "text-base font-bold tabular-nums leading-tight mt-0.5",
                    urgency === "danger" ? "text-rose-400" : urgency === "warning" ? "text-amber-400" : "text-emerald-400",
                  )}>
                    {fmtTime(order.createdAt)}
                  </div>
                </div>
              </div>

              <div className={cn(
                "border-t pt-3 space-y-0.5 divide-y divide-white/[0.04]",
                urgency === "danger" ? "border-rose-500/20" : urgency === "warning" ? "border-amber-500/15" : "border-white/[0.06]",
              )}>
                {order.items.map((item, i) => renderItem(item, i))}
              </div>

              <div className="flex gap-2 pt-1">
                {isPending ? (
                  <button
                    onClick={() => updateOrderStatus(order.id, "preparing")}
                    disabled={isUpdating}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all",
                      "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 active:scale-[0.97]",
                      allStruck && "ring-1 ring-emerald-500/30",
                      isUpdating && "opacity-50 pointer-events-none",
                    )}
                  >
                    {isUpdating ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" strokeWidth={2} />
                    )}
                    {t("kitchen.startPreparing")}
                  </button>
                ) : (
                  <button
                    onClick={() => updateOrderStatus(order.id, "ready")}
                    disabled={isUpdating}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all",
                      "bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 active:scale-[0.97]",
                      allStruck && "ring-1 ring-sky-500/30",
                      isUpdating && "opacity-50 pointer-events-none",
                    )}
                  >
                    {isUpdating ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
                    )}
                    {t("kitchen.markReady")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </UrgencyBorder>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 shadow-[0_0_20px_-4px_rgba(251,191,36,0.15)]">
              <ChefHat className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-base font-bold font-display text-white tracking-tight">{t("kitchen.title")}</h1>
              <p className="text-[11px] text-white/40">{t("kitchen.subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border",
                pendingOrders.length > 0
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-white/[0.03] border-white/[0.06]",
              )}>
                <Bell className={cn("w-3.5 h-3.5", pendingOrders.length > 0 ? "text-emerald-400" : "text-white/30")} />
                <span className="text-xs text-white/50">
                  <span className={cn("font-bold", pendingOrders.length > 0 ? "text-emerald-400" : "text-white/50")}>
                    {pendingOrders.length}
                  </span>
                  <span className="hidden lg:inline text-white/30"> {t("kitchen.new")}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/15">
                <Timer className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs text-white/50">
                  <span className="font-bold text-sky-400">{preparingOrders.length}</span>
                  <span className="hidden lg:inline text-white/30"> {t("kitchen.preparing")}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] text-white/40 text-[10px] font-mono tabular-nums border border-white/[0.06]">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  countdown <= 3 ? "bg-amber-400" : countdown <= 6 ? "bg-amber-400/60" : "bg-emerald-400",
                )} />
                {countdown}s
              </div>
              <button onClick={() => setSoundOn(!soundOn)}
                className="flex items-center justify-center h-9 w-9 rounded-xl text-white/30 hover:text-amber-400 hover:bg-amber-500/10 transition-all active:scale-90">
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <ThemeToggle />
              <LanguageSwitcher />
              <Link href={`/${slug}/pos`} title={t("kitchen.posLink")}
                className="flex items-center justify-center h-9 w-9 rounded-xl text-white/30 hover:text-amber-400 hover:bg-amber-500/10 transition-all active:scale-90">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6" dir={lang === "ar" ? "rtl" : "ltr"}>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.03] border border-white/[0.06]">
              <ChefHat className="size-9 text-white/15" strokeWidth={1} />
            </div>
            <p className="text-xl font-bold text-white/50">{t("kitchen.noOrders")}</p>
            <p className="text-sm text-white/30 mt-1.5">{t("kitchen.waiting")}</p>
          </div>
        ) : (
          <>
            {pendingOrders.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-5 px-1">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <h2 className="text-lg font-black font-display text-emerald-400 tracking-tight">
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
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 bg-[#09090b]">
                    {t("kitchen.nextUp")}
                  </span>
                </div>
              </div>
            )}

            {preparingOrders.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5 px-1">
                  <Timer className="w-5 h-5 text-sky-500" strokeWidth={1.5} />
                  <h2 className="text-lg font-black font-display text-sky-400 tracking-tight">
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
