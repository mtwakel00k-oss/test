"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { supabase, fetchApi } from "@/lib/tenant"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { logger } from "@/lib/logger"
import type { Order, OrderItem } from "@/lib/types"
import { OrderStatusTracker } from "@/components/order-status-tracker"
import { OrderDetails } from "@/components/order-details"
import RatingWidget from "@/components/RatingWidget"

const DriverMap = dynamic(() => import("@/components/driver-map"), { ssr: false })

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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function OrderTrackingPage({ params }: { params: Promise<{ restaurant_slug: string; id: string }> }) {
  const { id, restaurant_slug } = use(params)
  const slug = useSlug() || restaurant_slug
  const { t, lang, dir } = useTranslation()
  const cur = lang === "ar" ? "د.ج" : "DA"
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [ratedProducts, setRatedProducts] = useState<number[]>([])
  const [driverLat, setDriverLat] = useState<number | null>(null)
  const [driverLng, setDriverLng] = useState<number | null>(null)
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetchApi(`/api/orders/${id}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "" }))
        setErrorMsg(err.error || `${t("common.unknownError")} ${res.status}`)
        setLoading(false)
        return
      }
      const o = await res.json()
      setOrder(o)
      setItems(o.items || [])
      if (o.delivery_lat != null && o.delivery_lng != null) {
        setDeliveryCoords({ lat: o.delivery_lat, lng: o.delivery_lng })
      }
      setLoading(false)
    }
    load()
  }, [id, t])

  useEffect(() => {
    const sub = supabase().channel(`order:${id}`)
      .on("postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload: { new?: Record<string, unknown> }) => {
          if (payload.new) {
            const updated = payload.new as unknown as Order
            setOrder(updated)
            if (updated.driver_lat != null && updated.driver_lng != null) {
              setDriverLat(Number(updated.driver_lat))
              setDriverLng(Number(updated.driver_lng))
            }
            if (updated.delivery_lat != null && updated.delivery_lng != null) {
              setDeliveryCoords({ lat: Number(updated.delivery_lat), lng: Number(updated.delivery_lng) })
            }
          }
        },
      )
      .subscribe()
    return () => { supabase().removeChannel(sub) }
  }, [id])

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

  if (loading) return <OrderSkeleton />
  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🍔</div>
          <h1 className="text-xl font-bold text-foreground mb-2">{t("order.notFound")}</h1>
          {errorMsg && <p className="text-sm text-muted-foreground mb-4">{errorMsg}</p>}
          <Link href={`/${slug}/menu`} className="inline-flex rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
            {t("common.backToMenu")}
          </Link>
        </div>
      </div>
    )
  }

  const stage = getStage(order.status, order.order_type ?? "dine_in")
  const isDelivery = order.order_type === "delivery"
  const isOutForDelivery = order.status === "out_for_delivery"
  const isReady = order.status === "ready" || isOutForDelivery || order.status === "completed"

  const distance = driverLat != null && driverLng != null && deliveryCoords
    ? haversineKm(driverLat, driverLng, deliveryCoords.lat, deliveryCoords.lng)
    : null
  const estimatedMin = distance != null ? Math.round(distance / 30 * 60) : null

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5">
        <div className="text-center pb-2">
          <h1 className="text-xl font-bold text-foreground">{t("track.orderNumber")} #{order.order_number ?? ""}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {order.customer_name}
            {order.table_number ? ` \u00b7 ${t("track.table")} ${order.table_number}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("track.total")}: <span className="font-semibold text-primary">{order.total} {cur}</span>
          </p>
        </div>

        {isOutForDelivery && (
          <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl animate-bounce">🛵</span>
                <div>
                  <p className="text-base font-bold text-purple-800 dark:text-purple-300">{t("track.outForDelivery")}</p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">{t("track.outForDeliverySub")}</p>
                </div>
              </div>
              {distance != null && estimatedMin != null && (
                <div className="flex items-center gap-4 text-xs text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl px-3 py-2">
                  <span>{t("track.distance")}: {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} ${t("track.km")}`}</span>
                  <span className="w-px h-4 bg-purple-300 dark:bg-purple-700" />
                  <span>{t("track.estimatedTime")}: ≈{estimatedMin} {t("track.min")}</span>
                </div>
              )}
            </div>
            {driverLat != null && driverLng != null && deliveryCoords && (
              <div className="w-full" style={{ height: "280px" }}>
                <DriverMap
                  driverLat={driverLat}
                  driverLng={driverLng}
                  customerLat={deliveryCoords.lat}
                  customerLng={deliveryCoords.lng}
                />
              </div>
            )}
          </div>
        )}

        <OrderStatusTracker
          currentStage={stage}
          orderType={(order.order_type as "dine_in" | "takeaway" | "delivery") ?? "dine_in"}
        />
        <OrderDetails items={items} />

        {isDelivery && order.delivery_address && (
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3 flex items-start gap-3">
            <span className="text-xl">📍</span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">{t("track.deliveryAddress")}</p>
              <p className="text-sm text-foreground">{order.delivery_address}</p>
            </div>
          </div>
        )}

        {isReady && (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-transparent px-4 py-3 border-b border-border/40">
              <h2 className="text-sm font-semibold text-foreground">{t("order.rateMeals")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("order.rateSubtitle")}</p>
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
                    <p className="text-xs text-emerald-500">{t("order.rated")}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-red-400 pb-4">
          {t("order.cancelNotice")}
        </p>

        <div className="text-center">
          <Link href={`/${slug}/menu`} className="inline-flex rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
            {t("track.backToMenu")}
          </Link>
        </div>
      </main>
    </div>
  )
}
