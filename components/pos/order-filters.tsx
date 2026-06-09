"use client"

import type { PosOrderStatus } from "@/lib/pos-types"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"

interface OrderFiltersProps {
  activeFilter: PosOrderStatus | null
  onFilterChange: (filter: PosOrderStatus | null) => void
  counts: Record<string, number>
}

const FILTER_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "filterNew", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800",
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  preparing: {
    label: "filterPreparing", color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-300 dark:border-sky-800",
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
  },
  ready: {
    label: "filterReady", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800",
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  },
  out_for_delivery: {
    label: "filterDelivery", color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-300 dark:border-violet-800",
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
  },
}

export function OrderFilters({ activeFilter, onFilterChange, counts }: OrderFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className="px-4 lg:px-5 py-2 border-b border-border/30 bg-card/10">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {Object.entries(FILTER_CONFIG).map(([key, cfg]) => {
          const isActive = activeFilter === key
          return (
            <button key={key} onClick={() => onFilterChange(isActive ? null : key as PosOrderStatus)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all border",
                isActive ? cfg.color : "bg-transparent text-muted-foreground border-transparent hover:bg-muted hover:text-foreground")}>
              {cfg.icon}
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
