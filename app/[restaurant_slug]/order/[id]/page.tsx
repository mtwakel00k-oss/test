"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { use } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/tenant"
import { REALTIME_LISTEN_TYPES, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from "@supabase/realtime-js"
import { useSlug, readTenantConfig } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { logger } from "@/lib/logger"
import type { Order, OrderItem } from "@/lib/types"
import { OrderStatusTracker } from "@/components/order-status-tracker"
import { OrderDetails } from "@/components/order-details"
const RatingWidget = dynamic(() => import("@/components/RatingWidget"), { ssr: false })
import { CheckCircle, Clock, ChefHat, Bike, Sparkles, Package, MapPin, XCircle } from "lucide-react"

const LiveDriverMap = dynamic(() => import("@/components/live-driver-map"), { ssr: false })

function OrderSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="space-y-3 text-center">
          <div className="h-5 bg-muted rounded-lg w-1/3 mx-auto" />
          <div className="h-7 bg-muted rounded-xl w-1/2 mx-auto" />
          <div className="h-4 bg-muted rounded w-1/4 mx-auto" />
        </div>
        <div className="h-36 bg-muted rounded-2xl" />
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="h-24 bg-muted rounded-2xl" />
      </main>
    </div>
  )
}

const STATUS_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-5 h-5" />, color: "bg-success", label: "track.pending" },
  preparing: { icon: <ChefHat className="w-5 h-5" />, color: "bg-sky-500", label: "track.preparing" },
  ready: { icon: <Package className="w-5 h-5" />, color: "bg-emerald-500", label: "track.ready" },
  out_for_delivery: { icon: <Bike className="w-5 h-5" />, color: "bg-violet-500", label: "track.outForDelivery" },
  completed: { icon: <Sparkles className="w-5 h-5" />, color: "bg-neutral-400", label: "track.completed" },
  cancelled: { icon: <XCircle className="w-5 h-5" />, color: "bg-destructive", label: "track.cancelled" },
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
  const [hasLiveTracking, setHasLiveTracking] = useState(false)
  const [hasRatings, setHasRatings] = useState(false)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const planType = useMemo(() => {
    const config = readTenantConfig()
    return config?.plan_type ?? "starter"
  }, [])

  const isElite = planType === "elite"
  const isPro = planType === "pro"

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

          logger.error(`[OrderTracking] Failed to fetch order ${id}`, { status: res.status, body: errorBody, slug })

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

        logger.info(`[OrderTracking] Successfully loaded order ${id}`, { status: o.status, orderType: o.order_type, orderNumber: o.order_number, itemCount: o.items?.length })

        setOrder(o)
        setItems(o.items || [])
        if (o.delivery_lat != null && o.delivery_lng != null) {
          setDeliveryCoords({ lat: o.delivery_lat, lng: o.delivery_lng })
        }
        if (o.driver_lat != null && o.driver_lng != null) {
          setDriverLat(Number(o.driver_lat))
          setDriverLng(Number(o.driver_lng))
        }

        const trackingRes = await fetch(`/api/orders/${id}/tracking-access`, {
          headers: { "x-tenant-slug": slug },
        })
        if (!cancelled && trackingRes.ok) {
          const trackingData = await trackingRes.json()
          setHasLiveTracking(trackingData.hasLiveTracking === true)
          setHasRatings(trackingData.hasRatings === true)
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
    if (!hasLiveTracking) return

    const sub = supabase().channel(`order:${id}`)
      .on(REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        { event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE, schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload: { new?: Record<string, unknown> }) => {
          if (payload.new) {
            const updated = payload.new as unknown as Order
            setOrder((prev) =>
              prev ? { ...prev, ...updated, items: prev.items } : updated,
            )
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
  }, [id, hasLiveTracking])

  useEffect(() => {
    if (hasLiveTracking) return
    if (refreshRef.current) clearInterval(refreshRef.current)
    refreshRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${id}?public=true`, {
          headers: { "x-tenant-slug": slug },
        })
        if (!res.ok) return
        const data = await res.json()
        const o: Order = data.order || data
        if (!o || !o.id) return
        setOrder(o)
        setItems(o.items || [])
        if (o.delivery_lat != null && o.delivery_lng != null) {
          setDeliveryCoords({ lat: o.delivery_lat, lng: o.delivery_lng })
        }
        if (o.driver_lat != null && o.driver_lng != null) {
          setDriverLat(Number(o.driver_lat))
          setDriverLng(Number(o.driver_lng))
        }
      } catch (e) { logger.warn("Failed to poll order status for non-live tracking", e) }
    }, 60000)
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [id, slug, hasLiveTracking])

  useEffect(() => {
    if (!order || order.order_type !== "delivery") return
    if (!navigator.geolocation) return

    let cancelled = false
    let serverSent = false

    const updateCoords = (lat: number, lng: number) => {
      if (cancelled) return
      setDeliveryCoords({ lat, lng })
      if (!serverSent) {
        serverSent = true
        fetch(`/api/orders/${id}/customer-location`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        }).catch(() => {})
      }
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => updateCoords(pos.coords.latitude, pos.coords.longitude),
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => updateCoords(pos.coords.latitude, pos.coords.longitude),
          () => {},
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        )
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    )
  }, [order?.order_type, id])

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
        <div className="text-center max-w-sm">
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-5 rounded-2xl bg-muted/40 border border-border/30">
            <svg className="size-10 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12c0 4 4 4 8 0" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <h1 className="text-xl font-bold font-display text-foreground mb-1.5">{t("order.notFound")}</h1>
          {errorMsg && <p className="text-sm text-muted-foreground mb-1">{errorMsg}</p>}
          {process.env.NODE_ENV === "development" && errorDetail && (
            <p className="text-xs text-destructive/60 mb-6 break-all">{errorDetail}</p>
          )}
          <Link href={`/${slug}/menu`} className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/85 transition-all active:scale-[0.97] shadow-sm shadow-primary/20">
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

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <main className="w-full max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="text-center pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/40 text-xs font-medium text-muted-foreground mb-4">
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.color}`} />
            {t(statusInfo.label)}
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
            {t("track.orderNumber")} <span className="text-primary">#{order.order_number ?? ""}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {order.customer_name}
            {order.table_number ? ` · ${t("track.table")} ${order.table_number}` : ""}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            {t("track.total")}: <span className="font-semibold text-foreground">{order.total} {cur}</span>
          </p>
        </div>

        {isOutForDelivery && hasLiveTracking && (
          <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm">
            <LiveDriverMap
              driverLat={driverLat}
              driverLng={driverLng}
              customerLat={deliveryCoords?.lat ?? null}
              customerLng={deliveryCoords?.lng ?? null}
              lastUpdated={order.driver_location_updated_at ?? null}
            />
          </div>
        )}

        {isOutForDelivery && !hasLiveTracking && isElite && (
          <div className="rounded-2xl border border-border/40 bg-card/50 p-6 text-center">
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
                <svg className="size-7 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="rtl:text-right ltr:text-left">
                <p className="text-base font-semibold text-foreground">{t("track.outForDelivery")}</p>
                <p className="text-xs text-muted-foreground">{t("track.outForDeliverySub")}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-3">Loading live tracking...</p>
          </div>
        )}

        {isOutForDelivery && !hasLiveTracking && (isPro || (!isElite && !isPro)) && (
          <div className="rounded-2xl border border-border/40 bg-card/50 p-6 text-center">
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
                <svg className="size-7 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="rtl:text-right ltr:text-left">
                <p className="text-base font-semibold text-foreground">{t("track.outForDelivery")}</p>
                <p className="text-xs text-muted-foreground">{t("track.outForDeliverySub")}</p>
              </div>
            </div>
            {isPro && <p className="text-xs text-muted-foreground/60 mt-3">Live GPS tracking available on the Elite plan</p>}
          </div>
        )}

        <div className="rounded-2xl border border-border/30 bg-card shadow-sm">
          <OrderStatusTracker
            currentStage={stage}
            orderType={(order.order_type as "dine_in" | "takeaway" | "delivery") ?? "dine_in"}
          />
        </div>

        <div className="rounded-2xl border border-border/30 bg-card shadow-sm">
          <OrderDetails items={items} />
        </div>

        {isDelivery && order.delivery_address && (
          <div className="rounded-2xl border border-border/30 bg-card/50 px-5 py-4 flex items-start gap-3 shadow-sm">
            <MapPin className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">{t("track.deliveryAddress")}</p>
              <p className="text-sm text-foreground/80">{order.delivery_address}</p>
            </div>
          </div>
        )}

        {isReady && hasRatings && (
          <div className="rounded-2xl border border-border/30 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/30 bg-gradient-to-r from-primary-bg to-transparent">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold font-display text-foreground">{t("order.rateMeals")}</h2>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{t("order.rateSubtitle")}</p>
            </div>
            <div className="divide-y divide-border/20">
              {items.map(i => (
                <div key={i.id} className="px-5 py-4 space-y-2">
                  <p className="text-sm font-medium text-foreground/80">{i.product_name}</p>
                  {!ratedProducts.includes(Number(i.product_id)) ? (
                    <RatingWidget
                      productId={i.product_id}
                      onRated={() => setRatedProducts(prev => [...prev, Number(i.product_id)])}
                    />
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {t("order.rated")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/40">
          {t("order.cancelNotice")}
        </p>

        <div className="text-center pb-4">
          <Link href={`/${slug}/menu`} className="inline-flex items-center justify-center h-10 px-5 rounded-xl border border-border/40 bg-card/50 text-sm font-semibold text-foreground/70 hover:text-foreground hover:bg-card hover:border-border/60 transition-all active:scale-[0.97]">
            {t("track.backToMenu")}
          </Link>
        </div>
      </main>
    </div>
  )
}