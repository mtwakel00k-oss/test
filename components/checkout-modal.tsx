"use client"

import { useState, useCallback, useEffect, useMemo, startTransition } from "react"
import { MapPin, Loader2 } from "lucide-react"
import { getPrice } from "@/lib/types"
import type { CartItem, OrderType } from "@/lib/types"
import { logger } from "@/lib/logger"
import { useTranslation } from "@/lib/use-translation"
import { fetchApi } from "@/lib/tenant"
import { readTenantConfig } from "@/lib/use-slug"
import { phoneRegex } from "@/lib/validations"

interface CheckoutModalProps {
  items: CartItem[]
  total: number
  onClose: () => void
  /** Called with (orderId, slug, orderNumber) */
  onSuccess: (orderId: string, slug: string, orderNumber?: number) => void
  onClear: () => void
  onRemoveProduct?: (productId: number) => void
  slug: string
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

function maskPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10)
}

export function CheckoutModal({
  items,
  total,
  onClose,
  onSuccess,
  onClear,
  onRemoveProduct,
  slug,
  initialOrderType = "dine_in",
  initialDeliveryPhone = "",
  initialCoords = null,
}: CheckoutModalProps) {
  const { t, lang } = useTranslation()

  const deliveryAllowed = useMemo(() => {
    const config = readTenantConfig()
    const plan = config?.plan_type ?? "starter"
    return plan === "pro" || plan === "elite"
  }, [])

  const [orderType, setOrderType] = useState<OrderType>(initialOrderType)
  const [form, setForm] = useState<FormData>({ name: "", table: "", phone: initialDeliveryPhone, deliveryAddress: "" })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [orderNumber, setOrderNumber] = useState<number | undefined>(undefined)
  const [orderId, setOrderId] = useState<string | undefined>(undefined)
  const [removedNames, setRemovedNames] = useState<string[]>([])

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initialCoords)
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">(
    initialCoords ? "success" : "idle"
  )

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      startTransition(() => setGeoStatus("error"))
      return
    }
    startTransition(() => setGeoStatus("loading"))
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
        startTransition(() => { setCoords({ lat: latitude, lng: longitude }); setGeoStatus("success") })
        try {
          const res = await fetch(
            `${GEOCODE_URL}?format=json&lat=${latitude}&lon=${longitude}&accept-language=${lang === "ar" ? "ar" : lang}`,
            { headers: { "User-Agent": "BurgerHouseApp/1.0" } }
          )
          const data = await res.json()
          if (data.display_name) {
            startTransition(() => setForm(f => ({ ...f, deliveryAddress: data.display_name })))
          }
        } catch {
          // reverse geocode failed — coordinates are enough
        }
      })
      .catch(() => {
        startTransition(() => setGeoStatus("error"))
      })
  }, [lang])

  useEffect(() => {
    if (orderType === "delivery" && deliveryAllowed) {
      getLocation()
    }
  }, [orderType, deliveryAllowed, getLocation])

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = t("menu.enterName")
    if (orderType === "dine_in") {
      const tn = parseInt(form.table, 10)
      if (!form.table || isNaN(tn) || tn < 1) e.table = t("menu.enterTable")
    }
    if (orderType === "delivery") {
      if (!form.phone.trim()) {
        e.phone = "رقم الهاتف مطلوب للتوصيل"
      } else if (!phoneRegex.test(form.phone.trim())) {
        e.phone = "رقم الهاتف غير صحيح — يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام"
      }
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
          body.google_maps_link = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
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
            if (res.status === 403) {
              throw new Error(t("menu.forbiddenError") || "عذراً، حدث خطأ في التحقق من الصلاحية. يرجى المحاولة مرة أخرى.")
            }
            if (data.code === "ALL_PRODUCTS_STALE") {
              onClear(); onClose(); return
            }
            throw new Error(data.error === "Table is occupied" ? t("pos.tableOccupied") : (data.error || t("menu.orderFailed")))
          }
          const removedPids: number[] = data.removed_product_ids
          if (removedPids?.length > 0) {
            setRemovedNames(removedPids.map((pid: number) => {
              const item = items.find(i => i.product.id === pid)
              if (item) { onRemoveProduct?.(pid); return item.product.name }
              return `#${pid}`
            }))
          }
          onClear()
          setOrderId(data.id)
          setOrderNumber(data.orderNumber)
          setSubmitted(true)
          setTimeout(() => { onSuccess(data.id, slug, data.orderNumber) }, 2500)
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
      const isForbidden = msg === "Forbidden" || msg.includes("صلاحية") || msg.includes("permission")
      setErrors({ general: isForbidden ? "عذراً، حدث خطأ في التحقق من الصلاحية. يرجى تحديث الصفحة والمحاولة مرة أخرى." : msg })
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
          <p className="text-sm text-muted-foreground mb-3">{t("menu.willPrepare")}</p>
          {removedNames.length > 0 && (
            <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-right">
              <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">⚠️ بعض المنتجات غير متوفرة حالياً</p>
              <p className="text-amber-700 dark:text-amber-300 text-xs">تم إزالة: {removedNames.join("، ")}</p>
            </div>
          )}
          <button onClick={() => { if (orderId) onSuccess(orderId, slug, orderNumber) }}
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
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[3rem] border border-border/50 bg-card/80 backdrop-blur-3xl p-10 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex flex-col items-center mb-10">
          <div className="size-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-inner">
            <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-foreground tracking-tight leading-none">{t("menu.confirmOrder")}</h2>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-2">يرجى تأكيد تفاصيل طلبك</p>
        </div>

        <div className="flex gap-2 mb-10 bg-muted/50 p-2 rounded-[1.5rem] border border-border/50 shadow-inner">
          <button type="button"
            onClick={() => { setOrderType("dine_in"); setErrors({}) }}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              orderType === "dine_in" ? "bg-background text-primary shadow-xl shadow-primary/5" : "text-muted-foreground/60 hover:text-foreground"
            }`}>
            {t("menu.tableDineIn")}
          </button>
          <button type="button"
            onClick={() => { setOrderType("takeaway"); setErrors({}) }}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              orderType === "takeaway" ? "bg-background text-primary shadow-xl shadow-primary/5" : "text-muted-foreground/60 hover:text-foreground"
            }`}>
            {t("menu.takeaway")}
          </button>
          <button type="button" title={!deliveryAllowed ? "تتوفر ميزة التوصيل في الباقة الاحترافية (Pro) 👑" : undefined}
            onClick={() => { if (deliveryAllowed) { setOrderType("delivery"); setErrors({}) } }}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              orderType === "delivery" ? "bg-background text-primary shadow-xl shadow-primary/5" : !deliveryAllowed ? "text-muted-foreground/20 cursor-not-allowed grayscale" : "text-muted-foreground/60 hover:text-foreground"
            }`}>
            🛵 {t("pos.delivery")}
          </button>
        </div>

        <div className="mb-10 rounded-[2rem] bg-primary/[0.02] border border-primary/10 p-8 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-6">ملخص الطلب</p>
          <div className="max-h-48 space-y-4 overflow-y-auto scrollbar-hide" role="list">
            {items.map(i => {
              const k = `${i.product.id}_${i.size}_${i.sauceId}`
              const sauceLabel = i.sauceId === 1 ? "Sauce Tomate" : i.sauceId === 2 ? "Crème Fraîche" : null
              return (
                <div key={k} className="flex items-center justify-between gap-4" role="listitem">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-black text-foreground tracking-tight leading-tight">{i.product.name}</span>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      {i.size !== "UNIQUE" && <span>{i.size}</span>}
                      {sauceLabel && (
                        <>
                          <div className="size-1 rounded-full bg-border" />
                          <span>{sauceLabel}</span>
                        </>
                      )}
                      <div className="size-1 rounded-full bg-border" />
                      <span className="text-primary">x{i.quantity}</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-foreground tabular-nums">{getPrice(i.product, i.size, i.sauceId) * i.quantity} <span className="text-[10px] opacity-40">DA</span></span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between pt-8 mt-4 border-t border-border/50">
            <span className="font-black text-foreground uppercase tracking-[0.2em] text-[10px]">{t("pos.total")}</span>
            <span className="font-black text-4xl text-primary tracking-tighter tabular-nums">{total} <span className="text-sm opacity-40">DA</span></span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <input
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()}
              className="w-full h-14 rounded-2xl border border-border/50 bg-muted/30 px-6 text-sm font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-background transition-all disabled:opacity-50"
              placeholder={t("menu.name")} disabled={submitting} autoFocus />
            {errors.name && <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mt-2 px-2">{errors.name}</p>}
          </div>

          {orderType === "delivery" && !deliveryAllowed && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-center">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">التوصيل غير متاح في هذا المطعم حالياً</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">تتوفر ميزة التوصيل في الباقة الاحترافية (Pro) 👑</p>
            </div>
          )}
          {orderType === "delivery" && deliveryAllowed && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <MapPin className="w-4 h-4" />
                <span>معلومات التوصيل</span>
              </div>
              <input type="tel" value={form.phone} maxLength={10}
                onChange={e => setForm(f => ({ ...f, phone: maskPhone(e.target.value) }))}
                onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()}
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                placeholder="رقم الهاتف (مثال: 0555123456)" disabled={submitting} />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              {geoStatus === "idle" && (
                <button type="button" onClick={getLocation}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  <MapPin className="w-4 h-4" />
                  📍 حدد موقعي تلقائياً
                </button>
              )}
              {geoStatus === "loading" && (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري تحديد الموقع...
                </div>
              )}
              {geoStatus === "success" && form.deliveryAddress && (
                <div className="space-y-2">
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mb-1">📍 موقعك الحالي:</p>
                    <p className="text-sm text-foreground">{form.deliveryAddress}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setGeoStatus("idle")}
                      className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                      إعادة التحديد
                    </button>
                    <div className="flex-1 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 text-center">
                      ✓ هذا موقعي
                    </div>
                  </div>
                </div>
              )}
              {geoStatus === "error" && (
                <button type="button" onClick={getLocation}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                  فشل التحديد، اضغط لإعادة المحاولة
                </button>
              )}
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
              <input type="tel" value={form.phone} maxLength={10}
                onChange={e => setForm(f => ({ ...f, phone: maskPhone(e.target.value) }))}
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
