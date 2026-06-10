"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { logger } from "@/lib/logger"
import { fetchApi } from "@/lib/tenant"
import { useTranslation } from "@/lib/use-translation"

interface RatingSectionProps {
  productId: number
  isVisible: boolean
}

export function RatingSection({ productId, isVisible }: RatingSectionProps) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [review, setReview] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const STARS = ["", t("rating.bad"), t("rating.acceptable"), t("rating.good"), t("rating.veryGood"), t("rating.excellent")]

  const handleSubmit = async () => {
    if (rating === 0) return
    setIsSubmitting(true)
    try {
      const res = await fetchApi("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, rating, comment: review || undefined }),
      })
      if (!res.ok) throw new Error("Failed to submit rating")
      setIsSubmitted(true)
      logger.info("Rating submitted", { productId, rating })
    } catch {
      logger.error("Rating submission failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isVisible) return null

  if (isSubmitted) {
    return (
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-card rounded-2xl p-6 border border-border text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{t("rating.thanksTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("rating.thanksMsg")}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-lg font-semibold text-foreground mb-4">{t("rating.rateOrder")}</h2>
      <div className="bg-card rounded-2xl p-6 border border-border space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)} onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                aria-label={`${star} ${t("rating.of5")}`}
              >
                <svg width="40" height="40" viewBox="0 0 24 24"
                  className={cn("transition-colors duration-200", (hoveredRating || rating) >= star ? "text-primary fill-primary" : "text-muted-foreground/30 fill-transparent")}
                  stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {rating === 0 ? t("rating.clickToStart") : STARS[rating]}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="review" className="text-sm font-medium text-foreground">
            {t("rating.shareFeedback")} <span className="text-muted-foreground font-normal">{t("rating.optional")}</span>
          </label>
          <Textarea id="review" placeholder={t("rating.writeHere")} value={review}
            onChange={(e) => setReview(e.target.value)} className="min-h-[100px] bg-secondary border-border resize-none focus:ring-primary" />
        </div>

        <Button onClick={handleSubmit} disabled={rating === 0 || isSubmitting}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t("rating.sending")}
            </span>
          ) : t("rating.submit")}
        </Button>
      </div>
    </section>
  )
}
