"use client"

import { useState, useCallback } from "react"
import type { PosOrder } from "@/lib/pos-types"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"

interface CheckoutPanelProps {
  order: PosOrder
  onClose: () => void
  onComplete: (orderId: string | number, paid: number, change: number, onError: () => void) => void
  hasDriverAssigned?: boolean
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function CheckoutPanel({ order, onClose, onComplete, hasDriverAssigned = true }: CheckoutPanelProps) {
  const { t, lang } = useTranslation()
  const [cashReceived, setCashReceived] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
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

  const quickAmounts = [
    Math.ceil(order.total / 5) * 5,
    Math.ceil(order.total / 10) * 10,
    Math.ceil(order.total / 20) * 20,
    100,
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4)

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("pos.paymentCash")}</h2>
          <p className="text-xs text-muted-foreground">#{order.orderNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAlreadyPaid && (
            <span className="badge-emerald badge">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t("pos.paid")}
            </span>
          )}
          <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted transition-colors">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {order.orderType === "delivery" ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/5">
            <span className="text-3xl">💵</span>
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{t("pos.cashOnDelivery")}</p>
            <p className="mt-2 text-2xl font-black text-primary tabular-nums">{order.total.toLocaleString()} {cur}</p>
            <p className="mt-2 text-xs text-muted-foreground max-w-xs">{t("pos.deliveryNote")}</p>
          </div>
          {!hasDriverAssigned && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-300 text-sm w-full max-w-xs animate-fade-in">
              <span className="text-lg shrink-0">⚠️</span>
              <span className="leading-relaxed">لم يُعيَّن سائق بعد</span>
            </div>
          )}
          <button onClick={() => { setIsProcessing(true); onComplete(order.id, order.total, 0, () => setIsProcessing(false)) }}
            disabled={isProcessing}
            className="w-full max-w-xs rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white py-3.5 text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]">
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

          <div className="px-4 py-3 border-t border-border bg-muted/10">
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {["1","2","3","4","5","6","7","8","9",".","0","backspace"].map((key) => (
                <button key={key} onClick={() => handleKeyPress(key)} disabled={isAlreadyPaid}
                  className={cn("h-12 rounded-lg text-base font-medium transition-all active:scale-90",
                    key === "backspace" ? "bg-secondary text-secondary-foreground" : "bg-card text-foreground border border-border/40 hover:bg-muted",
                    isAlreadyPaid && "opacity-30 cursor-not-allowed")}>
                  {key === "backspace" ? (
                    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                    </svg>
                  ) : key}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleKeyPress("clear")} disabled={isAlreadyPaid}
                className="h-11 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 transition-all disabled:opacity-30">
                {t("pos.clear")}
              </button>
              <button onClick={handleComplete} disabled={!canComplete || isProcessing}
                className={cn("h-11 rounded-lg text-sm font-semibold transition-all active:scale-95",
                  !canComplete || isProcessing ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:brightness-110")}>
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
