"use client"

import { MapPin, Lock, CheckCircle2, Loader2 } from "lucide-react"
import { useCallback, useMemo } from "react"
import type { OrderType } from "@/lib/types"
import { useTranslation } from "@/lib/use-translation"
import { readTenantConfig } from "@/lib/use-slug"

interface OrderTypeSelectorProps {
  value: OrderType
  onChange: (type: OrderType) => void
  deliveryPhone?: string
  onDeliveryPhoneChange?: (phone: string) => void
  geoStatus?: "idle" | "loading" | "success" | "error"
  onGetLocation?: () => void
}

export function OrderTypeSelector({
  value,
  onChange,
  deliveryPhone = "",
  onDeliveryPhoneChange,
  geoStatus = "idle",
  onGetLocation,
}: OrderTypeSelectorProps) {
  const { t } = useTranslation()

  const deliveryAllowed = useMemo(() => {
    const config = readTenantConfig()
    const plan = config?.plan_type ?? "starter"
    return plan === "pro" || plan === "elite"
  }, [])

  const handleChange = useCallback((type: OrderType) => {
    if (type === "delivery" && !deliveryAllowed) return
    onChange(type)
  }, [deliveryAllowed, onChange])

  const options: { value: OrderType; label: string }[] = [
    { value: "dine_in", label: t("menu.tableDineIn") },
    { value: "takeaway", label: t("menu.takeaway") },
    { value: "delivery", label: deliveryAllowed ? t("pos.delivery") : "التوصيل" },
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 bg-secondary rounded-xl p-1 shadow-sm">
        {options.map((opt) => {
          const isActive = value === opt.value
          const isLocked = opt.value === "delivery" && !deliveryAllowed
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (isLocked) return
                handleChange(opt.value)
              }}
              title={isLocked ? "تتوفر ميزة التوصيل في الباقة الاحترافية (Pro) 👑" : undefined}
              className={`flex items-center justify-center gap-1.5 flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isLocked
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              {opt.value === "dine_in" && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {opt.value === "takeaway" && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              )}
              {opt.value === "delivery" && (
                <MapPin className="w-4 h-4" />
              )}
              {isLocked && <Lock className="h-3 w-3 text-muted-foreground/40" />}
              {opt.label}
            </button>
          )
        })}
      </div>

      {value === "delivery" && deliveryAllowed && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
          <div>
            <input
              type="tel"
              value={deliveryPhone}
              onChange={e => onDeliveryPhoneChange?.(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
              placeholder="رقم الهاتف (مثال: 0555123456)"
              dir="auto"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={onGetLocation}
              disabled={geoStatus === "loading" || geoStatus === "success"}
              className={`w-full flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                geoStatus === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                  : geoStatus === "error"
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {geoStatus === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : geoStatus === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {geoStatus === "idle" && "📍 حدد موقعي تلقائياً"}
              {geoStatus === "loading" && "جاري تحديد الموقع..."}
              {geoStatus === "success" && "✓ تم تحديد الموقع"}
              {geoStatus === "error" && "فشل تحديد الموقع، اضغط لإعادة المحاولة"}
            </button>
          </div>
        </div>
      )}

      {value === "delivery" && !deliveryAllowed && (
        <div className="text-xs text-center text-muted-foreground bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
          تتوفر ميزة التوصيل في الباقة الاحترافية (Pro) 👑
        </div>
      )}
    </div>
  )
}
