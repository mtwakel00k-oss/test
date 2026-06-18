"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ExternalLink, ChefHat, Timer, Bell } from "lucide-react"
import { supabase, fetchApi } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTranslation } from "@/lib/use-translation"
import { playNewOrderSound, initAudio } from "@/lib/sound"

interface KitchenItem { id: number | string; name: string; quantity: number }
interface KitchenOrder {
  id: string | number; orderNumber: number | null; tableNumber: number | null;
  orderType: string; status: "pending" | "preparing"; items: KitchenItem[]; createdAt: Date
}
interface RawOrder { id: string | number; order_number: number | null; table_number: number | null; order_type: string; status: string; created_at: string }
interface RawOrderItem { id: string | number; order_id: string | number; product_name: string; size: string | null; quantity: number }
interface OrderChangePayload { new: { id?: string | number; status?: string }; old: { id?: string | number } }

const ACTIVE_STATUSES = ["pending", "preparing"]
const TERMINAL_STATUSES = ["completed", "delivered", "cancelled"]

export default function KitchenPage() {
  const router = useRouter()
  const { t, lang } = useTranslation()
  const hasConfig = useMemo(() => {
    if (typeof window === 'undefined') return false
    const el = document.getElementById("tenant-config")
    return !!(el?.textContent || (window as unknown as Record<string, unknown>).__TENANT_CONFIG__)
  }, [])

  useEffect(() => {
    const el = document.getElementById("tenant-config")
    if (el?.textContent) return
    const config = (window as unknown as Record<string, unknown>).__TENANT_CONFIG__
    if (config) return
    fetch("/api/auth/login").then(r => r.json()).then(d => {
      if (d.slug) router.replace(`/${d.slug}/kitchen`)
      else router.replace("/login")
    }).catch(() => router.replace("/login"))
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
    if (diff < 60) return `${diff} ${t("time.min")}`
    const h = Math.floor(diff / 60)
    return `${h}h ${diff % 60}${t("time.min")}`
  }

  const fetchOrders = useCallback(async (): Promise<KitchenOrder[]> => {
    try {
      const res = await fetchApi(`/api/orders?status_in=${ACTIVE_STATUSES.join(",")}&include_items=true`)
      if (!res.ok) { logger.error("Kitchen fetch error", res.status); return [] }
      const raw: (RawOrder & { items?: RawOrderItem[] })[] = await res.json()
      const mapped: KitchenOrder[] = (raw || []).map(o => ({
        id: o.id,
        orderNumber: o.order_number ?? null,
        tableNumber: o.table_number ?? null,
        orderType: o.order_type || "dine_in",
        status: o.status === "preparing" ? "preparing" : "pending",
        items: (o.items || []).map(it => ({
          id: it.id,
          name: it.product_name + (it.size && it.size !== "UNIQUE" ? ` (${it.size})` : ""),
          quantity: it.quantity,
        })),
        createdAt: new Date(o.created_at),
      }))
      if (prevOrderIdsRef.current.size > 0) {
        const newOrders = mapped.filter(o => !prevOrderIdsRef.current.has(o.id))
        if (newOrders.length > 0) playNewOrderSound()
      }
      prevOrderIdsRef.current = new Set(mapped.map(o => o.id))
      return mapped
    } catch { logger.error("Kitchen fetch error"); return [] }
  }, [])

  useEffect(() => { if (hasConfig) fetchOrders().then(setOrders) }, [fetchOrders, hasConfig])

  useEffect(() => {
    if (!hasConfig) return
    const channel = supabase().channel("kitchen-passive")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload: OrderChangePayload) => {
        const status = payload.new?.status
        if (status && ACTIVE_STATUSES.includes(status)) fetchOrders().then(setOrders)
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload: OrderChangePayload) => {
        const newStatus = payload.new?.status
        const orderId = payload.new?.id
        if (newStatus && ACTIVE_STATUSES.includes(newStatus)) fetchOrders().then(setOrders)
        else if (newStatus && TERMINAL_STATUSES.includes(newStatus)) {
          setOrders(prev => prev.filter(o => o.id !== orderId))
          if (orderId != null) prevOrderIdsRef.current.delete(orderId)
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload: OrderChangePayload) => {
        const deletedId = payload.old?.id
        if (deletedId) { setOrders(prev => prev.filter(o => o.id !== deletedId)); prevOrderIdsRef.current.delete(deletedId) }
      })
      .subscribe()
    return () => { supabase().removeChannel(channel) }
  }, [fetchOrders, hasConfig])

  const pendingOrders = orders.filter(o => o.status === "pending")
  const preparingOrders = orders.filter(o => o.status === "preparing")

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight">{t("kitchen.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("kitchen.subtitle")}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Bell className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">
                <span className="font-bold text-amber-500">{pendingOrders.length}</span> {t("kitchen.new")}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <Timer className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-sm text-muted-foreground">
                <span className="font-bold text-sky-500">{preparingOrders.length}</span> {t("kitchen.preparing")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-foreground tabular-nums">{currentTime}</p>
              <p className="text-xs text-muted-foreground">{currentDate}</p>
            </div>
            <ThemeToggle />
            <LanguageSwitcher />
            <Link href="/pos" title={t("kitchen.posLink")} className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 hover:bg-amber-500/20 hover:text-amber-500 text-muted-foreground/50 transition-colors">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted/40 mb-6">
              <ChefHat className="w-12 h-12" />
            </div>
            <p className="text-2xl font-bold text-muted-foreground/20">{t("kitchen.noOrders")}</p>
            <p className="text-base text-muted-foreground/10 mt-2">{t("kitchen.waiting")}</p>
          </div>
        ) : (
          <>
            {pendingOrders.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-3 w-3">
                    <span className="absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                  </span>
                  <h2 className="text-lg font-black text-amber-500 tracking-tight">{t("kitchen.newOrders")} ({pendingOrders.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {pendingOrders.map(order => (
                    <div key={order.id} className="group relative bg-gradient-to-br from-amber-500/10 to-transparent border-2 border-amber-500/30 rounded-2xl p-5 shadow-xl shadow-amber-500/5 hover:shadow-amber-500/15 hover:border-amber-500/50 transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex justify-between items-start w-full mb-4 relative">
                        <div>
                          <div className="text-2xl font-black text-foreground text-start">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : `${t("pos.table")} ${order.tableNumber}`}
                          </div>
                          <p className="text-sm text-muted-foreground/60 mt-0.5 text-start font-mono">#{order.orderNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/30">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : t("pos.dineIn")}
                          </span>
                          <span className="text-sm font-mono text-amber-500/70 tabular-nums">{fmtTime(order.createdAt)}</span>
                        </div>
                      </div>
                      <div className="border-t border-amber-500/10 pt-4 space-y-2.5 relative">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            <span className="text-lg font-black text-amber-500 min-w-[3rem]">{item.quantity}×</span>
                            <span className="text-sm text-foreground/80 font-medium">{item.name}</span>
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
                <div className="flex items-center gap-3 mb-4">
                  <Timer className="w-4 h-4 text-sky-500" />
                  <h2 className="text-lg font-black text-sky-500 tracking-tight">{t("kitchen.preparingOrders")} ({preparingOrders.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {preparingOrders.map(order => (
                    <div key={order.id} className="relative bg-gradient-to-br from-sky-500/5 to-transparent border border-sky-500/20 rounded-2xl p-5 hover:shadow-lg hover:shadow-sky-500/5 hover:border-sky-500/30 transition-all">
                      <div className="absolute top-0 left-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex justify-between items-start w-full mb-4 relative">
                        <div>
                          <div className="text-2xl font-black text-foreground text-start">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : `${t("pos.table")} ${order.tableNumber}`}
                          </div>
                          <p className="text-sm text-muted-foreground/60 mt-0.5 text-start font-mono">#{order.orderNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/30">
                            {order.orderType === "takeaway" ? t("pos.takeaway") : t("pos.dineIn")}
                          </span>
                          <span className="text-sm font-mono text-sky-500/70 tabular-nums">{fmtTime(order.createdAt)}</span>
                        </div>
                      </div>
                      <div className="border-t border-sky-500/10 pt-4 space-y-2.5 relative">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            <span className="text-lg font-black text-sky-500 min-w-[3rem]">{item.quantity}×</span>
                            <span className="text-sm text-foreground/80 font-medium">{item.name}</span>
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