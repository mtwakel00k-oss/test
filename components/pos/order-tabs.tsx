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
    <div className="px-4 lg:px-5 py-2 border-b border-border/50 bg-muted/10">
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 w-fit">
        <button onClick={() => onTabChange("active")}
          className={cn("relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            activeTab === "active"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")}>
          {t("pos.activeTab")}
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums",
            activeTab === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            {counts.active}
          </span>
        </button>
        <button onClick={() => onTabChange("completed")}
          className={cn("relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            activeTab === "completed"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")}>
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
