"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"
import type { ReactNode } from "react"

interface StatCardProps {
  title: string
  value: string
  change: number
  icon: ReactNode
  trend: "up" | "down"
  suffix?: string
  isLive?: boolean
}

export function StatCard({ title, value, change, icon, trend, suffix, isLive }: StatCardProps) {
  const { t } = useTranslation()
  const isPositive = trend === "up"

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card hover:border-border transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {isLive && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-500 font-medium">{t("common.live")}</span>
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl font-bold text-foreground tracking-tight">{value}</h3>
              {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                  isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500",
                )}
              >
                {isPositive ? "+" : "-"}{Math.abs(change)}%
              </span>
              <span className="text-xs text-muted-foreground">{t("common.vsYesterday")}</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center [&_svg]:h-6 [&_svg]:w-6 [&_svg]:text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
