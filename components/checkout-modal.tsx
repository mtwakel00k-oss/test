"use client"

import { useState, useCallback, useEffect, useMemo, startTransition } from "react"
import { MapPin, Loader2, ShoppingBag, Check, ChevronRight } from "lucide-react"
import { getPrice } from "@/lib/types"
import type { CartItem, OrderType } from "@/lib/types"
import { logger } from "@/lib/logger"
import { useTranslation } from "@/lib/use-translation"
import { fetchApi } from "@/lib/tenant"
import { readTenantConfig } from "@/lib/use-slug"
import { phoneRegex } from "@/lib/validations"
import { motion, AnimatePresence } from "framer-motion"

interface CheckoutModalProps {
  items: CartItem[]
  total: number
  onClose: () => void
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
      <AnimatePresence>
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-border/40 bg-card p-8 shadow-2xl text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
            className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5"
          >
            <Check className="w-8 h-8 text-emerald-600" />
          </motion.div>
          <h2 className="text-2xl font-black text-foreground mb-2 tracking-tight">{t("menu.orderConfirmed")}</h2>
          <p className="text-muted-foreground mb-1">
            {t("menu.orderNumber")} <span className="font-black text-foreground text-lg tabular-nums">#{orderNumber}</span>
          </p>
          <p className="text-sm text-muted-foreground mb-5">{t("menu.willPrepare")}</p>
          {removedNames.length > 0 && (
            <div className="mb-5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm">
              <p className="font-bold text-amber-800 dark:text-amber-200 mb-1">بعض المنتجات غير متوفرة حالياً</p>
              <p className="text-amber-700 dark:text-amber-300 text-xs">تم إزالة: {removedNames.join("، ")}</p>
            </div>
          )}
          <button onClick={() => { if (orderId) onSuccess(orderId, slug, orderNumber) }}
            className="w-full rounded-2xl bg-emerald-600 text-white py-3 font-black text-sm uppercase tracking-wider hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20">
            {t("menu.trackOrder")}
          </button>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] border border-border/40 bg-card/90 backdrop-blur-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="size-14 rounded-[1.25rem] bg-emerald-600/10 flex items-center justify-center mb-4">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
          </div>
            <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">{t("menu.confirmOrder")}</h2>
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-2">{t("menu.pleaseConfirm")}</p>
        </div>

        <div className="flex gap-2 mb-8 bg-muted/40 p-1.5 rounded-[1.25rem] border border-border/30">
          {(["dine_in", "takeaway", "delivery"] as OrderType[]).map((type) => {
            const label = type === "dine_in" ? t("menu.tableDineIn") : type === "takeaway" ? t("menu.takeaway") : t("pos.delivery")
            const isDisabled = type === "delivery" && !deliveryAllowed
            return (
              <button key={type} type="button"
                disabled={isDisabled}
                onClick={() => { if (!isDisabled) { setOrderType(type); setErrors({}) } }}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  orderType === type
                    ? "bg-background text-emerald-600 shadow-lg shadow-emerald-600/5 ring-1 ring-border/20"
                    : isDisabled
                      ? "text-muted-foreground/20 cursor-not-allowed grayscale"
                      : "text-muted-foreground/50 hover:text-foreground"
                }`}
              >
                {type === "delivery" ? `🛵 ${label}` : label}
              </button>
            )
          })}
        </div>

        <div className="mb-8 rounded-[1.5rem] bg-emerald-600/[0.03] border border-emerald-600/10 p-6">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/50 mb-5">{t("menu.orderSummary")}</p>
          <div className="max-h-40 space-y-3 overflow-y-auto scrollbar-hide" role="list">
            {items.map(i => {
              const k = `${i.product.id}_${i.size}_${i.sauceId}`
              const sauceLabel = i.sauceId === 1 ? "Sauce Tomate" : i.sauceId === 2 ? "Crème Fraîche" : null
              const itemPrice = getPrice(i.product, i.size, i.sauceId) * i.quantity
              return (
                <div key={k} className="flex items-center justify-between gap-4" role="listitem">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-black text-foreground tracking-tight leading-tight">{i.product.name}</span>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                      {i.size !== "UNIQUE" && <span>{i.size}</span>}
                      {sauceLabel && (
                        <>
                          <div className="size-0.5 rounded-full bg-border" />
                          <span>{sauceLabel}</span>
                        </>
                      )}
                      <div className="size-0.5 rounded-full bg-border" />
                      <span className="text-emerald-600 dark:text-emerald-400">x{i.quantity}</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-foreground tabular-nums whitespace-nowrap">
                    {itemPrice.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
                    <span className="text-[9px] font-bold text-muted-foreground ms-1">DA</span>
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between pt-6 mt-4 border-t border-border/30">
            <span className="font-black text-foreground uppercase tracking-[0.15em] text-[10px]">{t("pos.total")}</span>
            <span className="font-black text-3xl text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {total.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
              <span className="text-xs font-bold text-muted-foreground ms-1">DA</span>
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">
              {t("menu.name")}
            </label>
            <input
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()}
              className="w-full h-12 rounded-2xl border border-border/40 bg-muted/20 px-5 text-sm font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 focus:bg-background transition-all disabled:opacity-50"
              placeholder={t("menu.namePlaceholder") || "أدخل اسمك"}
              disabled={submitting} autoFocus />
            {errors.name && <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mt-2 px-1">{errors.name}</p>}
          </div>

          {orderType === "delivery" && !deliveryAllowed && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-5 text-center">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-bold">التوصيل غير متاح في هذا المطعم حالياً</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">تتوفر ميزة التوصيل في الباقة الاحترافية (Pro)</p>
            </div>
          )}
          <AnimatePresence mode="wait">
            {orderType === "delivery" && deliveryAllowed && (
              <motion.div
                key="delivery"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] p-5 space-y-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <MapPin className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t("pos.deliveryInfo") || t("menu.burgerDelivery")}</span>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">رقم الهاتف</label>
                  <input type="tel" value={form.phone} maxLength={10}
                    onChange={e => setForm(f => ({ ...f, phone: maskPhone(e.target.value) }))}
                    onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()}
                    className="w-full h-11 rounded-xl border border-border/40 bg-muted/20 px-4 text-sm font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all disabled:opacity-50"
                    placeholder="0555123456" disabled={submitting} />
                  {errors.phone && <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mt-1.5 px-1">{errors.phone}</p>}
                </div>
                {geoStatus === "idle" && (
                  <button type="button" onClick={getLocation}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 py-3 text-sm font-bold text-muted-foreground hover:bg-muted/40 transition-colors">
                    <MapPin className="w-4 h-4" />
                    {t("menu.detectLocation")}
                  </button>
                )}
                {geoStatus === "loading" && (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 py-3 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("menu.detectingLocation")}
                  </div>
                )}
                {geoStatus === "success" && form.deliveryAddress && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">{t("pos.yourLocation") || t("track.yourLocation")}</p>
                      <p className="text-sm text-foreground">{form.deliveryAddress}</p>
                    </div>
                    <button type="button" onClick={() => setGeoStatus("idle")}
                      className="w-full rounded-xl border border-border/40 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-colors">
                      {t("pos.redetect") || t("menu.updateLocation")}
                    </button>
                  </div>
                )}
                {geoStatus === "error" && (
                  <button type="button" onClick={getLocation}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 py-3 text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition-colors">
                    {t("pos.locationFailed") || t("menu.locationFailed")}
                  </button>
                )}
              </motion.div>
            )}
            {orderType === "dine_in" && (
              <motion.div
                key="dine_in"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">
                  {t("pos.tableNumber")}
                </label>
                <input type="number" min="1" value={form.table}
                  onChange={e => setForm(f => ({ ...f, table: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()}
                  className="w-full h-12 rounded-2xl border border-border/40 bg-muted/20 px-5 text-sm font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 focus:bg-background transition-all disabled:opacity-50"
                  placeholder="مثال: 5" disabled={submitting} />
                {errors.table && <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mt-2 px-1">{errors.table}</p>}
              </motion.div>
            )}
            {orderType === "takeaway" && (
              <motion.div
                key="takeaway"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">
                  {t("pos.phone")} <span className="text-muted-foreground/30">({t("rating.optional")})</span>
                </label>
                <input type="tel" value={form.phone} maxLength={10}
                  onChange={e => setForm(f => ({ ...f, phone: maskPhone(e.target.value) }))}
                  onKeyDown={e => e.key === "Enter" && !submitting && handleSubmit()}
                  className="w-full h-12 rounded-2xl border border-border/40 bg-muted/20 px-5 text-sm font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 focus:bg-background transition-all disabled:opacity-50"
                  placeholder="0555123456" disabled={submitting} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {errors.general && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-bold text-rose-500 mt-4 px-1"
          >
            {errors.general}
          </motion.p>
        )}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex-1 rounded-2xl border border-border/40 py-3 text-sm font-bold text-muted-foreground hover:bg-secondary disabled:opacity-50 transition-colors">
            {t("common.cancel")}
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 rounded-2xl bg-emerald-600 text-white py-3 text-sm font-black uppercase tracking-wider hover:bg-emerald-500 disabled:opacity-60 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.97]">
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("menu.submitting")}
              </span>
            ) : t("menu.confirmOrder")}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
