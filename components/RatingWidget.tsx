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
      <div className="flex items-center gap-2 text-emerald-500">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-medium">{t("rating.thanks", lang)}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 ms-6">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => submit(n)} disabled={submitting}
            className={`shrink-0 transition-all duration-150 active:scale-90 ${n <= rating ? "text-amber-400 scale-110" : "text-zinc-600 hover:text-zinc-400"}`}
            style={{ fontSize: "1.75rem", lineHeight: 1, width: "2rem", height: "2rem" }}>
            {n <= rating ? "\u2605" : "\u2606"}
          </button>
        ))}
      </div>
      <textarea placeholder={t("rating.feedbackPlaceholder", lang)}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={submitting}
        className="w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-50 transition-all duration-200"
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
