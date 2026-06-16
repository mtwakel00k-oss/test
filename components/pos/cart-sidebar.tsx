"use client"

import { useState } from "react"
import { ShoppingCart, Trash2, Minus, Plus, ChevronDown, ChevronUp, Table2, X } from "lucide-react"
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
}

export function CartSidebar({
  orderItems,
  customerName,
  onCustomerNameChange,
  onUpdateQuantity,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRemoveItem,
  onSubmit,
  submitting,
  disabled,
  error,
  orderType,
  onOrderTypeChange,
  tableNumber,
  onTableNumberChange,
  onCancel,
}: CartSidebarProps) {
  const { t, lang } = useTranslation()
  const cur = lang === "ar" ? "د.ج" : "DA"
  const [expanded, setExpanded] = useState(true)

  const total = orderItems.reduce((s, i) => s + getPrice(i.product, i.size, i.sauceId) * i.quantity, 0)
  const itemCount = orderItems.reduce((s, i) => s + i.quantity, 0)

  const typeOptions: { value: OrderType; label: string }[] = [
    { value: "dine_in", label: t("pos.dineIn") },
    { value: "takeaway", label: t("pos.takeaway") },
  ]

  return (
    <aside className="w-full lg:w-96 shrink-0 bg-card lg:border-r border-border flex flex-col lg:h-full max-h-[45vh] lg:max-h-none border-t lg:border-t-0">
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("pos.newOrderTitle")}</h2>
          {itemCount > 0 && (
            <span className="text-[11px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-full">
              {itemCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onCancel && (
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={onCancel}
              title="إلغاء الطلب"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setExpanded(!expanded)}
            className="lg:hidden"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className={cn("flex-1 flex flex-col min-h-0", expanded ? "flex" : "hidden lg:flex")}>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            <input
              value={customerName}
              onChange={e => onCustomerNameChange(e.target.value)}
              placeholder={t("pos.customerName")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex gap-1">
              {typeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onOrderTypeChange(opt.value)}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all border",
                    orderType === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {orderType === "dine_in" && (
              <div className="relative">
                <Table2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={tableNumber}
                  onChange={e => onTableNumberChange(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder={t("pos.tableNumber")}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-border bg-background pr-8 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}


            <div className="space-y-1">
              {orderItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 mb-1 opacity-30" />
                  <p className="text-xs font-medium">السلة فارغة</p>
                  <p className="text-[11px] mt-0.5">اختر المنتجات من القائمة</p>
                </div>
              ) : (
                orderItems.map((item, idx) => {
                  const price = getPrice(item.product, item.size, item.sauceId)
                  const sizeLabel = SIZE_LABELS[item.size] || item.size
                  const sauceLabel = item.sauceId === 1 ? "أحمر" : item.sauceId === 2 ? "أبيض" : null
                  const key = `${item.product.id}-${item.size}-${item.sauceId ?? "none"}-${idx}`
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{item.product.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {sizeLabel}
                          {sauceLabel && <span className="mx-0.5">·</span>}
                          {sauceLabel && (
                            <span className={item.sauceId === 1 ? "text-red-500" : "text-amber-600"}>{sauceLabel}</span>
                          )}
                          <span className="mx-0.5">·</span>
                          {price.toLocaleString()} {cur}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onUpdateQuantity(item.product.id, -1)}
                        >
                          {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        </Button>
                        <span className="text-xs font-bold text-foreground w-4 text-center tabular-nums">{item.quantity}</span>
                        <Button
                          variant="secondary"
                          size="icon-xs"
                          onClick={() => onUpdateQuantity(item.product.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("pos.total")}</span>
            <span className="text-lg font-bold text-foreground">{total.toLocaleString()} {cur}</span>
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" size="default" onClick={onCancel} className="flex-1 text-xs">
                إلغاء
              </Button>
            )}
            <Button
              onClick={onSubmit}
              disabled={disabled || submitting}
              size="default"
              className="flex-1 text-xs"
            >
              {submitting ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("common.processing")}
                </span>
              ) : (
                `${t("pos.submitOrder")} · ${total.toLocaleString()} ${cur}`
              )}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive text-center font-medium">{error}</p>}
        </div>
      </div>
    </aside>
  )
}
