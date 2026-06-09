"use client"

import { useState, useCallback, useEffect } from "react"
import { MapPin, Lock, CheckCircle2, Loader2 } from "lucide-react"
import { getPrice } from "@/lib/types"
import type { CartItem, OrderType } from "@/lib/types"
import { logger } from "@/lib/logger"
import { useTranslation } from "@/lib/use-translation"
import { fetchApi } from "@/lib/tenant"

interface CheckoutModalProps {
  items: CartItem[]
  total: number
  onClose: () => void
  onSuccess: (orderId: string, orderNumber?: number) => void
  onClear: () => void
  initialOrderType?: OrderType
  initialDeliveryPhone?: string
  initialCoords?: { lat: number; lng: number } | null
}

interface FormData {
  name: string
  table: string
  phone: string
  deliveryAddress: string
}

interface FormErrors {
  name?: string
  table?: string
  phone?: string
  general?: string
  location?: string
}

const GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse"

export function CheckoutModal({
  items,
  total,
  onClose,
  onSuccess,
  onClear,
  initialOrderType = "dine_in",
  initialDeliveryPhone = "",
  initialCoords = null,
}: CheckoutModalProps) {
  const { t, lang } = useTranslation()

  const [orderType, setOrderType] = useState<OrderType>(initialOrderType)
  const [form, setForm] = useState<FormData>({ name: "", table: "", phone: initialDeliveryPhone, deliveryAddress: "" })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [orderNumber, setOrderNumber] = useState<number | undefined>(undefined)
  const [orderId, setOrderId] = useState<string | undefined>(undefined)

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initialCoords)
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">(
    initialCoords ? "success" : "idle"
  )

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("error")
      return
    }
    setGeoStatus("loading")
    Promise.race([
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 20000)),
    ])
      .then(async (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lng: longitude })
        setGeoStatus("success")
        try {
          const res = await fetch(
            `${GEOCODE_URL}?format=json&lat=${latitude}&lon=${longitude}&accept-language=${lang === "ar" ? "ar" : lang}`,
            { headers: { "User-Agent": "BurgerHouseApp/1.0" } }
          )
          const data = await res.json()
          if (data.display_name) {
            setForm(f => ({ ...f, deliveryAddress: data.display_name }))
          }
        } catch {
          // reverse geocode failed — coordinates are enough
        }
      })
      .catch(() => {
        setGeoStatus("error")
      })
  }, [lang])

  useEffect(() => {
    if (orderType === "delivery") {
      getLocation()
    }
  }, [orderType, getLocation])

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = t("menu.enterName")
    if (orderType === "dine_in") {
      const tn = parseInt(form.table, 10)
      if (!form.table || isNaN(tn) || tn < 1) e.table = t("menu.enterTable")
    }
    if (orderType === "delivery") {
      // phone is optional for delivery
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || submitting) return
    setSubmitting(true)
    setErrors({})
    try {
      const payload = items
        .filter(i => i.product.is_available !== false)
        .map(i => ({
          product_id: i.product.id,
          product_name: i.product.name,
          size: i.size,
          sauce: i.sauceId,
          quantity: i.quantity,
          unit_price: getPrice(i.product, i.size, i.sauceId),
        }))

      const body: Record<string, unknown> = {
        customer_name: form.name.trim(),
        order_type: orderType,
        items: payload,
        idempotency_key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }
      if (orderType === "dine_in") body.table_number = parseInt(form.table, 10)
      if (orderType === "delivery") {
        body.customer_phone = form.phone.trim()
        body.delivery_address = form.deliveryAddress.trim() || null
        if (coords) {
          body.delivery_lat = coords.lat
          body.delivery_lng = coords.lng
        }
      }

      let lastErr: unknown
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetchApi("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            throw new Error(data.error === "Table is occupied" ? t("pos.tableOccupied") : (data.error || t("menu.orderFailed")))
          }
          onClear()
          setOrderId(data.id)
          setOrderNumber(data.orderNumber)
          setSubmitted(true)
          setTimeout(() => { onSuccess(data.id, data.orderNumber) }, 2500)
          return
        } catch (e) {
          lastErr = e
          if (attempt < 2) {
            const delay = Math.min(1000 * 2 ** attempt, 3000)
            await new Promise((r) => setTimeout(r, delay))
          }
        }
      }
      throw lastErr
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("menu.somethingWrong")
      setErrors({ general: msg })
      logger.error("Checkout failed: " + msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/50" />
        <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-8 shadow-xl text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t("menu.orderConfirmed")}</h2>
          <p className="text-muted-foreground mb-1">{t("menu.orderNumber")} <span className="font-bold text-foreground text-lg">#{orderNumber}</span></p>
          <p className="text-sm text-muted-foreground mb-6">{t("menu.willPrepare")}</p>
          <button onClick={() => { if (orderId) onSuccess(orderId, orderNumber) }}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
            {t("menu.trackOrder")}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t("menu.confirmOrder")}</h2>

        <div className="flex gap-2 mb-5 bg-secondary rounded-lg p-1">
          <button type="button"
            onClick={() => { setOrderType("dine_in"); setErrors({}) }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              orderType === "dine_in" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t("menu.tableDineIn")}
          </button>
          <button type="button"
            onClick={() => { setOrderType("takeaway"); setErrors({}) }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              orderType === "takeaway" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t("menu.takeaway")}
          </button>
          <button type="button"
            onClick={() => { setOrderType("delivery"); setErrors({}) }}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
              orderType === "delivery" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            🛵 {t("pos.delivery")}
          </button>
        </div>

        <div className="mb-4 max-h-40 space-y-2 overflow-y-auto" role="list">
          {items.map(i => {
            const k = `${i.product.id}_${i.size}_${i.sauceId}`
            const sauceLabel = i.sauceId === 1 ? "Sauce Tomate" : i.sauceId === 2 ? "Crème Fraîche" : null
            return (
              <div key={k} className="flex items-center justify-between text-sm" role="listitem">
                <span className="text-muted-foreground">{i.product.name}{i.size !== "UNIQUE" ? ` (${i.size})` : ""}{sauceLabel ? ` / ${sauceLabel}` : ""} x{i.quantity}</span>
                <span className="text-foreground font-medium">{getPrice(i.product, i.size, i.sauceId) * i.quantity} {lang === "ar" ? "د.ج" : "DA"}</span>
              </div>
            )
          })}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="font-semibold text-foreground">{t("pos.total")}</span>
            <span className="font-bold text-lg text-foreground">{total} {lang === "ar" ? "د.ج" : "DA"}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <input
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              placeholder={t("menu.name")} disabled={submitting} autoFocus />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          {orderType === "delivery" && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <MapPin className="w-4 h-4" />
                <span>معلومات التوصيل</span>
              </div>
              <textarea
                value={form.deliveryAddress}
                onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 resize-none"
                placeholder="أدخل عنوان التوصيل (مثال: حي السلام، شارع 01، رقم 15)"
                disabled={submitting} rows={2} />
              <input type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()}
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                placeholder="رقم الهاتف (مثال: 0555123456)" disabled={submitting} />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              <button
                type="button"
                onClick={getLocation}
                disabled={geoStatus === "loading"}
                className={`w-full flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  geoStatus === "success"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : geoStatus === "error"
                      ? "border-destructive/30 bg-destructive/5 text-destructive"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {geoStatus === "loading" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : geoStatus === "success" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                {geoStatus === "idle" && "📍 حدد موقعي تلقائياً"}
                {geoStatus === "loading" && "جاري تحديد الموقع..."}
                {geoStatus === "success" && "✓ تم تحديد الموقع"}
                {geoStatus === "error" && "فشل تحديد الموقع — اكتب العنوان يدوياً"}
              </button>
            </div>
          )}

          {orderType === "dine_in" && (
            <div>
              <input type="number" min="1" value={form.table}
                onChange={e => setForm(f => ({ ...f, table: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                placeholder={t("pos.tableNumber")} disabled={submitting} />
              {errors.table && <p className="text-xs text-destructive mt-1">{errors.table}</p>}
            </div>
          )}

          {orderType === "takeaway" && (
            <div>
              <input type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                placeholder="رقم الهاتف (اختياري)" disabled={submitting} />
            </div>
          )}
        </div>

        {errors.general && <p className="text-sm text-destructive mt-2">{errors.general}</p>}

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50 transition-colors">
            {t("common.cancel")}
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {submitting ? t("menu.submitting") : t("menu.confirmOrder")}
          </button>
        </div>
      </div>
    </>
  )
}
