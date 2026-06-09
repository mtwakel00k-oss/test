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
          <Link href={`/${slug}/menu`} className="inline-flex items-center gap-2 rounded-full border border-white/20 text-foreground/80 px-8 py-3 text-sm font-semibold hover:bg-white/5 transition-colors">
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
    <div className="min-h-screen bg-background flex flex-col">

      <div
        className="relative flex-shrink-0 h-[42vh] flex flex-col items-center justify-center text-center px-4"
        style={{
          background: "linear-gradient(180deg, #e8f5e9 0%, #f0fdf4 60%, #f0fdf4 100%)",
        }}
      >
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-1/2 left-0 right-0 h-px border-t-2 border-dashed border-slate-400" />
          <div className="absolute top-1/3 left-0 right-0 h-px border-t border-dashed border-slate-300" />
          <div className="absolute top-2/3 left-0 right-0 h-px border-t border-dashed border-slate-300" />
        </div>

        <div
          className="absolute text-3xl"
          style={{
            top: "28%", right: "30%",
            animation: "deliveryBounce 2s ease-in-out infinite",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
          }}
        >
          🛵
        </div>

        <div className="relative z-10 space-y-1">
          <p className="text-sm font-medium text-slate-500">
            {new Date(order.created_at).toLocaleDateString("ar-DZ", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {order.status === "completed" ? "تم التوصيل ✅"
             : order.status === "out_for_delivery" ? "الطلب في الطريق 🛵"
             : order.status === "ready" ? "الطلب جاهز ✅"
             : order.status === "cancelled" ? "تم إلغاء الطلب ❌"
             : `طلب #${order.order_number ?? ""}`}
          </h1>
          <p className="text-sm text-slate-500">
            {order.customer_name}
            {order.table_number ? ` · طاولة ${order.table_number}` : ""}
          </p>
          <p className="text-xl font-black" style={{ color: "#5FAD41" }}>
            {order.total} د.ج
          </p>
        </div>
      </div>

      <div className="flex-1 bg-[#1C1C1E] rounded-t-[2rem] -mt-6 relative z-10 px-5 pt-6 pb-8 space-y-5 overflow-y-auto">

        <OrderStatusTracker
          currentStage={stage}
          orderType={(order.order_type as "dine_in" | "takeaway" | "delivery") ?? "dine_in"}
        />
        <OrderDetails items={items} />

        {order.order_type === "delivery" && order.delivery_address && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-start gap-3">
            <span className="text-xl">📍</span>
            <div>
              <p className="text-xs font-semibold text-white/50 mb-0.5">عنوان التوصيل</p>
              <p className="text-sm text-white">{order.delivery_address}</p>
            </div>
          </div>
        )}

        {isReady && (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white">قيم وجباتك</h2>
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

        <p className="text-center text-xs text-red-400/70">
          في حالة رغبة إلغاء الطلب، يرجى التوجّه إلى الكاشير
        </p>

        <div className="text-center">
          <Link
            href={`/${slug}/menu`}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 text-white/80 px-8 py-3 text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            العودة إلى القائمة
          </Link>
        </div>

        <p className="text-center text-xs text-white/25">
          تحتاج مساعدة؟ تواصل مع الكاشير
        </p>

      </div>
    </div>
  )
}
