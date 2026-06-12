"use client"

import { useState } from "react"
import { ShoppingCart, Minus, Plus, Table2, X, Store, UtensilsCrossed, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MenuProduct } from "@/lib/types"
import { getPrice } from "@/lib/types"
import { useTranslation } from "@/lib/use-translation"
import type { OrderType } from "@/types/order"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const SIZE_LABELS: Record<string, string> = {
  S: "صغير", M: "وسط", L: "كبير", XL: "كبير جداً", XXL: "خارق",
}

interface NewOrderItem {
  product: MenuProduct
  size: string
  sauceId: number | null
  quantity: number
}

interface CartSidebarProps {
  orderItems: NewOrderItem[]
  customerName: string
  onCustomerNameChange: (name: string) => void
  customerPhone: string
  onCustomerPhoneChange: (phone: string) => void
  onUpdateQuantity: (productId: number, delta: number) => void
  onRemoveItem: (productId: number) => void
  onSubmit: () => void
  submitting: boolean
  disabled: boolean
  error?: string
  orderType: OrderType
  onOrderTypeChange: (type: OrderType) => void
  tableNumber: string
  onTableNumberChange: (table: string) => void
  onCancel?: () => void
  hasDelivery?: boolean
}

export function CartSidebar({
  orderItems, customerName, onCustomerNameChange, customerPhone, onCustomerPhoneChange, onUpdateQuantity, onRemoveItem, onSubmit,
  submitting, disabled, error, orderType, onOrderTypeChange, tableNumber, onTableNumberChange, onCancel, hasDelivery = true,
}: CartSidebarProps) {
  const { t, lang } = useTranslation()
  const cur = lang === "ar" ? "د.ج" : "DA"
  const [expanded, setExpanded] = useState(true)
  const total = orderItems.reduce((s, i) => s + getPrice(i.product, i.size, i.sauceId) * i.quantity, 0)
  const itemCount = orderItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <aside className={cn(
      "w-full lg:w-80 shrink-0 bg-card lg:border-r border-border flex flex-col",
      "lg:h-full max-h-[45vh] lg:max-h-none border-t lg:border-t-0"
    )}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="w-3 h-3 text-primary" />
          </div>
          <h2 className="text-xs font-semibold text-foreground">{t("pos.newOrderTitle")}</h2>
          {itemCount > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-full tabular-nums">{itemCount}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onCancel && (
            <Button variant="ghost" size="icon-sm" onClick={onCancel} className="h-6 w-6 text-muted-foreground hover:text-destructive">
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      <div className={cn("flex-1 flex flex-col min-h-0", expanded ? "flex" : "hidden lg:flex")}>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            <input value={customerName} onChange={e => onCustomerNameChange(e.target.value)}
              placeholder={t("pos.customerName")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />

            <div className="flex gap-1.5">
              <button onClick={() => onOrderTypeChange("dine_in")}
                className={cn("flex-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-all border flex items-center justify-center gap-1",
                  orderType === "dine_in"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground")}>
                <UtensilsCrossed className="w-3 h-3" />
                {t("pos.dineIn")}
              </button>
              <button onClick={() => onOrderTypeChange("takeaway")}
                className={cn("flex-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-all border flex items-center justify-center gap-1",
                  orderType === "takeaway"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground")}>
                <Store className="w-3 h-3" />
                {t("pos.takeaway")}
              </button>
              {hasDelivery && (
                <button onClick={() => onOrderTypeChange("delivery")}
                  className={cn("flex-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-all border flex items-center justify-center gap-1",
                    orderType === "delivery"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground")}>
                  <Truck className="w-3 h-3" />
                  {t("pos.delivery")}
                </button>
              )}
            </div>

            {orderType === "dine_in" && (
              <div className="relative">
                <Table2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input value={tableNumber} onChange={e => onTableNumberChange(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder={t("pos.tableNumber")} inputMode="numeric"
                  className="w-full rounded-lg border border-border bg-background pr-9 px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
            )}
            {orderType === "delivery" && (
              <div className="relative">
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <input value={customerPhone} onChange={e => onCustomerPhoneChange(e.target.value.replace(/[^0-9+]/g, '').slice(0, 20))}
                  placeholder={t("pos.customerPhone")} inputMode="tel" dir="ltr"
                  className="w-full rounded-lg border border-border bg-background pr-9 px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
            )}

            {orderItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs font-medium">{t("pos.emptyCart")}</p>
                <p className="text-[11px] mt-0.5 opacity-60">{t("pos.selectProducts")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {orderItems.map((item, idx) => {
                  const price = getPrice(item.product, item.size, item.sauceId)
                  const sizeLabel = SIZE_LABELS[item.size] || item.size
                  const sauceLabel = item.sauceId === 1 ? "أحمر" : item.sauceId === 2 ? "أبيض" : null
                  return (
                    <div key={`${item.product.id}-${item.size}-${item.sauceId ?? "none"}-${idx}`}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{item.product.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {sizeLabel}{sauceLabel && <span className="mx-0.5">·</span>}
                          {sauceLabel && <span className={cn(item.sauceId === 1 ? "text-red-500" : "text-amber-600")}>{sauceLabel}</span>}
                          <span className="mx-0.5">·</span>
                          <span className="tabular-nums">{price.toLocaleString()} {cur}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => onUpdateQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-background hover:text-foreground transition-colors">
                          {item.quantity === 1 ? <X className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        </button>
                        <span className="text-xs font-bold text-foreground w-5 text-center tabular-nums">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border bg-muted/10 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">{t("pos.total")}</span>
            <span className="text-base font-bold text-foreground tabular-nums">{total.toLocaleString()} {cur}</span>
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel} className="flex-1 h-9 text-xs">
                {t("common.cancel")}
              </Button>
            )}
            <Button onClick={onSubmit} disabled={disabled || submitting} size="sm" className="flex-1 h-9 text-xs">
              {submitting ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("common.processing")}
                </span>
              ) : `${total.toLocaleString()} ${cur} · ${t("pos.submitOrder")}`}
            </Button>
          </div>
          {error && <p className="text-[11px] text-destructive text-center font-medium">{error}</p>}
        </div>
      </div>
    </aside>
  )
}
