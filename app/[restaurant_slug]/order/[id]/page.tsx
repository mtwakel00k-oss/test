"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import Link from "next/link"
import { supabase, fetchApi } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import type { Order, OrderItem } from "@/lib/types"
import { OrderStatusTracker } from "@/components/order-status-tracker"
import { OrderDetails } from "@/components/order-details"
import RatingWidget from "@/components/RatingWidget"
import { useSlug } from "@/lib/use-slug"

function OrderSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5 animate-pulse">
        <div className="h-6 bg-secondary rounded-lg w-1/2 mx-auto" />
        <div className="h-32 bg-secondary rounded-2xl" />
        <div className="h-40 bg-secondary rounded-2xl" />
      </main>
    </div>
  )
}

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const slug = useSlug()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [ratedProducts, setRatedProducts] = useState<number[]>([])

  useEffect(() => {
    async function load() {
      const res = await fetchApi(`/api/orders/${id}`)
      if (!res.ok) { logger.error("Order not found", res.status); setLoading(false); return }
      const o = await res.json()
      setOrder(o)
      setItems(o.items || [])
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    const sub = supabase().channel(`order:${id}`)
      .on("postgres_changes" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload: { new?: Record<string, unknown> }) => { if (payload.new) setOrder(payload.new as unknown as Order) }
      )
      .subscribe()
    return () => { supabase().removeChannel(sub) }
  }, [id])

  if (loading) return <OrderSkeleton />
  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🍔</div>
          <h1 className="text-xl font-bold text-foreground mb-2">الطلب غير موجود</h1>
          <Link href={`/${slug}/menu`} className="inline-flex rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
            العودة إلى القائمة
          </Link>
        </div>
      </div>
    )
  }

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
  const isReady = order.status === "ready"
    || order.status === "out_for_delivery"
    || order.status === "completed"

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5">
        <div className="text-center pb-2">
          <h1 className="text-xl font-bold text-foreground">طلب #{order.order_number ?? ""}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {order.customer_name}{order.table_number ? ` \u00b7 طاولة ${order.table_number}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            المجموع: <span className="font-semibold text-primary">{order.total} د.ج</span>
          </p>
        </div>

        {order.status === "out_for_delivery" && (
          <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800 px-5 py-4 flex items-center gap-4 animate-pulse-once">
            <span className="text-4xl animate-bounce">🛵</span>
            <div>
              <p className="text-base font-bold text-purple-800 dark:text-purple-300">في الطريق</p>
              <p className="text-sm text-purple-600 dark:text-purple-400">طلبك في الطريق إليك الآن 🛵</p>
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
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">عنوان التوصيل</p>
              <p className="text-sm text-foreground">{order.delivery_address}</p>
            </div>
          </div>
        )}

        {isReady && (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-transparent px-4 py-3 border-b border-border/40">
              <h2 className="text-sm font-semibold text-foreground">قيم وجباتك</h2>
              <p className="text-xs text-muted-foreground mt-0.5">شاركنا رأيك ليساعدنا على التحسن</p>
            </div>
            <div className="divide-y divide-border/40">
              {items.map(i => (
                <div key={i.id} className="px-4 py-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">{i.product_name}</p>
                  {!ratedProducts.includes(Number(i.product_id)) ? (
                    <RatingWidget
                      productId={i.product_id}
                      onRated={() => setRatedProducts(prev => [...prev, Number(i.product_id)])}
                    />
                  ) : (
                    <p className="text-xs text-emerald-500">✓ تم التقييم</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-red-400 pb-4">
          في حالة رغبة إلغاء الطلب، يرجى التوجّه إلى الكاشير
        </p>

        <div className="text-center">
          <Link href={`/${slug}/menu`} className="inline-flex rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
            العودة إلى القائمة
          </Link>
        </div>
      </main>
    </div>
  )
}
