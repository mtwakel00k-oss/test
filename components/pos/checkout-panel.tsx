"use client"

import { useState, useCallback } from "react"
import type { PosOrder } from "@/lib/pos-types"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"

interface CheckoutPanelProps {
  order: PosOrder
  onClose: () => void
  onComplete: (orderId: string | number, paid: number, change: number, onError: () => void) => void
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function CheckoutPanel({ order, onClose, onComplete }: CheckoutPanelProps) {
  const { t, lang } = useTranslation()
  const [cashReceived, setCashReceived] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const cur = lang === "ar" ? "د.ج" : "DA"

  const isAlreadyPaid = order.paymentStatus === "paid"

  const cashAmount = parseFloat(cashReceived) || 0
  const change = cashAmount - order.total
  const canComplete = !isAlreadyPaid && change >= 0 && cashAmount > 0

  const handleKeyPress = useCallback(
    (key: string) => {
      if (isAlreadyPaid) return
      if (key === "clear") {
        setCashReceived("")
      } else if (key === "backspace") {
        setCashReceived((prev) => prev.slice(0, -1))
      } else if (key === ".") {
        if (!cashReceived.includes(".")) setCashReceived((prev) => prev + ".")
      } else {
        const newValue = cashReceived + key
        const parts = newValue.split(".")
        if (parts[1]?.length > 2) return
        if (newValue.length > 8) return
        setCashReceived(newValue)
      }
    },
    [cashReceived, isAlreadyPaid],
  )

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
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4)

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("pos.paymentCash")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("pos.table")} {order.tableNumber} &bull; #{order.orderNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAlreadyPaid && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold border border-emerald-500/20">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t("pos.paid")}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors duration-200"
            aria-label={t("common.close")}
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {order.orderType === "delivery" ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="text-5xl">💵</span>
          <div>
            <p className="text-base font-bold text-foreground">الدفع عند الاستلام</p>
            <p className="text-3xl font-black text-primary mt-2">
              {order.total.toLocaleString()} {cur}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              السائق سيجمع المبلغ ويؤكد التوصيل عبر رابطه الخاص
            </p>
          </div>
          <button
            onClick={() => onComplete(order.id, order.total, 0, () => {})}
            disabled={isProcessing}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3.5 text-base font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                جاري...
              </span>
            ) : (
              "✅ تأكيد الإرسال للتوصيل"
            )}
          </button>
        </div>
      ) : (<>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("pos.qty")} {item.quantity} x {fmt(item.price)} {cur}
                </p>
              </div>
              <span className="text-sm font-medium text-foreground">{fmt(item.price * item.quantity)} {cur}</span>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t("pos.totalDue")}</span>
            <span className="text-xl font-bold text-foreground">{fmt(order.total)} {cur}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-secondary/50 rounded-xl p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("pos.amountPaid")}</label>
            <div className="text-3xl font-bold text-foreground mt-1 tracking-tight">{cashReceived || "0"} {cur}</div>
          </div>

          <div
            className={cn(
              "rounded-xl p-4 transition-all duration-300",
              change >= 0 && cashAmount > 0 ? "bg-emerald-50" : "bg-muted/30",
            )}
          >
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("pos.change")}</label>
            <div
              className={cn(
                "text-3xl font-bold mt-1 tracking-tight transition-colors duration-300",
                change >= 0 && cashAmount > 0 ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {change >= 0 ? `${fmt(change)} ${cur}` : "—"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => handleQuickCash(amount)}
              disabled={isAlreadyPaid}
              className={cn(
                "py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 bg-secondary hover:bg-secondary/80 text-secondary-foreground active:scale-95",
                isAlreadyPaid && "opacity-30 cursor-not-allowed",
              )}
            >
              {amount} {cur}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border bg-muted/30">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              disabled={isAlreadyPaid}
              className={cn(
                "h-14 rounded-xl text-lg font-medium transition-all duration-200 active:scale-95",
                key === "backspace"
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  : "bg-card text-foreground hover:bg-muted border border-border/50",
                isAlreadyPaid && "opacity-30 cursor-not-allowed",
              )}
            >
              {key === "backspace" ? (
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                  />
                </svg>
              ) : (
                key
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleKeyPress("clear")}
            disabled={isAlreadyPaid}
            className={cn(
              "h-12 rounded-xl text-sm font-medium transition-all duration-200 bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95",
              isAlreadyPaid && "opacity-30 cursor-not-allowed",
            )}
          >
            {t("pos.clear")}
          </button>
          <button
            onClick={handleComplete}
            disabled={!canComplete || isProcessing}
            className={cn(
              "h-12 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95",
              !canComplete || isProcessing
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t("common.processing")}
              </span>
            ) : isAlreadyPaid ? (
              t("pos.alreadyPaid")
            ) : (
              t("pos.completePayment")
            )}
          </button>
        </div>
      </div>
    </>
    )}
    </div>
  )
}
