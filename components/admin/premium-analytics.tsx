"use client"

import { useEffect, useState, useCallback, useMemo, startTransition } from "react"
import { fetchApi } from "@/lib/tenant"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "@/lib/use-translation"

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

interface PremiumAnalyticsData {
  avgTicket: AvgTicket
  deadStock: DeadStockItem[]
  cancellations: Cancellations
  kitchenRedZone: KitchenRedZone
  drivers: Drivers
}

const ORDER_TYPE_KEYS: Record<string, string> = {
  dine_in: "order.type.dineIn",
  takeaway: "order.type.takeaway",
  delivery: "order.type.delivery",
  unknown: "order.type.unknown",
}

const springTransition = { type: "spring" as const, stiffness: 90, damping: 16 }

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function TrendingDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  )
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function MedalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

function ShieldAlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <path d="M3 20h18" />
    </svg>
  )
}

function TimerOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  )
}

function PackageXIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
      <line x1="17" y1="13" x2="22" y2="18" />
      <line x1="22" y1="13" x2="17" y2="18" />
    </svg>
  )
}

function BikeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18" cy="17.5" r="3.5" />
      <line x1="15" y1="6.5" x2="15" y2="12" />
      <line x1="8.5" y1="12" x2="18" y2="12" />
      <polyline points="9 11 11 8 15 8 18 12" />
      <line x1="5.5" y1="17.5" x2="8" y2="12" />
      <line x1="18" y1="17.5" x2="15" y2="12" />
    </svg>
  )
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

