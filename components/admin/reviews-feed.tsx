"use client"

import { useState, useEffect } from "react"
import { Star, Clock } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
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
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl h-full flex flex-col rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              {t("admin.reviews")}
              {items.length > 0 && (
                <span className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">{t("common.live")}</span>
                </span>
              )}
            </CardTitle>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{t("admin.latestReviews")}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="text-lg font-black text-amber-600 tabular-nums">{averageRating.toFixed(1)}</span>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{items.length} {t("admin.review")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0 overflow-hidden">
        <ScrollArea className="h-[420px] pe-4">
          {items.length === 0 ? (
            <EmptyState icon={<Star className="h-16 w-16" />} title={t("admin.noReviews")} description={t("admin.reviewsHere")} />
          ) : (
            <div className="space-y-4 px-2">
              {items.map((review) => (
                <div key={review.id} className="p-6 rounded-[1.5rem] border border-border/50 bg-muted/30 hover:bg-background hover:shadow-xl hover:border-primary/20 transition-all duration-300 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <StarRating rating={review.rating} />
                    <div className="flex items-center gap-1.5 text-muted-foreground/50">
                      <Clock className="size-3" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{formatTimeAgo(review.timestamp)}</span>
                    </div>
                  </div>
                  {review.text && <p className="text-sm font-medium text-foreground/80 leading-relaxed">&ldquo;{review.text}&rdquo;</p>}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
