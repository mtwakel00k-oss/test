"use client"

import { useState, useEffect } from "react"
import { Star, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"

interface ReviewItem {
  id: string
  rating: number
  text: string | null
  timestamp: Date | string
}

interface ReviewsFeedProps {
  reviews: ReviewItem[]
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn("h-3.5 w-3.5", star <= rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted")}
        />
      ))}
    </div>
  )
}

export function ReviewsFeed({ reviews }: ReviewsFeedProps) {
  const { t, lang } = useTranslation()
  const items = reviews || []
  const averageRating = items.length
    ? items.reduce((acc, r) => acc + r.rating, 0) / items.length
    : 0

  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    const timeoutId = setTimeout(() => setNow(Date.now()), 0)
    return () => {
      clearInterval(id)
      clearTimeout(timeoutId)
    }
  }, [])

  function formatTimeAgo(date: Date | string): string {
    try {
      if (now === null) return "—"
      const d = typeof date === "string" ? new Date(date) : date
      const diffMs = now - d.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return t("time.justNow")
      if (diffMins === 1) return t("time.minAgo")
      if (diffMins < 60) return `${t("time.minsAgo")} ${diffMins}`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours === 1) return t("time.hourAgo")
      if (diffHours < 24) return `${t("time.hoursAgo")} ${diffHours}`
      return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short" }).format(d)
    } catch {
      return "—"
    }
  }

  return (
    <Card className="border-border/50 bg-card h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              {t("admin.reviews")}
              {items.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-500 font-medium">{t("common.live")}</span>
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("admin.latestReviews")}</p>
          </div>
          <div className="text-end">
            <div className="flex items-center gap-1 justify-end">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-lg font-bold text-foreground">{averageRating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{items.length} {t("admin.review")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0 overflow-hidden">
        <ScrollArea className="h-[420px] pe-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Star className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">{t("admin.noReviews")}</p>
              <p className="text-xs mt-1">{t("admin.reviewsHere")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((review) => (
                <div key={review.id} className="p-4 rounded-lg border border-border/50 bg-secondary/30 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <StarRating rating={review.rating} />
                  </div>
                  {review.text && <p className="text-sm text-foreground/90 leading-relaxed">&ldquo;{review.text}&rdquo;</p>}
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">{formatTimeAgo(review.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
