"use client"

import type { PosOrderStatus } from "@/lib/pos-types"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/use-translation"

interface OrderFiltersProps {
  activeFilter: PosOrderStatus | null
  onFilterChange: (filter: PosOrderStatus | null) => void
  counts: Record<string, number>
  activeTab?: "active" | "completed"
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  preparing: "bg-blue-50 text-blue-700 border-blue-200",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  out_for_delivery: "bg-purple-50 text-purple-700 border-purple-200",
}

export function OrderFilters({ activeFilter, onFilterChange, counts }: OrderFiltersProps) {
  const { t } = useTranslation()

  const filterDefs: { key: PosOrderStatus; label: string; icon: React.ReactNode }[] = [
    {
      key: "pending",
      label: t("pos.filterNew"),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: "preparing",
      label: t("pos.filterPreparing"),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
          />
        </svg>
      ),
    },
    {
      key: "ready",
      label: t("pos.filterReady"),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      key: "out_for_delivery",
      label: t("pos.filterDelivery"),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
    },
  ]

  return (
    <div className="px-4 lg:px-6 py-3 border-b border-border/50 bg-card/50">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {filterDefs.map((filter) => {
          const isActive = activeFilter === filter.key
          return (
            <button
              key={filter.key}
              onClick={() => onFilterChange(activeFilter === filter.key ? null : filter.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 ease-in-out border",
                isActive
                  ? statusColors[filter.key]
                  : "bg-transparent text-muted-foreground border-transparent hover:bg-muted hover:text-foreground",
              )}
            >
              {filter.icon}
              <span>{filter.label}</span>
              <span className={cn("ms-1 px-1.5 py-0.5 rounded-md text-xs font-semibold", isActive ? "bg-white/50" : "bg-muted")}>
                {counts[filter.key] || 0}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
