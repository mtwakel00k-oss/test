"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, Wallet } from "lucide-react"
import { fetchApi } from "@/lib/tenant"
import { useTranslation } from "@/lib/use-translation"
import { cn } from "@/lib/utils"

interface EarningsData {
  platformEarnings: number
  prevEarnings: number
  subscriptionRevenue: number
  commissionRevenue: number
  activeTenants: number
  totalTenants: number
  prevActiveTenants: number
  totalRevenue: number
  prevRevenue: number
  todayOrders: number
}

function StatCard({ icon: Icon, label, value, prev, format, dir }: {
  icon: React.ElementType
  label: string
  value: number
  prev?: number
  format?: (v: number) => string
  dir: string
}) {
  const fmt = format || ((v: number) => v.toLocaleString())
  const change = prev !== undefined && prev > 0 ? ((value - prev) / prev) * 100 : 0
  const isUp = change >= 0
  return (
    <div className="rounded-2xl bg-card/50 backdrop-blur-xl border border-border/50 p-5 space-y-3 hover:shadow-xl hover:border-primary/20 transition-all duration-500 group">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">{label}</span>
        <div className="size-9 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-500">
          <Icon className="size-4 text-primary" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-2xl font-black tabular-nums text-foreground tracking-tight" dir={dir === "ar" ? "ltr" : undefined}>
        {fmt(value)}
      </p>
      {prev !== undefined && (
        <div className={cn("flex items-center gap-1.5 text-[11px] font-bold", isUp ? "text-malachite" : "text-destructive")}>
          {isUp ? <TrendingUp className="size-3.5" strokeWidth={2.5} /> : <TrendingDown className="size-3.5" strokeWidth={2.5} />}
          <span>{isUp ? "+" : ""}{change.toFixed(1)}%</span>
          <span className="text-muted-foreground/50 font-medium">vs last month</span>
        </div>
      )}
    </div>
  )
}

export function EarningsOverview() {
  const { t, dir } = useTranslation()
  const [data, setData] = useState<EarningsData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchApi("/api/admin/stats?mode=root")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setData(d)
        else setError(true)
      })
      .catch(() => setError(true))
  }, [])

  const fmtCurrency = (v: number) => `${v.toLocaleString()} DA`

  if (error || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-card/30 border border-border/30 p-5 space-y-3 animate-premium-pulse"
            style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="h-3 w-20 rounded-full bg-muted/60" />
            <div className="h-8 w-28 rounded-xl bg-muted/60" />
            <div className="h-3 w-16 rounded-full bg-muted/40" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <StatCard
        icon={DollarSign}
        label={t("admin.platformEarnings") || "Platform Earnings"}
        value={data.platformEarnings}
        prev={data.prevEarnings}
        format={fmtCurrency}
        dir={dir}
      />
      <StatCard
        icon={Wallet}
        label={t("admin.subscriptionRevenue") || "Subscriptions"}
        value={data.subscriptionRevenue}
        format={fmtCurrency}
        dir={dir}
      />
      <StatCard
        icon={ShoppingBag}
        label={t("admin.commissionRevenue") || "Commissions"}
        value={data.commissionRevenue}
        format={fmtCurrency}
        dir={dir}
      />
      <StatCard
        icon={Users}
        label={t("admin.activeTenants") || "Active Restaurants"}
        value={data.activeTenants}
        prev={data.prevActiveTenants}
        dir={dir}
      />
      <StatCard
        icon={TrendingUp}
        label={t("admin.totalRevenue") || "Orders Revenue"}
        value={data.totalRevenue}
        prev={data.prevRevenue}
        format={fmtCurrency}
        dir={dir}
      />
    </div>
  )
}
