"use client"

import { useEffect, useState, useCallback, useMemo, startTransition } from "react"
import { fetchApi } from "@/lib/tenant"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "@/lib/use-translation"
import { TrendingUp, TrendingDown, AlertTriangle, Medal, Crown, ShieldAlert, TimerOff, PackageX, Bike, Check, Users, ShoppingBag, UtensilsCrossed, Truck } from "lucide-react"

type Period = "7d" | "30d" | "6m" | "12m"

interface AvgTicket {
  value: number
  change: number
}

interface DeadStockItem {
  name: string
}

interface CancellationByType {
  type: string
  count: number
}

interface Cancellations {
  total: number
  value: number
  rate: number
  byOrderType: CancellationByType[]
}

interface KitchenRedZone {
  count: number
  totalTracked: number
  totalOrders: number
}

interface DriverItem {
  id: string
  name: string
  completedOrders: number
  cancelledOrders: number
}

interface Drivers {
  hero: DriverItem | null
  all: DriverItem[]
}

interface CashierItem {
  id: string
  name: string
  orders: number
  cancelled: number
}

interface Cashiers {
  hero: CashierItem | null
  mostCancelled: CashierItem | null
  all: CashierItem[]
  avgOrders: number
}

interface OrderTypeCount {
  type: string
  count: number
}

interface OrderTypeBreakdown {
  items: OrderTypeCount[]
  total: number
  maxCount: number
}

interface PremiumAnalyticsData {
  avgTicket: AvgTicket
  deadStock: DeadStockItem[]
  cancellations: Cancellations
  kitchenRedZone: KitchenRedZone
  drivers: Drivers
  cashiers: Cashiers
  orderTypeBreakdown: OrderTypeBreakdown
}

const ORDER_TYPE_KEYS: Record<string, string> = {
  dine_in: "order.type.dineIn",
  takeaway: "order.type.takeaway",
  delivery: "order.type.delivery",
  unknown: "order.type.unknown",
}

const springCard = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 70, damping: 16, delay } },
})

const springRow = (delay: number) => ({
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 90, damping: 18, delay } },
})

