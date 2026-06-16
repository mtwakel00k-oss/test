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
    <div className="px-4 lg:px-6 py-4 border-b border-border/30 bg-card/30">
      <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl w-fit">
        <button
          onClick={() => onTabChange("active")}
          className={cn(
            "relative flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out",
            activeTab === "active"
              ? "bg-card text-foreground shadow-lg shadow-black/20"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              activeTab === "active" ? "bg-amber-500 animate-pulse" : "bg-muted-foreground/30",
            )}
          />
          <span>{t("pos.activeTab")}</span>
          <span
            className={cn(
              "me-1 px-2 py-0.5 rounded-md text-xs font-semibold transition-all duration-300",
              activeTab === "active" ? "bg-amber-500/15 text-amber-400" : "bg-secondary text-muted-foreground",
            )}
          >
            {counts.active}
          </span>
        </button>

        <button
          onClick={() => onTabChange("completed")}
          className={cn(
            "relative flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out",
            activeTab === "completed"
              ? "bg-card text-foreground shadow-lg shadow-black/20"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <svg
            className={cn("w-4 h-4 transition-all duration-300", activeTab === "completed" ? "text-primary" : "text-muted-foreground/50")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{t("pos.completedTab")}</span>
          <span
            className={cn(
              "me-1 px-2 py-0.5 rounded-md text-xs font-semibold transition-all duration-300",
              activeTab === "completed" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
            )}
          >
            {counts.completed}
          </span>
        </button>
      </div>
    </div>
  )
}
