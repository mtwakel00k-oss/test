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
    <div className="min-h-screen bg-[#1C1C1E]">
      <div className="h-48 bg-[#2C2C2E] animate-pulse" />
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5 animate-pulse">
        <div className="h-32 bg-[#2C2C2E] rounded-2xl" />
        <div className="h-40 bg-[#2C2C2E] rounded-2xl" />
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
      <div className="min-h-screen bg-[#1C1C1E] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🍔</div>
          <h1 className="text-xl font-bold text-white mb-2">الطلب غير موجود</h1>
          <Link href={`/${slug}/menu`} className="inline-flex rounded-2xl bg-[#BFFF00] text-black px-6 py-2.5 text-sm font-bold hover:opacity-90 transition-all">
            العودة إلى القائمة
          </Link>
        </div>
      </div>
    )
  }

  const stage = ORDER_STATUSES.indexOf(order.status as typeof ORDER_STATUSES[number]) + 1
  const isReady = stage >= 3

  return (
    <div className="min-h-screen bg-[#1C1C1E] flex flex-col">

      {/* ── MAP AREA ── */}
      <div className="relative flex-shrink-0">
        <FakeMapBackground orderId={id} status={order.status} />

        {/* Info overlay — bottom of map */}
        <div className="absolute bottom-0 inset-x-0 px-4 pb-4 flex items-end justify-between">
          {/* Order info */}
          <div>
            <p className="text-white/60 text-xs font-medium">
              {new Date(order.created_at).toLocaleDateString("ar-DZ", {
                year: "numeric", month: "long", day: "numeric"
              })}
            </p>
            <h1 className="text-white text-lg font-black leading-tight">
              طلب #{order.order_number ?? "—"}
            </h1>
            <p className="text-white/60 text-xs">
              {order.customer_name}
              {order.table_number ? ` · طاولة ${order.table_number}` : ""}
            </p>
          </div>

          {/* Total */}
          <div className="text-right">
            <p className="text-white/40 text-[10px] font-medium">المجموع</p>
            <p className="text-[#BFFF00] text-xl font-black">{order.total}</p>
            <p className="text-white/40 text-xs">د.ج</p>
          </div>
        </div>
      </div>

      {/* ── DARK PANEL ── */}
      <div className="flex-1 bg-[#1C1C1E] px-4 pt-5 pb-10 space-y-4">

        {/* Status tracker */}
        <OrderStatusTracker currentStage={stage} />

        {/* Order details */}
        <OrderDetails items={items} />

        {/* Rating */}
        {isReady && (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h2 className="text-sm font-bold text-white">قيم وجباتك</h2>
              <p className="text-xs text-white/40 mt-0.5">شاركنا رأيك ليساعدنا على التحسن</p>
            </div>
            <div className="divide-y divide-white/10">
              {items.map(i => (
                <div key={i.id} className="px-4 py-3 space-y-2">
                  <p className="text-sm font-medium text-white">{i.product_name}</p>
                  {!ratedProducts.includes(Number(i.product_id)) ? (
                    <RatingWidget
                      productId={i.product_id}
                      onRated={() => setRatedProducts(prev => [...prev, Number(i.product_id)])}
                    />
                  ) : (
                    <p className="text-xs text-emerald-400">✓ تم التقييم</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel notice */}
        <p className="text-center text-xs text-red-400/70">
          في حالة رغبة إلغاء الطلب، يرجى التوجّه إلى الكاشير
        </p>

        {/* Back to menu */}
        <div className="text-center pt-2">
          <Link
            href={`/${slug}/menu`}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 text-white/70 px-8 py-3 text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            العودة إلى القائمة
          </Link>
        </div>

        <p className="text-center text-xs text-white/20">
          تحتاج مساعدة؟ تواصل مع الكاشير
        </p>
      </div>
    </div>
  )
}
