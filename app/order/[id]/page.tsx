"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase, fetchApi } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import type { Order, OrderItem } from "@/lib/types"
import { OrderStatusTracker } from "@/components/order-status-tracker"
import { OrderDetails } from "@/components/order-details"
import RatingWidget from "@/components/RatingWidget"
import { useTranslation } from "@/lib/use-translation"
import { CheckCircle, Clock, ChefHat, Bike, Sparkles } from "lucide-react"

function OrderSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-zinc-800 rounded-lg mx-auto" />
          <div className="h-4 w-28 bg-zinc-800 rounded mx-auto" />
        </div>
        <div className="bg-zinc-800/50 rounded-2xl p-5 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 bg-zinc-800 rounded" />
                <div className="h-3 w-20 bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-zinc-800/30 rounded-xl p-4 space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-28 bg-zinc-800 rounded" />
              <div className="h-4 w-14 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  pending: "pos.statusNew",
  preparing: "pos.statusPreparing",
  ready: "pos.statusReady",
  out_for_delivery: "pos.statusOutForDelivery",
  completed: "pos.statusCompleted",
}

export default function OrderPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const configSlug = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const el = document.getElementById("tenant-config")
    try { if (el?.textContent) return JSON.parse(el.textContent).slug || '' } catch {}
    try { return ((window as unknown as Record<string, unknown>).__TENANT_CONFIG__ as { slug?: string })?.slug || '' } catch {}
    return ''
  }, [])

  useEffect(() => {
    if (!configSlug || !id) return
    const slugFromPath = () => {
      const parts = window.location.pathname.split('/').filter(Boolean)
      if (parts.length >= 2 && !['admin','menu','pos','kitchen','order','login'].includes(parts[0]) && !parts[0].includes('.'))
        return parts[0]
      return ''
    }
    const s = slugFromPath() || configSlug
    if (s && !window.location.pathname.startsWith(`/${s}/`)) {
      router.replace(`/${s}/order/${id}`)
    }
  }, [configSlug, id, router])
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchApi(`/api/orders/${id}`)
        if (cancelled) return
        if (!res.ok) {
          setError(t("order.notFound"))
          return
        }
        const orderData = await res.json()
        setOrder(orderData)
        setItems(orderData.items || [])
      } catch {
        logger.error("Failed to fetch order")
        setError(t("order.notFound"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, t])

  useEffect(() => {
    if (!id) return
    const sub = supabase().channel(`order:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload: { new: Order }) => { setOrder(payload.new as Order); logger.info("Status updated", payload.new) }
      )
      .subscribe()
    return () => { supabase().removeChannel(sub) }
  }, [id])

  if (loading) return <OrderSkeleton />

  if (error || !order) return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-6xl mb-6 opacity-80">🍔</div>
        <h1 className="text-2xl font-black text-white mb-2">{error || t("order.notFound")}</h1>
        <p className="text-sm text-white/50 mb-6">{t("track.couldNotFind")}</p>
        <Link href="/menu" className="inline-flex rounded-xl bg-amber-500 text-white px-7 py-3 text-sm font-bold hover:bg-amber-400 transition-all active:scale-95 shadow-lg shadow-amber-500/20">
          {t("track.backToMenu")}
        </Link>
      </div>
    </div>
  )

  const getStage = (status: string, orderType: string): number => {
    if (orderType === "delivery") {
      const deliveryStages = ["pending", "preparing", "ready", "out_for_delivery", "completed"]
      const idx = deliveryStages.indexOf(status)
      return idx >= 0 ? idx + 1 : 1
    }
    const baseStages = ["pending", "preparing", "ready", "completed"]
    const idx = baseStages.indexOf(status)
    return idx >= 0 ? idx + 1 : 1
  }
  const stage = getStage(order.status, order.order_type ?? "dine_in")
  const showRating = order.status === "ready"
    || order.status === "out_for_delivery"
    || order.status === "completed"
  const statusLabel = STATUS_LABELS[order.status] || "pos.statusNew"

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5">
        <div className="text-center pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs mb-3">
            {t(statusLabel)}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{t("track.orderNumber")} <span className="text-amber-400">#{order.order_number ?? ""}</span></h1>
          <p className="text-sm text-white/50 mt-1">
            {order.customer_name}{order.table_number ? ` · ${t("track.table")} ${order.table_number}` : ""}
          </p>
          <p className="text-xs text-white/30 mt-2">
            {t("track.total")}: <span className="font-bold text-amber-400">{order.total} {t("track.currency")}</span>
          </p>
        </div>

        {order.status === "out_for_delivery" && (
          <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 px-5 py-4 flex items-center gap-4 shadow-xl shadow-violet-500/5">
            <span className="text-4xl animate-bounce">🛵</span>
            <div>
              <p className="text-base font-bold text-white">{t("track.outForDelivery")}</p>
              <p className="text-sm text-violet-300/70">{t("track.outForDeliverySub")}</p>
            </div>
          </div>
        )}

        <OrderStatusTracker
          currentStage={stage}
          orderType={(order.order_type as "dine_in" | "takeaway" | "delivery") ?? "dine_in"}
        />
        <OrderDetails items={items} />

        {order.order_type === "delivery" && order.delivery_address && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 flex items-start gap-3">
            <span className="text-xl leading-none">📍</span>
            <div>
              <p className="text-xs font-semibold text-white/40 mb-0.5">{t("track.deliveryAddress")}</p>
              <p className="text-sm text-white/80">{order.delivery_address}</p>
            </div>
          </div>
        )}

        {showRating && (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/10 to-transparent px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">{t("order.rateMeals")}</h2>
            </div>
            <p className="text-xs text-white/40 mt-0.5">{t("order.rateSubtitle")}</p>
          </div>
          <div className="divide-y divide-white/5">
            {items.map(i => (
              <div key={i.id} className="px-5 py-4 space-y-2">
                <p className="text-sm font-medium text-white/80">{i.product_name}</p>
                <RatingWidget
                  productId={i.product_id}
                  orderId={id}
                  onRated={() => {}}
                />
              </div>
            ))}
          </div>
        </div>
        )}

        <p className="text-center text-xs text-rose-500/50 pb-4">
          {t("order.cancelNotice")}
        </p>
      </main>
    </div>
  )
}
