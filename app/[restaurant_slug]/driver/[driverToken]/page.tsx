"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"

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
  const token = params?.driverToken as string

  const [data, setData] = useState<DriverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [delivering, setDelivering] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/driver/${token}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "خطأ غير معروف" }))
        setError(err.error || "رابط غير صالح")
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setError("تعذر الاتصال")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30_000)
    return () => clearInterval(interval)
  }, [fetchOrders])

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
        alert(err.error || "فشل تأكيد التوصيل")
        return
      }
      setData(prev => prev ? { ...prev, orders: prev.orders.filter(o => o.id !== orderId) } : prev)
    } catch {
      alert("حدث خطأ، حاول مرة أخرى")
    } finally {
      setDelivering(null)
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-lg font-bold text-foreground">رابط غير صالح</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error ?? "هذا الرابط غير صالح أو انتهت صلاحيته. تواصل مع صاحب المطعم."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10 backdrop-blur-sm bg-card/90">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-xl">🛵</span>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{data.restaurant}</p>
              <h1 className="text-sm font-bold text-foreground">{data.driver.name}</h1>
            </div>
          </div>
          <button onClick={fetchOrders}
            className="h-9 w-9 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
            title="تحديث">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {data.orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <span className="text-3xl">✅</span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground">لا توجد طلبات نشطة</p>
              <p className="text-sm text-muted-foreground mt-1">سيظهر هنا أي طلب يخصص لك</p>
            </div>
          </div>
        ) : (
          data.orders.map((order) => {
            const isDelivering = delivering === order.id
            const hasCoords = order.delivery_lat != null && order.delivery_lng != null
            const mapsUrl = hasCoords ? `https://maps.google.com/?q=${order.delivery_lat},${order.delivery_lng}` : null
            const waUrl = order.customer_phone
              ? `https://wa.me/${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`مرحباً ${order.customer_name}، أنا السائق ${data.driver.name}، وأنا في الطريق إليك 🛵`)}`
              : null

            return (
              <div key={order.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-muted/10 flex items-center justify-between border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                      <span className="text-base">👤</span>
                    </div>
                    <div>
                      <span className="text-base font-bold text-foreground">{order.customer_name}</span>
                      {order.order_number && (
                        <span className="text-[11px] text-muted-foreground block">طلب #{order.order_number}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary tabular-nums">
                      {order.total.toLocaleString()} د.ج
                    </span>
                    <p className="text-[10px] text-muted-foreground">الدفع عند الاستلام</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {order.delivery_address && (
                    <div className="flex items-start gap-2.5 text-sm bg-muted/20 rounded-xl p-3">
                      <span className="text-lg leading-none shrink-0">📍</span>
                      <span className="text-foreground">{order.delivery_address}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {mapsUrl ? (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 py-3 text-sm font-semibold hover:bg-blue-100 transition-colors active:scale-[0.97]">
                        🗺️ فتح الخريطة
                      </a>
                    ) : (
                      <div className="flex items-center justify-center rounded-xl bg-muted/20 border border-border text-muted-foreground py-3 text-sm opacity-50">
                        🗺️ لا يوجد موقع
                      </div>
                    )}
                    {waUrl ? (
                      <a href={waUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 py-3 text-sm font-semibold hover:bg-green-100 transition-colors active:scale-[0.97]">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        </svg>
                        واتساب
                      </a>
                    ) : (
                      <div className="flex items-center justify-center rounded-xl bg-muted/20 border border-border text-muted-foreground py-3 text-sm opacity-50">
                        لا يوجد رقم
                      </div>
                    )}
                  </div>

                  <button onClick={() => markDelivered(order.id)} disabled={isDelivering}
                    className="w-full rounded-xl bg-primary text-primary-foreground py-4 text-base font-bold hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm">
                    {isDelivering ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        جاري التأكيد...
                      </>
                    ) : (
                      <>
                        <span className="text-xl">✅</span>
                        وصّلت وقبضت
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
