"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { t, type Lang } from "@/lib/translations"

const LANG: Lang = "ar"

interface DriverOrder {
  id: string
  order_number: number | null
  customer_name: string
  customer_phone: string | null
  delivery_address: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  status: string
  total: number
  created_at: string
}

interface DriverData {
  driver: { id: string; name: string }
  restaurant: string
  slug: string
  orders: DriverOrder[]
}

export default function DriverPage() {
  const params = useParams()
  const token = params?.id as string

  const [data, setData] = useState<DriverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [delivering, setDelivering] = useState<string | null>(null)
  const [locationActive, setLocationActive] = useState(false)
  const watchIdRef = useRef<number | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/driver/${token}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: t("driver.unknownError", LANG) }))
        setError(err.error || t("driver.invalidLink", LANG))
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setError(t("driver.connectionError", LANG))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30_000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  useEffect(() => {
    if (!data?.orders.length) return
    const activeOrders = data.orders.filter(o => o.status === "out_for_delivery" || o.status === "ready")
    if (!activeOrders.length) return

    if (!navigator.geolocation) return

    const sendLocation = (lat: number, lng: number) => {
      for (const order of activeOrders) {
        fetch(`/api/driver/${token}/location`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: order.id, lat, lng }),
        }).catch(() => {})
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationActive(true)
        sendLocation(pos.coords.latitude, pos.coords.longitude)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [data?.orders, token])

  const markDelivered = useCallback(async (orderId: string) => {
    setDelivering(orderId)
    try {
      const res = await fetch(`/api/driver/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || t("driver.deliveryFailed", LANG))
        return
      }
      setData(prev => prev ? { ...prev, orders: prev.orders.filter(o => o.id !== orderId) } : prev)
    } catch {
      alert(t("driver.tryAgain", LANG))
    } finally {
      setDelivering(null)
    }
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto">
            <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{t("driver.loading", LANG)}</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-background">
        <div className="max-w-xs text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-2xl bg-muted/30">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-lg font-bold text-foreground">{t("driver.invalidLink", LANG)}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {error ?? t("driver.invalidLinkSub", LANG)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between max-w-lg px-4 py-3 mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <span className="text-xl">🛵</span>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{data.restaurant}</p>
              <h1 className="text-sm font-bold text-foreground">{data.driver.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {locationActive && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20" title={t("driver.locationShared", LANG)}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{t("driver.locationShared", LANG)}</span>
              </div>
            )}
            <button onClick={fetchOrders}
              className="flex items-center justify-center w-9 h-9 transition-colors rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5"
              title={t("driver.refresh", LANG)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg p-4 mx-auto space-y-4">
        {data.orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
              <span className="text-3xl">✅</span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground">{t("driver.noOrders", LANG)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("driver.noOrdersSub", LANG)}</p>
            </div>
          </div>
        ) : (
          data.orders.map((order) => {
            const isDelivering = delivering === order.id
            const hasCoords = order.delivery_lat != null && order.delivery_lng != null
            const mapsUrl = hasCoords ? `https://maps.google.com/?q=${order.delivery_lat},${order.delivery_lng}` : null
            const telUri = order.customer_phone
              ? `tel:${order.customer_phone.replace(/\D/g, "")}`
              : null

            return (
              <div key={order.id} className="overflow-hidden bg-card border border-border rounded-xl shadow-sm animate-fade-in-up">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 border rounded-full bg-primary/5 border-primary/10">
                      <span className="text-base">👤</span>
                    </div>
                    <div>
                      <span className="text-base font-bold text-foreground">{order.customer_name}</span>
                      {order.order_number && (
                        <span className="block text-[11px] text-muted-foreground">{t("driver.orderHash", LANG)}{order.order_number}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary tabular-nums">
                      {order.total.toLocaleString()} {t("track.currency", LANG)}
                    </span>
                    <p className="text-[10px] text-muted-foreground">{t("driver.cashOnDelivery", LANG)}</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {order.delivery_address && (
                    <div className="flex items-start gap-2.5 p-3 text-sm rounded-xl bg-muted/20">
                      <span className="text-lg leading-none shrink-0">📍</span>
                      <span className="text-foreground">{order.delivery_address}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {mapsUrl ? (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 active:scale-[0.97]">
                        {t("driver.openMap", LANG)}
                      </a>
                    ) : (
                      <div className="flex items-center justify-center py-3 text-sm border rounded-xl bg-muted/20 border-border text-muted-foreground opacity-50">
                        {t("driver.noLocation", LANG)}
                      </div>
                    )}
                    {telUri ? (
                      <a href={telUri}
                        className="flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 active:scale-[0.97]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {t("driver.call", LANG)}
                      </a>
                    ) : (
                      <div className="flex items-center justify-center py-3 text-sm border rounded-xl bg-muted/20 border-border text-muted-foreground opacity-50">
                        {t("driver.noPhone", LANG)}
                      </div>
                    )}
                  </div>

                  <button onClick={() => markDelivered(order.id)} disabled={isDelivering}
                    className="flex items-center justify-center w-full gap-2 py-4 text-base font-bold transition-all rounded-xl bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm">
                    {isDelivering ? (
                      <>
                        <div className="w-5 h-5 border-2 rounded-full border-primary-foreground border-t-transparent animate-spin" />
                        {t("driver.confirming", LANG)}
                      </>
                    ) : (
                      <>
                        <span className="text-xl">✅</span>
                        {t("driver.delivered", LANG)}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
