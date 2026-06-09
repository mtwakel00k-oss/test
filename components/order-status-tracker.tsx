"use client"

import { cn } from "@/lib/utils"
import { ChefHatIcon } from "./icons/chef-hat-icon"
import { ServingIcon } from "./icons/serving-icon"
import { useTranslation } from "@/lib/use-translation"

interface Stage {
  id: number
  dbStatus: string
  title: string
  subtitle: string
  icon: React.ComponentType<{ isActive: boolean; isCurrent: boolean }>
}

export function OrderStatusTracker({
  currentStage,
  orderType = "dine_in",
}: {
  currentStage: number
  orderType?: "dine_in" | "takeaway" | "delivery"
}) {
  const { t } = useTranslation()

  const baseStages: Stage[] = [
    { id: 1, dbStatus: "pending",   title: t("track.received"),  subtitle: t("track.receivedSub"),  icon: ChefHatIcon },
    { id: 2, dbStatus: "preparing", title: t("track.preparing"), subtitle: t("track.preparingSub"), icon: ChefHatIcon },
    { id: 3, dbStatus: "ready",     title: t("track.ready"),     subtitle: t("track.readySub"),     icon: ServingIcon },
  ]

  const stages = orderType === "delivery"
    ? [
        ...baseStages,
        { id: 4, dbStatus: "out_for_delivery", title: t("track.outForDelivery"), subtitle: t("track.outForDeliverySub"), icon: ServingIcon },
      ]
    : baseStages

  function clampStage(value: number): number {
    if (value < 1) return 1
    if (value > stages.length) return stages.length
    return value
  }

  const clamped = clampStage(currentStage)

  return (
    <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
      <div className="px-5 py-4 md:px-6 md:py-5">
        <div className="md:hidden space-y-0">
          {stages.map((stage, index) => {
            const isActive = clamped >= stage.id
            const isCurrent = clamped === stage.id
            const isLast = index === stages.length - 1
            const Icon = stage.icon

            return (
              <div key={stage.id} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative shrink-0",
                    isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "bg-secondary text-muted-foreground"
                  )}>
                    <div className={cn("transition-transform duration-500", isCurrent && "scale-110")}>
                      <Icon isActive={isActive} isCurrent={isCurrent} />
                    </div>
                    {isCurrent && <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/25" />}
                  </div>
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 h-10 transition-all duration-700 relative overflow-hidden",
                      "after:absolute after:inset-0 after:bg-gradient-to-b after:from-primary after:to-primary after:transition-transform after:duration-700",
                      clamped > stage.id ? "after:scale-y-100" : "after:scale-y-0 after:origin-top"
                    )} />
                  )}
                </div>
                <div className={cn("flex-1", isLast ? "pt-2.5" : "pt-2.5 pb-6")}>
                  <div className={cn(
                    "flex items-center gap-2 transition-all duration-300",
                    isActive ? "opacity-100 translate-y-0" : "opacity-60"
                  )}>
                    <div className={cn(
                      "size-1.5 rounded-full transition-colors duration-300",
                      isActive ? "bg-primary" : "bg-muted-foreground/40"
                    )} />
                    <h3 className={cn(
                      "text-sm font-semibold transition-colors duration-300",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {stage.title}
                    </h3>
                  </div>
                  <p className={cn(
                    "text-xs ms-3.5 mt-0.5 transition-all duration-300",
                    isActive ? "text-muted-foreground" : "text-muted-foreground/40"
                  )}>
                    {stage.subtitle}
                  </p>
                  {isCurrent && stage.id === stages.length && (
                    <div className="mt-3 ms-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs font-semibold">{t("order.status.completed")}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="hidden md:block">
          <div className="flex items-start justify-between relative">
            <div className="absolute top-6 left-[calc(100%/6)] right-[calc(100%/6)] h-1 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: clamped >= stages.length ? "100%" : `${((clamped - 1) / (stages.length - 1)) * 100}%` }}
              />
            </div>
            {stages.map((stage) => {
              const isActive = clamped >= stage.id
              const isCurrent = clamped === stage.id
              const Icon = stage.icon
              return (
                <div key={stage.id} className="flex flex-col items-center z-10 flex-1">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative",
                    isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "bg-secondary text-muted-foreground"
                  )}>
                    <Icon isActive={isActive} isCurrent={isCurrent} />
                    {isCurrent && <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/25" />}
                  </div>
                  <h3 className={cn("text-sm font-semibold mt-3 text-center transition-colors duration-300", isActive ? "text-foreground" : "text-muted-foreground")}>{stage.title}</h3>
                  <p className={cn("text-xs text-center mt-0.5 max-w-[100px] transition-colors duration-300", isActive ? "text-muted-foreground" : "text-muted-foreground/40")}>{stage.subtitle}</p>
                  {isCurrent && stage.id === stages.length && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs font-semibold">{t("order.status.completed")}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
