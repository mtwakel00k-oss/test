"use client"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"

interface OrderTabsProps {
  activeTab: "active" | "completed"
  onTabChange: (tab: "active" | "completed") => void
  counts: { active: number; completed: number }
}

export function OrderTabs({ activeTab, onTabChange, counts }: OrderTabsProps) {
  const { t } = useTranslation()

  return (
    <div className="px-4 lg:px-5 py-2.5 border-b border-border/50 bg-card/20">
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 w-fit">
        <button onClick={() => onTabChange("active")}
          className={cn("relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            activeTab === "active"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")}>
          <span className={cn("w-1.5 h-1.5 rounded-full transition-all", activeTab === "active" ? "bg-amber-500 animate-pulse" : "bg-muted-foreground/30")} />
          {t("pos.activeTab")}
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums",
            activeTab === "active" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400" : "bg-muted text-muted-foreground")}>
            {counts.active}
          </span>
        </button>
        <button onClick={() => onTabChange("completed")}
          className={cn("relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            activeTab === "completed"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")}>
          <svg className={cn("w-3.5 h-3.5 transition-all", activeTab === "completed" ? "text-primary" : "text-muted-foreground/50")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {t("pos.completedTab")}
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums",
            activeTab === "completed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            {counts.completed}
          </span>
        </button>
      </div>
    </div>
  )
}
