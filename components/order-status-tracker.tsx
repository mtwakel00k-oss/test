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
    <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-sm">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-base font-bold text-foreground">حالة الطلب</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{stages[clamped - 1]?.subtitle ?? ""}</p>
      </div>

      <div className="flex items-center justify-center py-4 relative h-28">
        <div
          className="text-6xl select-none"
          style={{
            animation: "deliveryBounce 1.8s ease-in-out infinite",
            filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.4))",
          }}
        >
          {clamped >= stages.length ? "\u2705" : clamped >= 2 ? "\uD83D\uDC68\u200D\uD83C\uDF73" : "\uD83E\uDDFE"}
        </div>
        <div className="absolute bottom-4 w-16 h-4 bg-primary/30 rounded-full blur-md" />
      </div>

      <div className="px-5 pb-2">
        <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out bg-primary"
            style={{
              width: `${((clamped - 1) / (stages.length - 1)) * 100}%`,
              boxShadow: "0 0 12px rgba(var(--primary-shadow, 99,102,241), 0.5)",
            }}
          />
          {clamped < stages.length && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-primary bg-card transition-all duration-700"
              style={{ left: `calc(${((clamped - 1) / (stages.length - 1)) * 100}% - 8px)` }}
            />
          )}
        </div>

        <div className="flex justify-between mt-3 gap-1">
          {stages.map((stage) => {
            const isActive = clamped === stage.id
            const isPast   = clamped > stage.id
            return (
              <div key={stage.id} className="flex-1 text-center">
                <span className={cn(
                  "text-[10px] font-semibold leading-tight block transition-colors",
                  isActive && "text-primary",
                  isPast && !isActive && "text-foreground/50",
                  !isActive && !isPast && "text-muted-foreground/40",
                )}>
                  {stage.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="h-4" />
    </div>
  )
}
