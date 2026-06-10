"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/tenant"
import { useSlug, readTenantConfig } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { logger } from "@/lib/logger"
import type { Order, OrderItem } from "@/lib/types"
import { OrderStatusTracker } from "@/components/order-status-tracker"
import { OrderDetails } from "@/components/order-details"
import RatingWidget from "@/components/RatingWidget"
import { CheckCircle, Clock, ChefHat, Bike, Sparkles } from "lucide-react"

const DriverMap = dynamic(() => import("@/components/driver-map"), { ssr: false })

function OrderSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5 animate-pulse">
        <div className="space-y-2 text-center">
          <div className="h-6 bg-zinc-800 rounded-lg w-1/2 mx-auto" />
          <div className="h-4 bg-zinc-800 rounded w-1/3 mx-auto" />
        </div>
        <div className="h-32 bg-zinc-800 rounded-2xl" />
        <div className="h-40 bg-zinc-800 rounded-2xl" />
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

const STATUS_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-5 h-5" />, color: "bg-amber-500", label: "track.pending" },
  preparing: { icon: <ChefHat className="w-5 h-5" />, color: "bg-sky-500", label: "track.preparing" },
  ready: { icon: <CheckCircle className="w-5 h-5" />, color: "bg-emerald-500", label: "track.ready" },
  out_for_delivery: { icon: <Bike className="w-5 h-5" />, color: "bg-violet-500", label: "track.outForDelivery" },
  completed: { icon: <Sparkles className="w-5 h-5" />, color: "bg-neutral-400", label: "track.completed" },
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
  const [errorDetail, setErrorDetail] = useState("")
  const [ratedProducts, setRatedProducts] = useState<number[]>([])
  const [driverLat, setDriverLat] = useState<number | null>(null)
  const [driverLng, setDriverLng] = useState<number | null>(null)
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [planType, setPlanType] = useState<string>("starter")

  useEffect(() => {
    const config = readTenantConfig()
    if (config?.plan_type) setPlanType(config.plan_type)
  }, [])

  /**
   * Fetch order with detailed error logging.
   *
   * Logs to Vercel Logs:
   *  - The exact HTTP status returned
   *  - Whether the error is 404 (not found), 403 (RLS), or 500 (server)
   *  - The raw response body for debugging
   *  - Whether the slug matched the tenant
   */
  useEffect(() => {
    let cancelled = false

    async function load() {
      logger.info(`[OrderTracking] Fetching order ${id} for slug "${slug}"`)

      try {
        const res = await fetch(`/api/orders/${id}`, {
          headers: {
            "Content-Type": "application/json",
            "x-tenant-slug": slug,
          },
        })
        if (cancelled) return

        logger.info(`[OrderTracking] Response status: ${res.status} for order ${id}`)

        if (!res.ok) {
          let errorBody = ""
          try {
            const json = await res.json()
            errorBody = json.error || JSON.stringify(json)
          } catch {
            errorBody = await res.text().catch(() => "Unable to read response body")
          }

          logger.error(`[OrderTracking] Failed to fetch order ${id}`, {
            status: res.status,
            body: errorBody,
            slug,
          })

          if (res.status === 404) {
            setErrorMsg(t("order.notFound"))
            setErrorDetail(`API returned 404 — order ${id} does not exist in tenant "${slug}"`)
          } else if (res.status === 403) {
            setErrorMsg(t("order.notFound"))
            setErrorDetail(`API returned 403 — RLS policy may be blocking SELECT for anonymous users on tenant "${slug}"`)
          } else {
            setErrorMsg(`${t("common.unknownError")} (${res.status})`)
            setErrorDetail(`API returned ${res.status}: ${errorBody}`)
          }

          setLoading(false)
          return
        }

        const o: Order = await res.json()

        if (!o || !o.id) {
          logger.warn(`[OrderTracking] Empty response body for order ${id}`)
          setErrorMsg(t("order.notFound"))
          setErrorDetail("API returned 200 but response body was empty or missing id")
          setLoading(false)
          return
        }

        logger.info(`[OrderTracking] Successfully loaded order ${id}`, {
          status: o.status,
          orderType: o.order_type,
          orderNumber: o.order_number,
          itemCount: o.items?.length,
        })

        setOrder(o)
        setItems(o.items || [])
        if (o.delivery_lat != null && o.delivery_lng != null) {
          setDeliveryCoords({ lat: o.delivery_lat, lng: o.delivery_lng })
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        logger.error(`[OrderTracking] Network/parse error for order ${id}`, { error: msg })
        setErrorMsg(t("common.unknownError"))
        setErrorDetail(`Network error: ${msg}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id, slug, t])

  useEffect(() => {
    const sub = supabase().channel(`order:${id}`)
      .on("postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload: { new?: Record<string, unknown> }) => {
          if (payload.new) {
            const updated = payload.new as unknown as Order
            logger.info(`[OrderTracking] Realtime update for order ${id}`, { status: updated.status })
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
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-6 opacity-80">🍔</div>
          <h1 className="text-2xl font-black text-white mb-2">{t("order.notFound")}</h1>
          {errorMsg && <p className="text-sm text-white/50 mb-2">{errorMsg}</p>}
          {process.env.NODE_ENV === "development" && errorDetail && (
            <p className="text-xs text-rose-400/60 mb-6 break-all">{errorDetail}</p>
          )}
          <Link href={`/${slug}/menu`} className="inline-flex rounded-xl bg-amber-500 text-white px-7 py-3 text-sm font-bold hover:bg-amber-400 transition-all active:scale-95 shadow-lg shadow-amber-500/20">
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
  const statusInfo = STATUS_ICONS[order.status] || STATUS_ICONS.pending

  const distance = driverLat != null && driverLng != null && deliveryCoords
    ? haversineKm(driverLat, driverLng, deliveryCoords.lat, deliveryCoords.lng)
    : null
  const estimatedMin = distance != null ? Math.round(distance / 30 * 60) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white" dir={dir}>
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5">
        <div className="text-center pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs mb-3">
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.color}`} />
            {t(statusInfo.label)}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{t("track.orderNumber")} <span className="text-amber-400">#{order.order_number ?? ""}</span></h1>
          <p className="text-sm text-white/50 mt-1">
            {order.customer_name}
            {order.table_number ? ` · ${t("track.table")} ${order.table_number}` : ""}
          </p>
          <p className="text-xs text-white/30 mt-2">
            {t("track.total")}: <span className="font-bold text-amber-400">{order.total} {cur}</span>
          </p>
        </div>

        {isOutForDelivery && (
          <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 overflow-hidden shadow-xl shadow-violet-500/5">
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/20">
                  <span className="text-3xl animate-bounce">🛵</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{t("track.outForDelivery")}</p>
                  <p className="text-sm text-violet-300/70">{t("track.outForDeliverySub")}</p>
                </div>
              </div>
              {distance != null && estimatedMin != null && (
                <div className="mt-4 flex items-center gap-4 text-xs bg-violet-500/10 border border-violet-500/10 rounded-xl px-4 py-3">
                  <span className="text-violet-300">
                    📍 {t("track.distance")}: <strong className="text-white">{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} ${t("track.km")}`}</strong>
                  </span>
                  <span className="w-px h-5 bg-violet-500/20" />
                  <span className="text-violet-300">
                    ⏱ {t("track.estimatedTime")}: <strong className="text-white">≈{estimatedMin} {t("track.min")}</strong>
                  </span>
                </div>
              )}
            </div>
            {driverLat != null && driverLng != null && deliveryCoords && (
              planType === "starter" ? (
                <div className="w-full border-t border-violet-500/10 px-5 py-4 text-center">
                  <p className="text-sm text-violet-300/70">📍 Driver location available</p>
                  <p className="text-xs text-zinc-500 mt-1">Upgrade to Pro for live tracking map</p>
                </div>
              ) : (
                <div className="w-full border-t border-violet-500/10" style={{ height: "260px" }}>
                  <DriverMap
                    driverLat={driverLat}
                    driverLng={driverLng}
                    customerLat={deliveryCoords.lat}
                    customerLng={deliveryCoords.lng}
                  />
                </div>
              )
            )}
          </div>
        )}

        <OrderStatusTracker
          currentStage={stage}
          orderType={(order.order_type as "dine_in" | "takeaway" | "delivery") ?? "dine_in"}
        />
        <OrderDetails items={items} />

        {isDelivery && order.delivery_address && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 flex items-start gap-3">
            <span className="text-xl leading-none">📍</span>
            <div>
              <p className="text-xs font-semibold text-white/40 mb-0.5">{t("track.deliveryAddress")}</p>
              <p className="text-sm text-white/80">{order.delivery_address}</p>
            </div>
          </div>
        )}

        {isReady && (
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
                  {!ratedProducts.includes(Number(i.product_id)) ? (
                    <RatingWidget
                      productId={i.product_id}
                      onRated={() => setRatedProducts(prev => [...prev, Number(i.product_id)])}
                    />
                  ) : (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {t("order.rated")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-rose-500/50 pb-2">
          {t("order.cancelNotice")}
        </p>

        <div className="text-center pb-4">
          <Link href={`/${slug}/menu`} className="inline-flex rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 px-6 py-2.5 text-sm font-bold hover:bg-amber-500/20 transition-all active:scale-95">
            {t("track.backToMenu")}
          </Link>
        </div>
      </main>
    </div>
  )
}