export function PremiumAnalytics() {
  const { t, dir } = useTranslation()
  const [period, setPeriod] = useState<Period>("30d")
  const [data, setData] = useState<PremiumAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllDeadStock, setShowAllDeadStock] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchApi(`/api/admin/premium-analytics?period=${period}`)
      if (!res.ok) return null
      return await res.json() as PremiumAnalyticsData
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }, [period])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData().then(data => startTransition(() => setData(data))) }, [fetchData])

  const periods: { key: Period; label: string }[] = useMemo(() => [
    { key: "7d", label: t("period.7d") },
    { key: "30d", label: t("period.30d") },
    { key: "6m", label: t("period.6m") },
    { key: "12m", label: t("period.12m") },
  ], [t])

  const fmtNum = (n: number) => n.toLocaleString("en-US")

  const orderTypeLabel = useCallback((type: string): string => {
    const key = ORDER_TYPE_KEYS[type]
    return key ? t(key) : type
  }, [t])

  const maxCancelCount = useMemo(() => {
    if (!data?.cancellations.byOrderType.length) return 1
    return Math.max(...data.cancellations.byOrderType.map(c => c.count), 1)
  }, [data])

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex w-fit items-center gap-1 rounded-full border border-white/6 bg-white/[0.03] p-0.5 backdrop-blur-sm">
        {periods.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all duration-500 ${
              period === p.key ? "bg-accent/15 text-accent shadow-[var(--shadow-sm)]" : "text-white/40 hover:text-white/70"
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <motion.div key={i} variants={springCard(i * 0.04)} className="bg-card/40 border border-white/5 rounded-2xl p-5 space-y-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10" />
                    <div className="h-3 w-24 rounded-full bg-white/5" />
                  </div>
                  <div className="h-7 w-32 rounded-full bg-white/8" />
                  <div className="h-3 w-20 rounded-full bg-white/5" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : data ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {/* ── Stat Cards Row ── */}
            <motion.div
              initial="initial"
              animate="animate"
              variants={{ animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
            >
              <motion.div variants={springCard(0)}>
                <div className="bg-card/40 border border-white/5 rounded-2xl p-5 space-y-3.5 backdrop-blur-sm card-hover h-full">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{t("analytics.avgTicket")}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[1.625rem] font-semibold tracking-tight text-foreground tabular-nums">{fmtNum(data.avgTicket.value)} <span className="text-xs font-medium text-muted-foreground/60">{t("pos.currency")}</span></h3>
                    {data.avgTicket.change !== 0 && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold gap-0.5 ${data.avgTicket.change > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                        {data.avgTicket.change > 0 ? <TrendingUp className="w-2.5 h-2.5" strokeWidth={2} /> : <TrendingDown className="w-2.5 h-2.5" strokeWidth={2} />}
                        {Math.abs(data.avgTicket.change)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">{t("analytics.compPrevPeriod")}</p>
                </div>
              </motion.div>

              <motion.div variants={springCard(0.04)}>
                <div className="bg-card/40 border border-white/5 rounded-2xl p-5 space-y-3.5 backdrop-blur-sm card-hover h-full">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
                      <ShieldAlert className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{t("analytics.cancellations")}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[1.625rem] font-semibold tracking-tight text-foreground tabular-nums">{fmtNum(data.cancellations.total)}</h3>
                    <span className="text-xs font-medium text-rose-400/80">{data.cancellations.rate}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">{t("analytics.loss")} {fmtNum(data.cancellations.value)} {t("pos.currency")}</p>
                </div>
              </motion.div>

              <motion.div variants={springCard(0.08)}>
                <div className="bg-card/40 border border-white/5 rounded-2xl p-5 space-y-3.5 backdrop-blur-sm card-hover h-full">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                      <PackageX className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{t("analytics.deadStock")}</p>
                  </div>
                  <h3 className="text-[1.625rem] font-semibold tracking-tight text-foreground tabular-nums">{fmtNum(data.deadStock.length)}</h3>
                  <p className="text-[10px] text-muted-foreground/60">{t("analytics.noOrdersInPeriod")}</p>
                </div>
              </motion.div>

              <motion.div variants={springCard(0.12)}>
                <div className="bg-card/40 border border-white/5 rounded-2xl p-5 space-y-3.5 backdrop-blur-sm card-hover h-full">
                  <div className="flex items-center gap-2.5">
                    <div className={`grid size-9 place-items-center rounded-xl ${data.kitchenRedZone.count > 0 ? "bg-destructive/15 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}>
                      <TimerOff className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{t("analytics.kitchenRedZone")}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className={`text-[1.625rem] font-semibold tracking-tight tabular-nums ${data.kitchenRedZone.count > 0 ? "text-destructive" : "text-emerald-500"}`}>{fmtNum(data.kitchenRedZone.count)}</h3>
                    <span className="text-xs font-medium text-muted-foreground">{t("analytics.outOf")} {fmtNum(data.kitchenRedZone.totalTracked)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">{t("analytics.trackedOrders")}</p>
                </div>
              </motion.div>

              <motion.div variants={springCard(0.16)}>
                <div className="bg-card/40 border border-white/5 rounded-2xl p-5 space-y-3.5 backdrop-blur-sm card-hover h-full">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent">
                      <Bike className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{t("analytics.drivers")}</p>
                  </div>
                  <h3 className="text-[1.625rem] font-semibold tracking-tight text-foreground tabular-nums">{fmtNum(data.drivers.all.length)}</h3>
                  <p className="text-[10px] text-muted-foreground/60">{t("analytics.activeDrivers")}</p>
                </div>
              </motion.div>
            </motion.div>

            {/* ── Cancellation Breakdown + Dead Stock Detail Row ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >
              {data.cancellations.byOrderType.length > 0 && (
                <div className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm card-hover">
                  <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                    <span className="w-1 h-1 rounded-full bg-accent/60" />
                    <h3 className="font-display text-sm font-semibold text-white/80">{t("analytics.cancelByType")}</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    {data.cancellations.byOrderType.map((c) => (
                      <div key={c.type} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{orderTypeLabel(c.type)}</span>
                          <span className="font-semibold text-foreground tabular-nums">{fmtNum(c.count)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-rose-500/50 transition-all duration-700"
                            style={{ width: `${(c.count / maxCancelCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.deadStock.length > 0 && (
                <div className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm card-hover">
                  <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                    <span className="w-1 h-1 rounded-full bg-accent/60" />
                    <h3 className="font-display text-sm font-semibold text-white/80">{t("analytics.deadStockDetail")}</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(showAllDeadStock ? data.deadStock : data.deadStock.slice(0, 5)).map((p) => (
                        <span key={p.name} className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400/90 border border-amber-500/10">
                          <span className="w-1 h-1 rounded-full bg-amber-400/50" />
                          {p.name}
                        </span>
                      ))}
                    </div>
                    {data.deadStock.length > 5 && (
                      <button onClick={() => setShowAllDeadStock(!showAllDeadStock)}
                        className="text-xs font-semibold text-amber-400/70 hover:text-amber-400 transition-colors"
                      >
                        {showAllDeadStock ? t("analytics.showLess") : `${t("analytics.showMore")} (${data.deadStock.length - 5})`}
                      </button>
                    )}
                    <p className="text-[10px] text-amber-400/50 font-medium">{t("analytics.notOrderedRecently")}</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* ── Kitchen Red Zone Alert ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.15 }}
              className={`bg-card/40 border-2 rounded-2xl p-6 space-y-4 backdrop-blur-sm shadow-sm card-hover ${data.kitchenRedZone.count > 0 ? "border-destructive/40" : "border-emerald-500/20"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`grid size-10 place-items-center rounded-xl ${data.kitchenRedZone.count > 0 ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-400"}`}>
                  <TimerOff className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{t("analytics.kitchenRedZone")}</h3>
                  <p className="text-[10px] text-muted-foreground">{t("analytics.ordersExceeding30")}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-bold tracking-tight tabular-nums ${data.kitchenRedZone.count > 0 ? "text-destructive" : "text-emerald-400"}`}>
                  {fmtNum(data.kitchenRedZone.count)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {t("analytics.outOf")} {fmtNum(data.kitchenRedZone.totalTracked)} {t("analytics.trackedOrders")}
                </span>
              </div>

              {data.kitchenRedZone.count > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-sm font-semibold">{t("analytics.redZoneWarning")}</span>
                </div>
              )}

              {data.kitchenRedZone.count === 0 && data.kitchenRedZone.totalTracked > 0 && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-4 h-4" strokeWidth={2} />
                  <span className="text-sm font-medium">{t("analytics.noRedZone")}</span>
                </div>
              )}
            </motion.div>

            {/* ── Driver Leaderboard ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.2 }}
              className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm card-hover"
            >
              <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                <span className="w-1 h-1 rounded-full bg-accent/60" />
                <h3 className="font-display text-sm font-semibold text-white/80">{t("analytics.driverRankings")}</h3>
              </div>

              {data.drivers.hero && (
                <div className="mx-5 mt-4 p-4 rounded-2xl bg-gradient-to-l from-amber-500/10 to-amber-500/5 border border-amber-500/15">
                  <div className="flex items-center gap-3">
                    <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-400">
                      <Medal className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-foreground">{data.drivers.hero.name}</span>
                        <Crown className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
                        <span className="text-[10px] font-semibold text-amber-400/70">{t("analytics.deliveryHero")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">{fmtNum(data.drivers.hero.completedOrders)} {t("analytics.completedOrders")}</p>
                    </div>
                  </div>
                </div>
              )}

              {data.drivers.all.length > 0 ? (
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-accent/20">
                        <th className="text-right px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">#</th>
                        <th className="text-right px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("analytics.driver")}</th>
                        <th className="text-center px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("analytics.completed")}</th>
                        <th className="text-center px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("analytics.cancelled")}</th>
                      </tr>
                    </thead>
                    <motion.tbody initial="initial" animate="animate">
                      {data.drivers.all.map((d, i) => (
                        <motion.tr key={d.id} variants={springRow(i * 0.03)}
                          className={`${i < data.drivers.all.length - 1 ? "border-b border-white/[0.02]" : ""} hover:bg-white/[0.015] transition-colors`}
                        >
                          <td className="px-5 py-3 w-10">
                            {i === 0 && data.drivers.hero ? (
                              <div className="grid size-7 place-items-center rounded-full bg-amber-400/15 text-amber-400">
                                <Medal className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-white/20 w-7 block text-center">{i + 1}</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary/60 flex items-center justify-center text-xs font-semibold">
                                {d.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-medium text-white/80 text-sm">{d.name}</span>
                                {i === 0 && data.drivers.hero && (
                                  <span className="mr-2 text-[10px] text-amber-400/60 font-semibold">{t("analytics.hero")}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-center px-5 py-3">
                            <span className="font-semibold text-white/80 tabular-nums">{fmtNum(d.completedOrders)}</span>
                          </td>
                          <td className="text-center px-5 py-3">
                            <span className={`font-semibold tabular-nums ${d.cancelledOrders > 0 ? "text-rose-400" : "text-emerald-400/60"}`}>
                              {fmtNum(d.cancelledOrders)}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center">
                  <div className="flex justify-center mb-3">
                    <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary/60">
                      <Bike className="w-7 h-7" strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white/50">{t("analytics.noDriverData")}</p>
                </div>
              )}
            </motion.div>

            {/* ── Order Type Breakdown ── */}
            {data.orderTypeBreakdown.items.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.25 }}
                className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm card-hover"
              >
                <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                  <span className="w-1 h-1 rounded-full bg-accent/60" />
                  <h3 className="font-display text-sm font-semibold text-white/80">{t("analytics.orderTypeBreakdown")}</h3>
                </div>
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={{ animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5"
                >
                  {(() => {
                    const otIcons: Record<string, typeof ShoppingBag> = {
                      dine_in: UtensilsCrossed,
                      takeaway: ShoppingBag,
                      delivery: Truck,
                    }
                    const otColors: Record<string, string> = {
                      dine_in: "bg-emerald-500/10 text-emerald-500",
                      takeaway: "bg-amber-500/10 text-amber-500",
                      delivery: "bg-accent/10 text-accent",
                    }
                    return data.orderTypeBreakdown.items.map((ot) => {
                      const Icon = otIcons[ot.type] || ShoppingBag
                      const colors = otColors[ot.type] || "bg-primary/10 text-primary"
                      return (
                        <motion.div key={ot.type} variants={springCard(0)}>
                          <div className="bg-card/40 border border-white/5 rounded-2xl p-5 space-y-3 backdrop-blur-sm card-hover h-full">
                            <div className="flex items-center gap-2.5">
                              <div className={`grid size-9 place-items-center rounded-xl ${colors}`}>
                                <Icon className="w-4 h-4" strokeWidth={1.5} />
                              </div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{orderTypeLabel(ot.type)}</p>
                            </div>
                            <h3 className="text-[1.625rem] font-semibold tracking-tight text-foreground tabular-nums">{fmtNum(ot.count)}</h3>
                            <p className="text-[10px] text-muted-foreground/60">
                              {ot.count > 0
                                ? `${Math.round((ot.count / data.orderTypeBreakdown.total) * 100)}% ${t("analytics.ofTotal")}`
                                : t("analytics.noOrders")}
                            </p>
                          </div>
                        </motion.div>
                      )
                    })
                  })()}
                </motion.div>
                <div className="px-5 pb-5 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground/60">{t("analytics.total")}</span>
                  <span className="font-semibold text-foreground tabular-nums">{fmtNum(data.orderTypeBreakdown.total)}</span>
                </div>
              </motion.div>
            )}

            {/* ── Cashier Leaderboard ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.3 }}
              className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm card-hover"
            >
              <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                <span className="w-1 h-1 rounded-full bg-accent/60" />
                <h3 className="font-display text-sm font-semibold text-white/80">{t("analytics.cashierPerformance")}</h3>
              </div>

              {data.cashiers.all.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-accent/20">
                        <th className="text-right px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">#</th>
                        <th className="text-right px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("analytics.cashier")}</th>
                        <th className="text-center px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("analytics.cashierOrders")}</th>
                        <th className="text-center px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("analytics.cashierCancelled")}</th>
                      </tr>
                    </thead>
                    <motion.tbody initial="initial" animate="animate">
                      {data.cashiers.all.map((c, i) => (
                        <motion.tr key={c.id} variants={springRow(i * 0.03)}
                          className={`${i < data.cashiers.all.length - 1 ? "border-b border-white/[0.02]" : ""} hover:bg-white/[0.015] transition-colors`}
                        >
                          <td className="px-5 py-3 w-10">
                            {i === 0 && data.cashiers.hero ? (
                              <div className="grid size-7 place-items-center rounded-full bg-amber-400/15 text-amber-400">
                                <Medal className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-white/20 w-7 block text-center">{i + 1}</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary/60 flex items-center justify-center text-xs font-semibold">
                                {c.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-medium text-white/80 text-sm">{c.name}</span>
                                {i === 0 && data.cashiers.hero && (
                                  <span className="mr-2 text-[10px] text-amber-400/60 font-semibold">{t("analytics.hero")}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-center px-5 py-3">
                            <span className="font-semibold text-white/80 tabular-nums">{fmtNum(c.orders)}</span>
                          </td>
                          <td className="text-center px-5 py-3">
                            <span className={`font-semibold tabular-nums ${c.cancelled > 0 ? "text-rose-400" : "text-emerald-400/60"}`}>
                              {fmtNum(c.cancelled)}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
              )}

              {data.cashiers.all.length === 0 && (
                <div className="p-10 text-center">
                  <div className="flex justify-center mb-3">
                    <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary/60">
                      <Users className="w-7 h-7" strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white/50">{t("analytics.noCashierData")}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <p className="text-sm text-white/40">{t("analytics.noData")}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PremiumAnalytics
