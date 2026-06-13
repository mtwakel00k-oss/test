"use client"

import { useState, useCallback } from "react"
import type { PosOrder } from "@/lib/pos-types"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"
import { toast } from "@/hooks/use-toast"

interface CheckoutPanelProps {
  order: PosOrder
  onClose: () => void
  onComplete: (orderId: string | number, paid: number, change: number, onError: () => void, driverId?: string | null) => void
  hasDriverAssigned?: boolean
  drivers?: { id: string; name: string; phone: string; isBusy: boolean }[]
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function CheckoutPanel({ order, onClose, onComplete, hasDriverAssigned = true, drivers = [] }: CheckoutPanelProps) {
  const { t, lang } = useTranslation()
  const [cashReceived, setCashReceived] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(order.driverId ?? null)
  const cur = lang === "ar" ? "د.ج" : "DA"

  const isAlreadyPaid = order.paymentStatus === "paid"
  const cashAmount = parseFloat(cashReceived) || 0
  const change = cashAmount - order.total
  const canComplete = !isAlreadyPaid && change >= 0 && cashAmount > 0

  const handleKeyPress = useCallback((key: string) => {
    if (isAlreadyPaid) return
    if (key === "clear") { setCashReceived("") }
    else if (key === "backspace") { setCashReceived((prev) => prev.slice(0, -1)) }
    else if (key === ".") { if (!cashReceived.includes(".")) setCashReceived((prev) => prev + ".") }
    else {
      const newValue = cashReceived + key
      const parts = newValue.split(".")
      if (parts[1]?.length > 2) return
      if (newValue.length > 8) return
      setCashReceived(newValue)
    }
  }, [cashReceived, isAlreadyPaid])

  const handleQuickCash = useCallback((amount: number) => setCashReceived(amount.toFixed(2)), [])

  const handleComplete = useCallback(async () => {
    if (!canComplete) return
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    onComplete(order.id, cashAmount, change, () => setIsProcessing(false))
  }, [canComplete, onComplete, order.id, cashAmount, change])

  const handleDeliveryConfirm = useCallback(() => {
    if (!selectedDriverId) {
      toast({ title: "يرجى اختيار سائق", variant: "destructive" })
      return
    }
    setIsProcessing(true)
    onComplete(order.id, order.total, 0, () => setIsProcessing(false), selectedDriverId)
  }, [onComplete, order.id, order.total, selectedDriverId])

  const quickAmounts = [
    Math.ceil(order.total / 5) * 5,
    Math.ceil(order.total / 10) * 10,
    Math.ceil(order.total / 20) * 20,
    100,
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4)

  const availableDrivers = drivers.filter(d => !d.isBusy)

  return (
    <div className="flex flex-col h-full bg-background/80 backdrop-blur-2xl">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
        <div className="flex flex-col">
          <h2 className="text-sm font-black text-foreground tracking-tight leading-none mb-1">{t("pos.paymentCash")}</h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">#{order.orderNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          {isAlreadyPaid && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t("pos.paid")}
            </span>
          )}
          <button onClick={onClose} className="size-9 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-rose-500 hover:text-white transition-all">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {order.orderType === "delivery" ? (
        <div className="flex flex-col flex-1 gap-8 p-8 overflow-y-auto">
          <div className="text-center space-y-4">
            <div className="size-20 mx-auto rounded-[2rem] bg-primary/10 flex items-center justify-center shadow-inner border border-primary/10">
              <span className="text-4xl">🛵</span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{t("pos.cashOnDelivery")}</p>
              <p className="text-4xl font-black text-foreground tabular-nums tracking-tighter">{order.total.toLocaleString()} <span className="text-sm opacity-40">{cur}</span></p>
            </div>
            <p className="text-xs font-bold text-muted-foreground/60 leading-relaxed px-4">{t("pos.deliveryNote")}</p>
          </div>

          {drivers.length > 0 && (
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">اختر السائق</label>
              <div className="grid gap-3 max-h-[30vh] overflow-y-auto pe-2 custom-scrollbar">
                {drivers.map(driver => (
                  <button key={driver.id} onClick={() => { if (!driver.isBusy) setSelectedDriverId(driver.id) }}
                    disabled={driver.isBusy}
                    className={cn(
                      "flex items-center gap-4 w-full rounded-[1.5rem] border p-4 text-right transition-all duration-300",
                      selectedDriverId === driver.id
                        ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 scale-[1.02]"
                        : driver.isBusy
                          ? "border-border/30 bg-muted/20 opacity-60 cursor-not-allowed"
                          : "border-border/50 bg-background hover:border-primary/20 hover:bg-muted/30"
                    )}>
                    <div className={cn(
                      "size-12 shrink-0 items-center justify-center rounded-2xl text-base font-black flex shadow-inner",
                      driver.isBusy ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-600"
                    )}>
                      {driver.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-sm font-black text-foreground mb-0.5">{driver.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 font-mono dir-ltr text-left">{driver.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border", 
                        driver.isBusy ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20")}>
                        {driver.isBusy ? "مشغول" : "متاح"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {drivers.length === 0 && !hasDriverAssigned && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-300 text-sm w-full animate-fade-in">
              <span className="text-lg shrink-0">⚠️</span>
              <span className="leading-relaxed">لا يوجد سائقون متاحون — أضف من الإعدادات</span>
            </div>
          )}

          <button onClick={handleDeliveryConfirm}
            disabled={isProcessing}
            className="w-full rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white py-3.5 text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]">
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t("common.processing")}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>✅</span>
                {t("pos.confirmDelivery")}
              </span>
            )}
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto">
            <div className="space-y-1.5">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">{item.quantity}x {fmt(item.price)} {cur}</p>
                  </div>
                  <span className="text-sm font-medium text-foreground tabular-nums">{fmt(item.price * item.quantity)} {cur}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/40">
              <span className="text-xs text-muted-foreground">{t("pos.totalDue")}</span>
              <span className="text-lg font-bold text-foreground tabular-nums">{fmt(order.total)} {cur}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-muted/30">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t("pos.amountPaid")}</label>
                <div className="mt-0.5 text-xl font-bold text-foreground tabular-nums">{cashReceived || "0"} {cur}</div>
              </div>
              <div className={cn("p-3 rounded-xl transition-all", change >= 0 && cashAmount > 0 ? "bg-emerald-50" : "bg-muted/20")}>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t("pos.change")}</label>
                <div className={cn("mt-0.5 text-xl font-bold tabular-nums transition-colors", change >= 0 && cashAmount > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                  {change >= 0 ? `${fmt(change)} ${cur}` : "—"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {quickAmounts.map((amount) => (
                <button key={amount} onClick={() => handleQuickCash(amount)} disabled={isAlreadyPaid}
                  className="py-2 px-2 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground active:scale-95 transition-all disabled:opacity-30">
                  {amount} {cur}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 border-t border-border/50 bg-muted/5">
            <div className="grid grid-cols-3 gap-3 mb-6">
              {["1","2","3","4","5","6","7","8","9",".","0","backspace"].map((key) => (
                <button key={key} onClick={() => handleKeyPress(key)} disabled={isAlreadyPaid}
                  className={cn("h-14 rounded-2xl text-lg font-black transition-all active:scale-90 shadow-sm",
                    key === "backspace" ? "bg-muted text-muted-foreground" : "bg-background text-foreground border border-border/50 hover:border-primary/30 hover:bg-primary/5",
                    isAlreadyPaid && "opacity-30 cursor-not-allowed")}>
                  {key === "backspace" ? (
                    <svg className="size-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                    </svg>
                  ) : key}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleKeyPress("clear")} disabled={isAlreadyPaid}
                className="h-14 rounded-2xl text-xs font-black uppercase tracking-widest bg-muted text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-all active:scale-95 disabled:opacity-30">
                {t("pos.clear")}
              </button>
              <button onClick={handleComplete} disabled={!canComplete || isProcessing}
                className={cn("h-14 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl",
                  !canComplete || isProcessing ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none" : "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02]")}>
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("common.processing")}
                  </span>
                ) : isAlreadyPaid ? t("pos.alreadyPaid") : t("pos.completePayment")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}