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
    <div className="bg-card/50 backdrop-blur-3xl rounded-[2.5rem] border border-border/50 overflow-hidden shadow-2xl">
      <div className="p-8 lg:p-12">
        <div className="md:hidden space-y-8">
          {stages.map((stage, index) => {
            const isActive = clamped >= stage.id
            const isCurrent = clamped === stage.id
            const isLast = index === stages.length - 1
            const Icon = stage.icon

            return (
              <div key={stage.id} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "size-14 rounded-2xl flex items-center justify-center transition-all duration-500 relative shrink-0",
                    isActive ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-muted/50 text-muted-foreground/40"
                  )}>
                    <div className={cn("transition-transform duration-500", isCurrent && "scale-110")}>
                      <Icon isActive={isActive} isCurrent={isCurrent} />
                    </div>
                    {isCurrent && <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/20" />}
                  </div>
                  {!isLast && (
                    <div className={cn(
                      "w-1 h-12 mt-2 rounded-full transition-all duration-700 relative overflow-hidden bg-muted/50",
                      clamped > stage.id ? "bg-primary/20" : ""
                    )}>
                      <div className={cn(
                        "absolute inset-0 bg-primary transition-transform duration-700 origin-top",
                        clamped > stage.id ? "scale-y-100" : "scale-y-0"
                      )} />
                    </div>
                  )}
                </div>
                <div className={cn("flex-1", isLast ? "pt-2" : "pt-2 pb-2")}>
                  <div className={cn(
                    "flex flex-col transition-all duration-500",
                    isActive ? "opacity-100" : "opacity-40"
                  )}>
                    <h3 className={cn(
                      "text-base font-black tracking-tight leading-none mb-1.5",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {stage.title}
                    </h3>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none">
                      {stage.subtitle}
                    </p>
                  </div>
                  {isCurrent && stage.id === stages.length && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">{t("order.status.completed")}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="hidden md:block">
          <div className="flex items-start justify-between relative">
            <div className="absolute top-7 left-[calc(100%/6)] right-[calc(100%/6)] h-1.5 bg-muted/50 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-lg shadow-primary/20"
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
                    "size-14 rounded-2xl flex items-center justify-center transition-all duration-500 relative",
                    isActive ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-muted/50 text-muted-foreground/40"
                  )}>
                    <Icon isActive={isActive} isCurrent={isCurrent} />
                    {isCurrent && <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/20" />}
                  </div>
                  <h3 className={cn("text-sm font-black mt-4 text-center tracking-tight transition-colors duration-500", isActive ? "text-foreground" : "text-muted-foreground")}>{stage.title}</h3>
                  <p className={cn("text-[10px] font-bold text-center mt-1 max-w-[120px] uppercase tracking-widest transition-colors duration-500", isActive ? "text-muted-foreground/60" : "text-muted-foreground/20")}>{stage.subtitle}</p>
                  {isCurrent && stage.id === stages.length && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">{t("order.status.completed")}</span>
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
