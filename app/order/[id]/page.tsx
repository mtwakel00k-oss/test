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

function OrderSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-secondary rounded-lg" />
          <div className="h-4 w-28 bg-secondary rounded" />
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-2xl bg-secondary shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 bg-secondary rounded" />
                <div className="h-3 w-20 bg-secondary rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-28 bg-secondary rounded" />
              <div className="h-4 w-14 bg-secondary rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default function OrderPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
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
      if (d.slug) router.replace(`/${d.slug}/order/${id}`)
      else router.replace("/login")
    }).catch(() => router.replace("/login"))
  }, [router, id])
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!id || !hasConfig) return
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
  }, [id, hasConfig, t])

  useEffect(() => {
    if (!id || !hasConfig) return
    const sub = supabase().channel(`order:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload: { new: Order }) => { setOrder(payload.new as Order); logger.info("Status updated", payload.new) }
      )
      .subscribe()
    return () => { supabase().removeChannel(sub) }
  }, [id, hasConfig])

  if (loading) return <OrderSkeleton />

  if (error || !order) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">{error || t("order.notFound")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("track.couldNotFind")}</p>
        <Link href="/menu" className="inline-flex rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
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

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5">
        <div className="text-center pb-2">
          <h1 className="text-xl font-bold text-foreground">{t("track.orderNumber")} #{order.order_number ?? ""}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {order.customer_name}{order.table_number ? ` \u00b7 ${t("track.table")} ${order.table_number}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("track.total")}: <span className="font-semibold text-primary">{order.total} {t("track.currency")}</span>
          </p>
        </div>

        {order.status === "out_for_delivery" && (
          <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800 px-5 py-4 flex items-center gap-4 animate-pulse-once">
            <span className="text-4xl animate-bounce">🛵</span>
            <div>
              <p className="text-base font-bold text-purple-800 dark:text-purple-300">{t("track.outForDelivery")}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400">{t("track.outForDeliverySub")}</p>
            </div>
          </div>
        )}

        <OrderStatusTracker
          currentStage={stage}
          orderType={(order.order_type as "dine_in" | "takeaway" | "delivery") ?? "dine_in"}
        />
        <OrderDetails items={items} />

        {order.order_type === "delivery" && order.delivery_address && (
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3 flex items-start gap-3">
            <span className="text-xl">📍</span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">{t("track.deliveryAddress")}</p>
              <p className="text-sm text-foreground">{order.delivery_address}</p>
            </div>
          </div>
        )}

        {showRating && (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="bg-gradient-to-r from-primary/5 to-transparent px-4 py-3 border-b border-border/40">
            <h2 className="text-sm font-semibold text-foreground">{t("order.rateMeals")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("order.rateSubtitle")}</p>
          </div>
          <div className="divide-y divide-border/40">
            {items.map(i => (
              <div key={i.id} className="px-4 py-3 space-y-2">
                <p className="text-sm font-medium text-foreground">{i.product_name}</p>
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

        <p className="text-center text-xs text-red-400 pb-4">
          {t("order.cancelNotice")}
        </p>
      </main>
    </div>
  )
}