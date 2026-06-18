"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"
import { motion } from "framer-motion"
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
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}>
      <div className="premium-bezel h-full">
        <Card className="premium-bezel-inner h-full border-0 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-[18px]">
                    {icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
                    {isLive && (
                      <span className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-emerald-500">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t("common.live")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</h3>
                  {suffix && <span className="text-xs font-medium text-muted-foreground">{suffix}</span>}
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                    isPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600",
                  )}>
                    {isPositive ? "↑" : "↓"} {Math.abs(change)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">{t("common.vsYesterday")}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
