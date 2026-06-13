"use client"

import { useState } from "react"
import { logger } from "@/lib/logger"
import { fetchApi } from "@/lib/tenant"
import { t } from "@/lib/translations"
import { useLang } from "@/lib/lang-context"

export default function RatingWidget({ productId, orderId, onRated }: { productId: number | string; orderId?: string; onRated: () => void }) {
  const lang = useLang()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (star?: number) => {
    const r = star || rating
    if (r === 0 || submitting) return
    setRating(r)
    setSubmitting(true)
    try {
      const res = await fetchApi("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, order_id: orderId, rating: r, comment: comment || undefined }),
      })
      if (!res.ok) throw new Error("Failed to submit rating")
      setDone(true)
      onRated()
      logger.info("Rating submitted", { productId, rating: r })
    } catch (e) {
      logger.error("Rating submission failed", e)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 animate-fade-in">
        <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[10px] font-black uppercase tracking-widest">{t("rating.thanks", lang)}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 ms-6">
      <div className="flex items-center gap-3">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => submit(n)} disabled={submitting}
            className={`size-10 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 ${
              n <= rating 
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-110" 
                : "bg-muted/50 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground"
            }`}>
            <svg className="size-5" fill={n <= rating ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        ))}
      </div>
      <textarea placeholder={t("rating.feedbackPlaceholder", lang)}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={submitting}
        className="w-full rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-xs font-bold text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-background transition-all disabled:opacity-50"
        rows={1}
        onInput={(e) => {
          const el = e.currentTarget
          el.style.height = "auto"
          el.style.height = `${el.scrollHeight}px`
        }}
      />
    </div>
  )
}
