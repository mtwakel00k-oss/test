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
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [locationActive, setLocationActive] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastSentRef = useRef<number>(0)

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

    if (!navigator.geolocation) {
      setLocationError(t("driver.noGps", LANG))
      return
    }

    const sendLocation = (lat: number, lng: number) => {
      const now = Date.now()
      if (now - lastSentRef.current < 10000) return
      lastSentRef.current = now
      for (const order of activeOrders) {
        fetch(`/api/driver/${token}/location`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: order.id, lat, lng }),
        }).catch(() => {})
      }
    }

    const errorMessages: Record<number, string> = {
      1: t("driver.permissionDenied", LANG),
      2: t("driver.positionUnavailable", LANG),
      3: t("driver.timeoutError", LANG),
    }

    let highAccuracyAttempt = true

    const startWatching = (highAccuracy: boolean) => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setLocationActive(true)
          setLocationError(null)
          sendLocation(pos.coords.latitude, pos.coords.longitude)
        },
        (err) => {
          const code = err.code
          if (code === 3 && highAccuracy) {
            highAccuracyAttempt = false
            startWatching(false)
            return
          }
          setLocationActive(false)
          setLocationError(errorMessages[code] || err.message)
        },
        { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 0 },
      )
    }

    startWatching(true)

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10">
            <span className="text-3xl">🛵</span>
          </div>
          <p className="text-sm text-white/50">{t("driver.loading", LANG)}</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-xs text-center space-y-4">
          <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-full bg-white/5 border border-white/10">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-xl font-black text-white">{t("driver.invalidLink", LANG)}</h1>
          <p className="text-sm leading-relaxed text-white/50">
            {error ?? t("driver.invalidLinkSub", LANG)}
          </p>
          <button onClick={fetchOrders} className="inline-flex rounded-xl bg-amber-500 text-white px-6 py-3 text-sm font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95">
            {t("driver.refresh", LANG)}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between max-w-lg px-4 py-3 mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
              <span className="text-lg">🛵</span>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{data.restaurant}</p>
              <h1 className="text-base font-bold text-white">{data.driver.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {locationActive ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">{t("driver.locationShared", LANG)}</span>
              </div>
            ) : locationError ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 max-w-[140px]">
                <span className="text-[10px] text-red-400 font-bold leading-tight">{locationError}</span>
              </div>
            ) : null}
            <button onClick={fetchOrders}
              className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 text-white/50 transition-all active:scale-90">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg p-4 mx-auto space-y-4">
        {data.orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-4xl">✅</span>
            </div>
            <div>
              <p className="text-xl font-black text-white">{t("driver.noOrders", LANG)}</p>
              <p className="mt-1 text-sm text-white/40">{t("driver.noOrdersSub", LANG)}</p>
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
              <div key={order.id} className="overflow-hidden bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/20">
                {/* Customer header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-lg">
                      👤
                    </div>
                    <div>
                      <span className="text-lg font-black text-white">{order.customer_name}</span>
                      {order.order_number && (
                        <span className="block text-xs text-white/40 font-mono">{t("driver.orderHash", LANG)}{order.order_number}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-xl font-black text-amber-400 tabular-nums">
                      {order.total.toLocaleString()} {t("track.currency", LANG)}
                    </span>
                    <p className="text-[10px] text-white/30">{t("driver.cashOnDelivery", LANG)}</p>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {order.delivery_address && (
                    <div className="flex items-start gap-3 p-4 text-sm rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-xl leading-none shrink-0">📍</span>
                      <span className="text-white/80 leading-relaxed">{order.delivery_address}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {mapsUrl ? (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 active:scale-[0.97]">
                        🗺️ {t("driver.openMap", LANG)}
                      </a>
                    ) : (
                      <div className="flex items-center justify-center py-4 text-sm rounded-xl bg-white/[0.03] border border-white/10 text-white/30">
                        {t("driver.noLocation", LANG)}
                      </div>
                    )}
                    {telUri ? (
                      <a href={telUri}
                        className="flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.97]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {t("driver.call", LANG)}
                      </a>
                    ) : (
                      <div className="flex items-center justify-center py-4 text-sm rounded-xl bg-white/[0.03] border border-white/10 text-white/30">
                        {t("driver.noPhone", LANG)}
                      </div>
                    )}
                  </div>

                  <button onClick={() => setConfirmId(order.id)} disabled={isDelivering}
                    className="flex items-center justify-center w-full gap-2 py-5 text-base font-black transition-all rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-emerald-500/20 min-h-[56px]">
                    {isDelivering ? (
                      <>
                        <div className="w-5 h-5 border-2 rounded-full border-white border-t-transparent animate-spin" />
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
      {/* Confirmation Dialog */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmId(null)}>
          <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-3xl">✅</span>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{t("driver.confirmTitle", LANG)}</p>
                <p className="text-sm text-white/50 mt-1">{t("driver.confirmSub", LANG)}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmId(null)} autoFocus
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-white/5 text-white hover:bg-white/10 transition-all active:scale-[0.98]">
                {t("driver.cancel", LANG) || "إلغاء"}
              </button>
              <button onClick={() => { setConfirmId(null); markDelivered(confirmId) }}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:brightness-110 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20">
                {t("driver.confirmDeliver", LANG) || "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
