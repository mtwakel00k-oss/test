"use client"

import type { PosOrderStatus } from "@/lib/pos-types"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"

interface OrderFiltersProps {
  activeFilter: PosOrderStatus | null
  onFilterChange: (filter: PosOrderStatus | null) => void
  counts: Record<string, number>
}

const FILTER_CONFIG: Record<string, { label: string; color: string }> = {
  pending: {
    label: "filterNew",
    color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700",
  },
  preparing: {
    label: "filterPreparing",
    color: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-700",
  },
  ready: {
    label: "filterReady",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700",
  },
  out_for_delivery: {
    label: "filterDelivery",
    color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700",
  },
}

export function OrderFilters({ activeFilter, onFilterChange, counts }: OrderFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className="px-4 lg:px-5 py-2 border-b border-border/20 bg-muted/5">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {Object.entries(FILTER_CONFIG).map(([key, cfg]) => {
          const isActive = activeFilter === key
          return (
            <button key={key} onClick={() => onFilterChange(isActive ? null : key as PosOrderStatus)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all border",
                isActive ? cfg.color : "bg-transparent text-muted-foreground border-transparent hover:bg-muted hover:text-foreground")}>
              <span>{t(`pos.${cfg.label}`)}</span>
              <span className={cn("px-1 py-0.5 rounded text-[10px] font-semibold tabular-nums", isActive ? "bg-white/30 dark:bg-black/20" : "bg-muted")}>
                {counts[key] || 0}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
