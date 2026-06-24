"use client"

import { useEffect, useState, useCallback, useMemo, startTransition } from "react"
import { fetchApi } from "@/lib/tenant"
import { useTranslation } from "@/lib/use-translation"
import { motion, AnimatePresence } from "framer-motion"

type Period = "day" | "week" | "month"
type Tab = "kitchen" | "delivery"

interface KitchenData {
  avgPrepTimeMinutes: number | null
  ordersTracked: number
  totalOrders: number
  statusDistribution: { status: string; count: number }[]
}

interface DriverItem {
  name: string
  completedOrders: number
  avgTransitTimeMinutes: number | null
  ordersTracked: number
}

interface DeliveryData {
  drivers: DriverItem[]
}

interface ReportsData {
  kitchen: KitchenData
  delivery: DeliveryData
}

const PERIOD_TO_API: Record<Period, string> = {
  day: "1d",
  week: "7d",
  month: "30d",
}

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  preparing: "قيد التحضير",
  ready: "جاهز",
  out_for_delivery: "قيد التوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400",
  preparing: "text-sky-400",
  ready: "text-emerald-400",
  out_for_delivery: "text-violet-400",
  completed: "text-emerald-500",
  cancelled: "text-rose-400",
}

function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z" />
      <line x1="6" y1="17" x2="18" y2="17" />
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

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  )
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
      <line x1="12" y1="2" x2="12" y2="6" />
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

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const springTransition = { type: "spring" as const, stiffness: 90, damping: 16 }