export function PremiumAnalytics() {
  const { t, dir } = useTranslation()
  const [period, setPeriod] = useState<Period>("30d")
  const [data, setData] = useState<PremiumAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

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
              period === p.key ? "bg-neutral-500/15 text-neutral-200 shadow-[var(--shadow-sm)]" : "text-white/40 hover:text-white/70"
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
            <div className="bg-card/40 border border-white/5 rounded-[2.5rem] p-6 space-y-4 backdrop-blur-sm">
              <div className="h-5 w-40 rounded-full bg-white/5 animate-pulse" />
              <div className="h-16 w-48 rounded-full bg-white/8 animate-pulse" />
              <div className="h-3 w-60 rounded-full bg-white/5 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card/40 border border-white/5 rounded-[2.5rem] p-5 space-y-3 backdrop-blur-sm">
                  <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse" />
                  <div className="h-10 w-16 rounded-full bg-white/8 animate-pulse" />
                </div>
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
            className="space-y-5"
          >
            {/* ── Financial Insights ── */}
            <div
              style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
              className="p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-neutral-500/15 text-neutral-300">
                  <BarChartIcon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-base font-semibold text-foreground">{t("analytics.financialInsights")}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("analytics.avgTicket")}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{fmtNum(data.avgTicket.value)} {t("pos.currency")}</span>
                    {data.avgTicket.change !== 0 && (
                      <span className={`flex items-center gap-1 text-xs font-semibold ${data.avgTicket.change > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {data.avgTicket.change > 0 ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
                        {Math.abs(data.avgTicket.change)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">{t("analytics.compPrevPeriod")}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("analytics.cancellations")}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{fmtNum(data.cancellations.total)}</span>
                    <span className="text-xs font-medium text-rose-400/80">{data.cancellations.rate}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">{t("analytics.loss")} {fmtNum(data.cancellations.value)} {t("pos.currency")}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("analytics.deadStock")}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{fmtNum(data.deadStock.length)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">{t("analytics.noOrdersInPeriod")}</p>
                </div>
              </div>
            </div>

            {/* ── Dead Stock Detail ── */}
            {data.deadStock.length > 0 && (
              <div
                style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
                className="p-5 space-y-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
                    <PackageXIcon className="w-4 h-4" />
                  </div>
                  <h4 className="font-display text-sm font-semibold text-foreground">{t("analytics.deadStockDetail")}</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.deadStock.slice(0, 10).map((p) => (
                    <span key={p.name} className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400/90 border border-amber-500/10">
                      <span className="w-1 h-1 rounded-full bg-amber-400/50" />
                      {p.name}
                    </span>
                  ))}
                  {data.deadStock.length > 10 && (
                    <span className="text-xs text-muted-foreground/60 self-center">+{data.deadStock.length - 10} {t("analytics.more")}</span>
                  )}
                </div>
                <p className="text-[10px] text-amber-400/50 font-medium">{t("analytics.notOrderedRecently")}</p>
              </div>
            )}

            {/* ── Cancellation Breakdown ── */}
            {data.cancellations.byOrderType.length > 0 && (
              <div
                style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
                className="p-5 space-y-4"
              >
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-xl bg-rose-500/15 text-rose-400">
                    <ShieldAlertIcon className="w-4 h-4" />
                  </div>
                  <h4 className="font-display text-sm font-semibold text-foreground">{t("analytics.cancelByType")}</h4>
                </div>
                <div className="space-y-3">
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

            {/* ── Kitchen Red Zone ── */}
            <div
              style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
              className={`p-6 space-y-4 border-2 ${data.kitchenRedZone.count > 0 ? "border-destructive/40" : "border-emerald-500/20"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`grid size-10 place-items-center rounded-xl ${data.kitchenRedZone.count > 0 ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-400"}`}>
                  <TimerOffIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">{t("analytics.kitchenRedZone")}</h3>
                  <p className="text-[10px] text-muted-foreground">{t("analytics.ordersExceeding30")}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-3">
                <span className={`text-5xl font-bold tracking-tight tabular-nums ${data.kitchenRedZone.count > 0 ? "text-destructive" : "text-emerald-400"}`}>
                  {fmtNum(data.kitchenRedZone.count)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {t("analytics.outOf")} {fmtNum(data.kitchenRedZone.totalTracked)} {t("analytics.trackedOrders")}
                </span>
              </div>

              {data.kitchenRedZone.count > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangleIcon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{t("analytics.redZoneWarning")}</span>
                </div>
              )}

              {data.kitchenRedZone.count === 0 && data.kitchenRedZone.totalTracked > 0 && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-sm font-medium">{t("analytics.noRedZone")}</span>
                </div>
              )}
            </div>

            {/* ── Driver Gamification ── */}
            <div
              style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
              className="overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                <span className="w-1 h-1 rounded-full bg-neutral-400/60" />
                <h3 className="font-display text-sm font-semibold text-white/80">{t("analytics.driverRankings")}</h3>
              </div>

              {data.drivers.hero && (
                <div className="mx-5 mt-4 p-4 rounded-2xl bg-gradient-to-l from-amber-500/10 to-amber-500/5 border border-amber-500/15">
                  <div className="flex items-center gap-3">
                    <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-400">
                      <MedalIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-foreground">{data.drivers.hero.name}</span>
                        <CrownIcon className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-semibold text-amber-400/70">{t("analytics.deliveryHero")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">{fmtNum(data.drivers.hero.completedOrders)} {t("analytics.completedOrders")}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-right px-5 py-3 text-neutral-400 font-medium text-[10px] uppercase tracking-wider">#</th>
                      <th className="text-right px-5 py-3 text-neutral-400 font-medium text-[10px] uppercase tracking-wider">{t("analytics.driver")}</th>
                      <th className="text-center px-5 py-3 text-neutral-400 font-medium text-[10px] uppercase tracking-wider">{t("analytics.completed")}</th>
                      <th className="text-center px-5 py-3 text-neutral-400 font-medium text-[10px] uppercase tracking-wider">{t("analytics.cancelled")}</th>
                    </tr>
                  </thead>
                  <motion.tbody initial="initial" animate="animate">
                    {data.drivers.all.map((d, i) => (
                      <motion.tr
                        key={d.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0, transition: { ...springTransition, delay: i * 0.04 } }}
                        className={`${i < data.drivers.all.length - 1 ? "border-b border-white/[0.02]" : ""} hover:bg-white/[0.015] transition-colors`}
                      >
                        <td className="px-5 py-3 w-10">
                          {i === 0 && data.drivers.hero ? (
                            <div className="grid size-7 place-items-center rounded-full bg-amber-400/15 text-amber-400">
                              <MedalIcon className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-white/20 w-7 block text-center">{i + 1}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-neutral-500/15 text-neutral-300 flex items-center justify-center text-xs font-semibold">
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

              {data.drivers.all.length === 0 && (
                <div className="p-10 text-center">
                  <div className="flex justify-center mb-3">
                    <div className="grid size-14 place-items-center rounded-2xl bg-neutral-500/10 text-neutral-400">
                      <BikeIcon className="w-7 h-7" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white/50">{t("analytics.noDriverData")}</p>
                </div>
              )}
            </div>
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
