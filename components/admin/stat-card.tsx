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
    <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-xl hover:border-primary/30 transition-all duration-500 rounded-[2rem] shadow-sm hover:shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <CardContent className="p-8">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center [&_svg]:size-5 [&_svg]:text-primary shadow-inner border border-primary/10">
                {icon}
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-1">{title}</p>
                {isLive && (
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-wider">{t("common.live")}</span>
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-3xl font-black text-foreground tracking-tight">{value}</h3>
              {suffix && <span className="text-sm font-bold text-muted-foreground uppercase">{suffix}</span>}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider",
                  isPositive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20",
                )}
              >
                {isPositive ? "↑" : "↓"} {Math.abs(change)}%
              </span>
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">{t("common.vsYesterday")}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
