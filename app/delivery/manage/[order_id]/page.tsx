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

  useEffect(() => {
    orderIdRef.current = order_id
  }, [order_id])

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

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const sendLocation = useCallback(async (lat: number, lng: number) => {
    try {
      await fetch(`/api/delivery/manage/${orderIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_lat: lat, driver_lng: lng }),
      })
    } catch (e) {
      logger.error("Failed to send location", e)
    }
  }, [])

  useEffect(() => {
    if (!order || order.status === "completed" || order.status === "cancelled") return

    if (!isElite) {
      startTransition(() => setLocationStatus("📍 GPS tracking requires Elite plan"))
      return
    }

    if (!navigator.geolocation) {
      startTransition(() => setLocationStatus("📍 GPS not available"))
      return
    }

    startTransition(() => setLocationStatus("📍 Live tracking active"))

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setOrder(prev => prev ? { ...prev, driver_lat: latitude, driver_lng: longitude } : null)
        sendLocation(latitude, longitude)
      },
      () => { setLocationStatus("📍 Location unavailable") },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
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
      } else {
        alert("Failed to confirm delivery")
      }
    } catch {
      alert("An error occurred, please try again")
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🛵</div>
          <h1 className="text-xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-sm text-zinc-400 mb-6">This link is invalid or expired. Contact the restaurant owner.</p>
          <button onClick={() => router.push("/")}
            className="rounded-xl bg-amber-500 text-white px-6 py-2.5 text-sm font-bold hover:bg-amber-400 transition-all">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const isCompleted = order.status === "completed" || order.status === "cancelled"

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs mb-3">
            🛵 Delivery
          </div>
          <h1 className="text-xl font-bold">Order #{order.order_number}</h1>
          <p className="text-sm text-zinc-400">{order.customer_name}</p>
        </div>

        {isCompleted ? (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-lg font-bold text-emerald-400 mb-1">Delivered & Paid</h2>
            <p className="text-sm text-zinc-400">This delivery has been completed.</p>
          </div>
        ) : (
          <>
            {isElite && order.delivery_lat != null && order.delivery_lng != null && (
              <div className="rounded-2xl overflow-hidden border border-zinc-800" style={{ height: "280px" }}>
                <DriverMap
                  driverLat={order.driver_lat ?? order.delivery_lat}
                  driverLng={order.driver_lng ?? order.delivery_lng}
                  customerLat={order.delivery_lat}
                  customerLng={order.delivery_lng}
                />
              </div>
            )}

            {!isElite && (
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 text-center">
                <div className="text-4xl mb-3">📍</div>
                <h3 className="text-sm font-semibold text-zinc-300 mb-1">Live GPS tracking</h3>
                <p className="text-xs text-zinc-500">Available on the Elite plan</p>
              </div>
            )}

            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Order Info</h3>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Customer</span>
                <span className="text-sm font-medium">{order.customer_name}</span>
              </div>
              {order.customer_phone && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Phone</span>
                  <a href={`tel:${order.customer_phone.replace(/[^0-9]/g, "")}`}
                    className="text-sm font-medium text-amber-400 hover:underline">
                    {order.customer_phone}
                  </a>
                </div>
              )}
              {order.delivery_address && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Address</span>
                  <span className="text-sm font-medium text-right max-w-[60%]">{order.delivery_address}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Total</span>
                <span className="text-sm font-bold text-amber-400">{order.total} DZD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Payment</span>
                <span className={`text-sm font-medium ${order.payment_status === "paid" ? "text-emerald-400" : "text-amber-400"}`}>
                  {order.payment_status === "paid" ? "Paid" : "Cash on delivery"}
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-zinc-500 flex items-center justify-center gap-1">
              <span>{locationStatus || (isElite ? "📍 Location shared" : "")}</span>
            </p>

            <button onClick={handleDelivered} disabled={confirming}
              className="w-full rounded-xl bg-emerald-600 text-white py-4 text-base font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-emerald-600/20">
              {confirming ? "Confirming..." : "Delivered & Paid"}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
