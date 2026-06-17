"use client"

import { useEffect, useState, useRef, useCallback, useMemo, use, startTransition } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { logger } from "@/lib/logger"
import { readTenantConfig } from "@/lib/use-slug"

const DriverMap = dynamic(() => import("@/components/driver-map"), { ssr: false })

interface DeliveryOrder {
  id: string
  order_number: number | null
  customer_name: string
  customer_phone: string | null
  delivery_address: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  driver_lat: number | null
  driver_lng: number | null
  status: string
  total: number
  payment_status: string
  delivery_men: { id: string; name: string; whatsapp_number: string } | null
}

export default function DriverManagePage({ params }: { params: Promise<{ order_id: string }> }) {
  const { order_id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<DeliveryOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [locationStatus, setLocationStatus] = useState<string>("")
  const watchIdRef = useRef<number | null>(null)
  const orderIdRef = useRef(order_id)

  const planType = useMemo(() => {
    const config = readTenantConfig()
    return config?.plan_type ?? "starter"
  }, [])

  const isElite = planType === "elite"

  useEffect(() => { orderIdRef.current = order_id }, [order_id])

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/delivery/manage/${orderIdRef.current}`)
      if (!res.ok) { startTransition(() => { setError("Order not found"); setLoading(false) }); return }
      const data = await res.json()
      startTransition(() => { setOrder(data); setLoading(false) })
    } catch {
      startTransition(() => { setError("Connection error"); setLoading(false) })
    }
  }, [])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const sendLocation = useCallback(async (lat: number, lng: number) => {
    try {
      await fetch(`/api/delivery/manage/${orderIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_lat: lat, driver_lng: lng }),
      })
    } catch (e) { logger.error("Failed to send location", e) }
  }, [])

  useEffect(() => {
    if (!order || order.status === "completed" || order.status === "cancelled") return
    if (!isElite) { startTransition(() => setLocationStatus("GPS tracking requires Elite plan")); return }
    if (!navigator.geolocation) { startTransition(() => setLocationStatus("GPS not available")); return }

    startTransition(() => setLocationStatus("Live tracking active"))

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setOrder(prev => prev ? { ...prev, driver_lat: latitude, driver_lng: longitude } : null)
        sendLocation(latitude, longitude)
      },
      () => setLocationStatus("Location unavailable"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )

    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [order, sendLocation, isElite])

  const handleDelivered = async () => {
    setConfirming(true)
    try {
      const res = await fetch(`/api/delivery/manage/${order_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })
      if (res.ok) {
        setOrder(prev => prev ? { ...prev, status: "completed" } : null)
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      } else { alert("Failed to confirm delivery") }
    } catch { alert("An error occurred, please try again") }
    finally { setConfirming(false) }
  }

  const accent = useMemo(() => ({
    from: "from-emerald-500",
    to: "to-emerald-600",
    light: "emerald-500/10",
    border: "emerald-500/20",
  }), [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-2xl bg-card border border-border">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-2xl bg-destructive/10 border border-destructive/20">
            <svg className="w-10 h-10 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">Invalid Link</h1>
          <p className="text-sm text-muted-foreground">This link is invalid or expired. Contact the restaurant owner.</p>
          <button onClick={() => router.push("/")}
            className="rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const isCompleted = order.status === "completed" || order.status === "cancelled"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs mb-3 font-medium tracking-wide">
            Delivery
          </div>
          <h1 className="text-xl font-bold tracking-tight">Order #{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">{order.customer_name}</p>
        </div>

        {isCompleted ? (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center">
            <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-full bg-emerald-500/20 mb-4">
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-emerald-400 mb-1">Delivered & Paid</h2>
            <p className="text-sm text-muted-foreground">This delivery has been completed.</p>
          </div>
        ) : (
          <>
            {isElite && order.delivery_lat != null && order.delivery_lng != null && (
              <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm" style={{ height: "280px" }}>
                <DriverMap
                  driverLat={order.driver_lat ?? order.delivery_lat}
                  driverLng={order.driver_lng ?? order.delivery_lng}
                  customerLat={order.delivery_lat}
                  customerLng={order.delivery_lng}
                />
              </div>
            )}

            {!isElite && (
              <div className="rounded-2xl bg-card border border-border/40 p-5 text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-muted/40 mb-3">
                  <svg className="w-6 h-6 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-foreground/80 mb-1">Live GPS tracking</h3>
                <p className="text-xs text-muted-foreground/60">Available on the Elite plan</p>
              </div>
            )}

            <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3 shadow-sm">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Info</h3>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Customer</span>
                <span className="text-sm font-medium">{order.customer_name}</span>
              </div>
              {order.customer_phone && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <a href={`tel:${order.customer_phone.replace(/[^0-9]/g, "")}`}
                    className="text-sm font-medium text-primary hover:underline">
                    {order.customer_phone}
                  </a>
                </div>
              )}
              {order.delivery_address && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <span className="text-sm font-medium text-right max-w-[60%]">{order.delivery_address}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-border/30">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-sm font-bold text-primary">{order.total.toLocaleString()} DZD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Payment</span>
                <span className={`text-sm font-medium ${order.payment_status === "paid" ? "text-emerald-400" : "text-amber-400"}`}>
                  {order.payment_status === "paid" ? "Paid" : "Cash on delivery"}
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
              {locationStatus === "Live tracking active" ? (
                <><span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>Live tracking active</>
              ) : (
                <span className="text-muted-foreground/40">{locationStatus || (isElite ? "Location shared" : "")}</span>
              )}
            </p>

            <button onClick={handleDelivered} disabled={confirming}
              className="w-full rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white py-4 text-base font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] shadow-lg shadow-emerald-500/20">
              {confirming ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Confirming...
                </span>
              ) : "Delivered & Paid"}
            </button>
          </>
        )}
      </main>
    </div>
  )
}