export function PerformanceReports() {
  const { t, lang } = useTranslation()
  const [period, setPeriod] = useState<Period>("week")
  const [tab, setTab] = useState<Tab>("kitchen")
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchApi(`/api/admin/premium-analytics?period=${PERIOD_TO_API[period]}`)
      if (!res.ok) return null
      const raw = await res.json()
      // Adapt premium-analytics shape to reports shape
      const adapted: ReportsData = {
        kitchen: {
          avgPrepTimeMinutes: raw.kitchenRedZone?.avgPrepTime ?? null,
          ordersTracked: raw.kitchenRedZone?.totalTracked ?? 0,
          totalOrders: raw.kitchenRedZone?.totalOrders ?? 0,
          statusDistribution: [],
        },
        delivery: {
          drivers: (raw.drivers?.all || []).map((d: { name: string; completedOrders: number; avgTransitTime: number | null }) => ({
            name: d.name,
            completedOrders: d.completedOrders,
            avgTransitTimeMinutes: d.avgTransitTime,
            ordersTracked: d.completedOrders,
          })),
        },
      }
      return adapted
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }, [period])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchReports().then(data => startTransition(() => setData(data))) }, [fetchReports])

  const periods: { key: Period; label: string }[] = useMemo(() => [
    { key: "day", label: t("admin.today") || "اليوم" },
    { key: "week", label: t("admin.week") || "الأسبوع" },
    { key: "month", label: t("admin.month") || "الشهر" },
  ], [t])

  const fmtNum = (n: number) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")

  const prepAlert = useMemo(() => {
    if (!data?.kitchen.avgPrepTimeMinutes) return null
    const avg = data.kitchen.avgPrepTimeMinutes
    if (avg > 25) return { color: "text-rose-400", icon: AlertCircleIcon, text: "تحضير بطيء" }
    if (avg < 15) return { color: "text-emerald-400", icon: CheckCircleIcon, text: "سرعة ممتازة" }
    return { color: "text-amber-400", icon: TimerIcon, text: "أداء جيد" }
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
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
        <div className="flex w-fit items-center gap-1 rounded-full border border-white/6 bg-white/[0.03] p-0.5 backdrop-blur-sm">
          <button key="kitchen" onClick={() => setTab("kitchen")}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all duration-500 flex items-center gap-1.5 ${
              tab === "kitchen" ? "bg-neutral-500/15 text-neutral-200 shadow-[var(--shadow-sm)]" : "text-white/40 hover:text-white/70"
            }`}>
            <ChefHatIcon className="w-3.5 h-3.5" />
            <span>{t("admin.kitchen") || "المطبخ"}</span>
          </button>
          <button key="delivery" onClick={() => setTab("delivery")}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all duration-500 flex items-center gap-1.5 ${
              tab === "delivery" ? "bg-neutral-500/15 text-neutral-200 shadow-[var(--shadow-sm)]" : "text-white/40 hover:text-white/70"
            }`}>
            <BikeIcon className="w-3.5 h-3.5" />
            <span>{t("admin.delivery") || "التوصيل"}</span>
          </button>
        </div>
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
        ) : tab === "kitchen" && data?.kitchen ? (
          <motion.div
            key="kitchen"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            <div
              style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
              className="p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-neutral-500/15 text-neutral-300">
                  <TimerIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">{t("admin.avgPrepTime") || "متوسط وقت التحضير"}</h3>
                  <p className="text-[10px] text-muted-foreground">{t("admin.fromOrderToReady") || "من الطلب إلى الجاهز"}</p>
                </div>
              </div>

              {data.kitchen.avgPrepTimeMinutes !== null ? (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tight text-foreground tabular-nums">{fmtNum(data.kitchen.avgPrepTimeMinutes)}</span>
                    <span className="text-lg font-medium text-muted-foreground">{t("admin.minutesShort") || "د"}</span>
                  </div>
                  {prepAlert && (
                    <div className={`flex items-center gap-2 ${prepAlert.color}`}>
                      <prepAlert.icon className="w-4 h-4" />
                      <span className="text-sm font-semibold">{prepAlert.text}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground/60">
                    {t("admin.basedOnOrders") || "بناءً على"} {fmtNum(data.kitchen.ordersTracked)} {t("admin.orders") || "طلبات"}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-400/70">
                  <AlertCircleIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{t("admin.noTimingData") || "بيانات التوقيت غير متوفرة — شغّل سجل التدقيق"}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {data.kitchen.statusDistribution.map((s) => (
                <div
                  key={s.status}
                  style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
                  className="p-4 text-center space-y-2"
                >
                  <span className={`text-2xl font-bold tabular-nums block ${STATUS_COLORS[s.status] || "text-foreground"}`}>
                    {fmtNum(s.count)}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground block leading-tight">
                    {STATUS_LABELS[s.status] || s.status}
                  </span>
                </div>
              ))}
            </div>

            {data.kitchen.totalOrders > 0 && (
              <div
                style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px" }}
                className="p-4"
              >
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <PackageIcon className="w-3.5 h-3.5" />
                  <span>{t("admin.totalOrders") || "إجمالي الطلبات"}: {fmtNum(data.kitchen.totalOrders)}</span>
                </div>
              </div>
            )}
          </motion.div>
        ) : tab === "delivery" && data?.delivery ? (
          <motion.div
            key="delivery"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {data.delivery.drivers.length === 0 ? (
              <div
                style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
                className="p-10 text-center"
              >
                <div className="flex justify-center mb-3">
                  <div className="grid size-14 place-items-center rounded-2xl bg-neutral-500/10 text-neutral-400">
                    <BikeIcon className="w-7 h-7" />
                  </div>
                </div>
                <p className="text-sm font-medium text-white/50">{t("admin.noDeliveryData") || "لا توجد بيانات توصيل في هذه الفترة"}</p>
              </div>
            ) : (
              <>
                <div
                  style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                    <span className="w-1 h-1 rounded-full bg-neutral-400/60" />
                    <h3 className="font-display text-sm font-semibold text-white/80">{t("admin.driverLeaderboard") || "ترتيب السائقين"}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-right px-5 py-3 text-neutral-400 font-medium text-[10px] uppercase tracking-wider">#</th>
                          <th className="text-right px-5 py-3 text-neutral-400 font-medium text-[10px] uppercase tracking-wider">{t("admin.driver") || "السائق"}</th>
                          <th className="text-center px-5 py-3 text-neutral-400 font-medium text-[10px] uppercase tracking-wider">{t("admin.completedDeliveries") || "مكتمل"}</th>
                          <th className="text-center px-5 py-3 text-neutral-400 font-medium text-[10px] uppercase tracking-wider">{t("admin.avgTransitTime") || "متوسط التوصيل"}</th>
                          <th className="text-center px-5 py-3 text-neutral-400 font-medium text-[10px] uppercase tracking-wider">{t("admin.status") || "الحالة"}</th>
                        </tr>
                      </thead>
                      <motion.tbody initial="initial" animate="animate">
                        {data.delivery.drivers.map((d, i) => (
                          <motion.tr
                            key={d.name}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0, transition: { ...springTransition, delay: i * 0.04 } }}
                            className={`${i < data.delivery.drivers.length - 1 ? "border-b border-white/[0.02]" : ""} hover:bg-white/[0.015] transition-colors`}
                          >
                            <td className="px-5 py-3 w-10">
                              {i === 0 ? (
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
                                <span className="font-medium text-white/80 text-sm">{d.name}</span>
                              </div>
                            </td>
                            <td className="text-center px-5 py-3">
                              <span className="font-semibold text-white/80 tabular-nums">{fmtNum(d.completedOrders)}</span>
                            </td>
                            <td className="text-center px-5 py-3">
                              {d.avgTransitTimeMinutes !== null ? (
                                <span className="font-mono text-sm font-semibold tabular-nums text-muted-foreground">
                                  {fmtNum(d.avgTransitTimeMinutes)} {t("admin.minutesShort") || "د"}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </td>
                            <td className="text-center px-5 py-3">
                              {d.avgTransitTimeMinutes !== null ? (
                                d.avgTransitTimeMinutes <= 20 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                                    <CheckIcon className="w-3 h-3" />
                                    {t("admin.fast") || "سريع"}
                                  </span>
                                ) : d.avgTransitTimeMinutes <= 35 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                                    <TimerIcon className="w-3 h-3" />
                                    {t("admin.moderate") || "متوسط"}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400">
                                    <AlertCircleIcon className="w-3 h-3" />
                                    {t("admin.slow") || "بطيء"}
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] text-muted-foreground/50">{t("admin.noData") || "—"}</span>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
                    className="p-5"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="grid size-8 place-items-center rounded-xl bg-neutral-500/15 text-neutral-300">
                        <BikeIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.activeDrivers") || "السائقون النشطون"}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{fmtNum(data.delivery.drivers.length)}</p>
                  </div>
                  <div
                    style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
                    className="p-5"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="grid size-8 place-items-center rounded-xl bg-neutral-500/15 text-neutral-300">
                        <PackageIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.totalDeliveries") || "إجمالي التوصيل"}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {fmtNum(data.delivery.drivers.reduce((s, d) => s + d.completedOrders, 0))}
                    </p>
                  </div>
                  <div
                    style={{ backdropFilter: "blur(32px) saturate(180%) brightness(1.08)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "24px" }}
                    className="p-5"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="grid size-8 place-items-center rounded-xl bg-neutral-500/15 text-neutral-300">
                        <TrendingUpIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.avgTransitTime") || "معدل التوصيل"}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {(() => {
                        const tracked = data.delivery.drivers.filter(d => d.avgTransitTimeMinutes !== null)
                        if (tracked.length === 0) return "—"
                        const avg = Math.round(tracked.reduce((s, d) => s + d.avgTransitTimeMinutes!, 0) / tracked.length)
                        return `${fmtNum(avg)} ${t("admin.minutesShort") || "د"}`
                      })()}
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <p className="text-sm text-white/40">{t("admin.noReportsData") || "لا توجد بيانات تقارير"}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
