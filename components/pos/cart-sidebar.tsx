"use client"

import { useState } from "react"
import { ShoppingCart, Minus, Plus, Table2, X, ShoppingBag, UtensilsCrossed, Truck } from "lucide-react"
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
  orderItems, customerName, onCustomerNameChange, customerPhone, onCustomerPhoneChange, onUpdateQuantity, onSubmit,
  submitting, disabled, error, orderType, onOrderTypeChange, tableNumber, onTableNumberChange, onCancel, hasDelivery = true,
}: CartSidebarProps) {
  const { t, lang } = useTranslation()
  const cur = lang === "ar" ? "د.ج" : "DA"
  const [expanded] = useState(true)
  const total = orderItems.reduce((s, i) => s + getPrice(i.product, i.size, i.sauceId) * i.quantity, 0)
  const itemCount = orderItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <aside className={cn(
      "w-full md:w-[38%] shrink-0 bg-background md:border-r border-border/50 flex flex-col shadow-2xl z-20",
      "md:h-full max-h-[60vh] md:max-h-none border-t md:border-t-0"
    )}>
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-muted/5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/10">
            <ShoppingCart className="size-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-black text-foreground tracking-tight leading-none mb-1">{t("pos.newOrderTitle")}</h2>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary " />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{itemCount} {t("pos.items")}</p>
            </div>
          </div>
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
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">{t("pos.customerInfo")}</label>
              <input data-testid="customer-name-input" value={customerName} onChange={e => onCustomerNameChange(e.target.value)}
                placeholder={t("pos.customerName")}
                className="w-full h-12 rounded-2xl border border-border/50 bg-muted/30 px-4 text-sm font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">{t("pos.orderType")}</label>
              <div className="grid grid-cols-3 gap-2">
                <button data-testid="order-type-dine-in" onClick={() => onOrderTypeChange("dine_in")}
                  className={cn("h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex flex-col items-center justify-center gap-1.5",
                    orderType === "dine_in"
                      ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-[1.05]"
                      : "bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground")}>
                  <UtensilsCrossed className="size-4" />
                  {t("pos.dineIn")}
                </button>
                <button onClick={() => onOrderTypeChange("takeaway")}
                  className={cn("h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex flex-col items-center justify-center gap-1.5",
                    orderType === "takeaway"
                      ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-[1.05]"
                      : "bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground")}>
                  <ShoppingBag className="size-4" />
                  {t("pos.takeaway")}
                </button>
                {hasDelivery && (
                  <button onClick={() => onOrderTypeChange("delivery")}
                    className={cn("h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex flex-col items-center justify-center gap-1.5",
                      orderType === "delivery"
                        ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-[1.05]"
                        : "bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground")}>
                    <Truck className="size-4" />
                    {t("pos.delivery")}
                  </button>
                )}
              </div>
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

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">{t("pos.items")}</label>
              {orderItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 rounded-[2rem] border-2 border-dashed border-border/50 bg-muted/10">
                  <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <ShoppingCart className="size-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t("pos.emptyCart")}</p>
                  <p className="text-[10px] font-bold text-muted-foreground/40 mt-1">{t("pos.selectProducts")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((item, idx) => {
                    const price = getPrice(item.product, item.size, item.sauceId)
                    const sizeLabel = SIZE_LABELS[item.size] || item.size
                    const sauceLabel = item.sauceId === 1 ? "أحمر" : item.sauceId === 2 ? "أبيض" : null
                    return (
                      <div key={`${item.product.id}-${item.size}-${item.sauceId ?? "none"}-${idx}`}
                        className="group flex items-center gap-4 p-4 rounded-[1.5rem] bg-muted/30 border border-border/50 hover:border-primary/20 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-foreground truncate leading-tight mb-1">{item.product.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-lg">{sizeLabel}</span>
                            {sauceLabel && (
                              <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg", 
                                item.sauceId === 1 ? "bg-rose-500/10 text-rose-600" : "bg-amber-400/10 text-amber-600")}>
                                {sauceLabel}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{price.toLocaleString()} {cur}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-background p-1 rounded-xl border border-border/50">
                          <button onClick={() => onUpdateQuantity(item.product.id, -1)}
                            className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-rose-500 hover:text-white transition-all">
                            {item.quantity === 1 ? <X className="size-3.5" /> : <Minus className="size-3.5" />}
                          </button>
                          <span className="text-xs font-black text-foreground w-6 text-center tabular-nums">{item.quantity}</span>
                          <button onClick={() => onUpdateQuantity(item.product.id, 1)}
                            className="size-7 rounded-lg flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="p-8 border-t border-border/50 bg-background/50 backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 leading-none mb-1">{t("pos.totalAmount")}</span>
              <span className="text-xs font-bold text-muted-foreground">{itemCount} {t("pos.items")}</span>
            </div>
            <span className="text-3xl font-black text-foreground tabular-nums tracking-tighter">{total.toLocaleString()} <span className="text-xs opacity-40">{cur}</span></span>
          </div>
          <div className="flex gap-3">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="h-14 px-6 rounded-2xl border-border/50 text-xs font-black uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/20 transition-all">
                {t("common.cancel")}
              </Button>
            )}
            <Button data-testid="create-order" onClick={onSubmit} disabled={disabled || submitting} className="flex-1 h-14 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("common.processing")}
                </span>
              ) : t("pos.submitOrder")}
            </Button>
          </div>
          {error && <p className="text-[11px] text-destructive text-center font-medium">{error}</p>}
        </div>
      </div>
    </aside>
  )
}
