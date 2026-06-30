"use client"

import { cn } from "@/lib/utils"
import { getPrice } from "@/lib/types"
import type { MenuProduct } from "@/lib/types"
import { useTranslation } from "@/lib/use-translation"
import type { ReactNode } from "react"

interface CartItem {
  product: MenuProduct
  size: string
  sauceId: number | null
  quantity: number
}

interface CartPanelProps {
  items: CartItem[]
  customerName: string
  onCustomerNameChange: (name: string) => void
  orderType: "dine_in" | "takeaway"
  onOrderTypeChange: (type: "dine_in" | "takeaway") => void
  tableNumber: string
  onTableNumberChange: (table: string) => void
  onSubmit: () => void
  submitting: boolean
  disabled: boolean
  error: string
  onClose: () => void
  children?: ReactNode
}

export function CartPanel({
  items, customerName, onCustomerNameChange, orderType, onOrderTypeChange,
  tableNumber, onTableNumberChange, onSubmit, submitting, disabled, error, onClose, children,
}: CartPanelProps) {
  const { t, lang } = useTranslation()
  const cur = lang === "ar" ? "د.ج" : "DA"
  const total = items.reduce((s, i) => s + getPrice(i.product, i.size, i.sauceId) * i.quantity, 0)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <h2 className="text-lg font-bold text-foreground">{t("pos.newOrderTitle")}</h2>
        <button onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground/50 hover:text-foreground"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <input value={customerName} onChange={e => onCustomerNameChange(e.target.value)} placeholder={t("pos.customerName")}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <div className="flex gap-2">
          <button onClick={() => onOrderTypeChange("dine_in")}
            className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              orderType === "dine_in"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}>{t("pos.dineIn")}</button>
          <button onClick={() => onOrderTypeChange("takeaway")}
            className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              orderType === "takeaway"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}>{t("pos.takeaway")}</button>
        </div>
        {orderType === "dine_in" && (
          <input value={tableNumber} onChange={e => onTableNumberChange(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder={t("pos.tableNumber")}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            inputMode="numeric"
          />
        )}
        {children}
      </div>
      <div className="p-4 border-t border-border">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-muted-foreground">{t("pos.total")}</span>
          <span className="text-lg font-bold text-foreground">
            {total} {cur}
          </span>
        </div>
        <button onClick={onSubmit} disabled={disabled || submitting}
          className={cn("w-full rounded-lg py-2.5 text-sm font-semibold transition-all",
            !disabled && !submitting ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
          )}>{submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t("common.processing")}
            </span>
          ) : t("pos.submitOrder")}</button>
        {error && <p className="text-sm text-destructive text-center mt-2">{error}</p>}
      </div>
    </div>
  )
}
