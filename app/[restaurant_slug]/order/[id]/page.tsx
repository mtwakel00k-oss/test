"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import Link from "next/link"
import { supabase, fetchApi } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { ORDER_STATUSES } from "@/lib/constants"
import type { Order, OrderItem } from "@/lib/types"
import { OrderStatusTracker } from "@/components/order-status-tracker"
import { OrderDetails } from "@/components/order-details"
import RatingWidget from "@/components/RatingWidget"
import { useSlug } from "@/lib/use-slug"
import { FakeMapBackground } from "@/components/fake-map-background"

function OrderSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-48 bg-card animate-pulse" />
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5 animate-pulse">
        <div className="h-32 bg-card rounded-2xl" />
        <div className="h-40 bg-card rounded-2xl" />
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
          <Link href={`/${slug}/menu`} className="inline-flex rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold hover:brightness-110 transition-all">
            العودة إلى القائمة
          </Link>
        </div>
      </div>
    )
  }

  const stage = ORDER_STATUSES.indexOf(order.status as typeof ORDER_STATUSES[number]) + 1
  const isReady = stage >= 3

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── MAP AREA ── */}
      <div className="relative flex-shrink-0">
        <FakeMapBackground orderId={id} status={order.status} />

        {/* Info overlay — bottom of map */}
        <div className="absolute bottom-0 inset-x-0 px-5 pb-5 flex items-end justify-between">
          <div>
            <p className="text-muted-foreground/70 text-xs font-medium">
              {new Date(order.created_at).toLocaleDateString("ar-DZ", {
                year: "numeric", month: "long", day: "numeric"
              })}
            </p>
            <h1 className="text-foreground text-lg font-black leading-tight">
              طلب #{order.order_number ?? "—"}
            </h1>
            <p className="text-muted-foreground/70 text-xs">
              {order.customer_name}
              {order.table_number ? ` · طاولة ${order.table_number}` : ""}
            </p>
          </div>

          <div className="text-right">
            <p className="text-muted-foreground/50 text-[10px] font-medium">المجموع</p>
            <p className="text-primary text-xl font-black">{order.total}</p>
            <p className="text-muted-foreground/50 text-xs">د.ج</p>
          </div>
        </div>
      </div>

      {/* ── BOTTOM PANEL ── */}
      <div className="flex-1 bg-card px-5 pt-6 pb-10 space-y-5 rounded-t-3xl -mt-5 relative z-10 border border-border/40 border-b-0">

        {/* Status tracker */}
        <OrderStatusTracker currentStage={stage} />

        {/* Order details */}
        <OrderDetails items={items} />

        {/* Rating */}
        {isReady && (
          <div className="rounded-2xl border border-border/60 bg-background/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/[0.04] to-transparent">
              <h2 className="text-sm font-bold text-foreground">قيم وجباتك</h2>
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
                    <div className="flex items-center gap-1.5 text-xs text-emerald-500 ms-6">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      تم التقييم
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel notice */}
        <div className="text-center">
          <p className="text-xs text-destructive/60">
            في حالة رغبة إلغاء الطلب، يرجى التوجّه إلى الكاشير
          </p>
        </div>

        {/* Back to menu */}
        <div className="text-center">
          <Link
            href={`/${slug}/menu`}
            className="inline-flex items-center gap-2 rounded-full border border-border text-muted-foreground px-8 py-3 text-sm font-semibold hover:bg-secondary hover:text-foreground transition-all"
          >
            العودة إلى القائمة
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground/40">
          تحتاج مساعدة؟ تواصل مع الكاشير
        </p>
      </div>
    </div>
  )
}
