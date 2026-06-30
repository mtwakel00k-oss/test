"use client"

import { useEffect, useState, useCallback, useMemo, startTransition } from "react"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/tenant"
import { fetchApi } from "@/lib/fetch-api"
import { motion, AnimatePresence } from "framer-motion"
import { DollarSign, TrendingUp, ShoppingBag, Star, CalendarClock } from "lucide-react"
import { StatCard } from "@/components/admin/stat-card"
import { ReviewsFeed } from "@/components/admin/reviews-feed"
import { TopProducts } from "@/components/admin/top-products"
import { useTranslation } from "@/lib/use-translation"

const SalesChart = dynamic(() => import("@/components/admin/sales-chart").then(m => ({ default: m.SalesChart })), {
  loading: () => <div className="h-72 rounded-2xl bg-white/5 " />,
})
const PeakHoursChart = dynamic(() => import("@/components/admin/peak-hours-chart").then(m => ({ default: m.PeakHoursChart })), {
  loading: () => <div className="h-72 rounded-2xl bg-white/5 " />,
})
const RestaurantSettings = dynamic(() => import("@/components/admin/restaurant-settings").then(m => ({ default: m.RestaurantSettings })), { ssr: false })

type Period = "7d" | "30d" | "6m" | "12m"
type ReviewItem = { id: string; rating: number; text: string | null; timestamp: Date | string }
type DriverStat = { id: string; name: string; phone: string; deliveries: number; revenue: number }
type CashierStat = { id: string; name: string; orders: number; revenue: number }

const springCard = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 70, damping: 16, delay } },
})

const springRow = (delay: number) => ({
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 90, damping: 18, delay } },
})

interface AdminDataProviderProps {
  currency: string
  fmtNum: (n: number) => string
  onViewOrder: (id: string) => void
}

export function AdminDataProvider({ currency, fmtNum, onViewOrder: _onViewOrder }: AdminDataProviderProps) {
  const { t, lang: _lang } = useTranslation()

  const [period, setPeriod] = useState<Period>("30d")
  const [loadingStats, setLoadingStats] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [salesData, setSalesData] = useState<{ date: string; revenue: number; orders: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([])
  const [peakHours, setPeakHours] = useState<{ hour: number; orders: number }[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [driverStats, setDriverStats] = useState<DriverStat[]>([])
  const [cashierStats, setCashierStats] = useState<CashierStat[]>([])
  const [_sheetOrderId, _setSheetOrderId] = useState<string | null>(null)
  const [_sheetOpen, _setSheetOpen] = useState(false)

  const PERIOD_LABELS: Record<Period, string> = {
    "7d": t("admin.week"), "30d": t("admin.month"), "6m": t("admin.sixMonths"), "12m": t("admin.year"),
  }

  function setStatsFromResult(result: {
    totalRevenue: number; totalOrders: number; avgOrderValue: number; dailyRevenue: number
    topProducts: { name: string; quantity: number; revenue: number }[]
    salesData: { date: string; revenue: number; orders: number }[]
    peakHours: { hour: number; orders: number }[]
    avgRating: number; reviews: ReviewItem[]
    driverStats?: DriverStat[]; cashierStats?: CashierStat[]
  } | null) {
    if (!result) return
    setTotalRevenue(result.totalRevenue)
    setTotalOrders(result.totalOrders)
    setDailyRevenue(result.dailyRevenue)
    setTopProducts(result.topProducts)
    setSalesData(result.salesData)
    setPeakHours(result.peakHours)
    setAvgRating(result.avgRating)
    setReviews(result.reviews)
    if (result.driverStats) setDriverStats(result.driverStats)
    if (result.cashierStats) setCashierStats(result.cashierStats)
  }

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetchApi(`/api/admin/stats?period=${period}`)
      if (!res.ok) return null
      return await res.json()
    } catch { return null } finally { setLoadingStats(false) }
  }, [period])

  const avgOrderChange = useMemo(() => {
    if (salesData.length < 2) return 0
    const days = [...salesData].sort((a, b) => a.date.localeCompare(b.date)).filter(d => d.orders > 0)
    if (days.length < 2) return 0
    const latest = days[days.length - 1]
    const prev = days[days.length - 2]
    const latestAov = latest.revenue / latest.orders
    const prevAov = prev.revenue / prev.orders
    if (!prevAov) return 0
    return Math.round(((latestAov - prevAov) / prevAov) * 100)
  }, [salesData])

  useEffect(() => { fetchStats().then(data => startTransition(() => setStatsFromResult(data))) }, [fetchStats]) // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    const channel = supabase()
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchStats().then(setStatsFromResult))
      .subscribe()
    let poll = setInterval(() => fetchStats().then(setStatsFromResult), 15000)
    const onVisibility = () => {
      if (document.hidden) { clearInterval(poll); poll = null as unknown as ReturnType<typeof setInterval> }
      else if (!poll) { poll = setInterval(() => fetchStats().then(setStatsFromResult), 30000) }
    }
    document.addEventListener("visibilitychange", onVisibility, { passive: true })
    return () => {
      supabase().removeChannel(channel)
      clearInterval(poll)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [fetchStats])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="overview"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-6"
      >
        <div className="flex w-fit items-center gap-1 rounded-full border border-white/6 bg-white/[0.03] p-0.5 backdrop-blur-sm">
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`rounded-full px-5 py-2 text-xs font-semibold transition-all duration-500 ${
                period === key ? "bg-accent/15 text-accent shadow-[var(--shadow-sm)]" : "text-white/40 hover:text-white/70"
              }`}>
              {label}
            </button>
          ))}
        </div>

        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
        >
          {loadingStats ? (
            <>
              {[...Array(5)].map((_, i) => (
                <motion.div key={i} variants={springCard(i * 0.04)} className="bg-card/40 border border-white/5 rounded-2xl p-5 space-y-4 ">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10" />
                    <div className="h-3 w-24 rounded-full bg-white/5" />
                  </div>
                  <div className="h-7 w-32 rounded-full bg-white/8" />
                  <div className="h-3 w-20 rounded-full bg-white/5" />
                </motion.div>
              ))}
            </>
          ) : (
            <>
              <motion.div variants={springCard(0)}>
                <StatCard icon={<DollarSign className="w-4 h-4" />} title={t("admin.totalRevenue")} value={`${fmtNum(totalRevenue)} ${currency}`} change={0} trend="up" />
              </motion.div>
              <motion.div variants={springCard(0.04)}>
                <StatCard icon={<ShoppingBag className="w-4 h-4" />} title={t("admin.totalOrders")} value={totalOrders.toString()} change={0} trend="up" />
              </motion.div>
              <motion.div variants={springCard(0.08)}>
                <StatCard icon={<TrendingUp className="w-4 h-4" />} title={t("admin.avgOrder")} value={`${avgOrderChange >= 0 ? "↑" : "↓"} ${Math.abs(avgOrderChange)}%`} change={avgOrderChange} trend={avgOrderChange >= 0 ? "up" : "down"} />
              </motion.div>
              <motion.div variants={springCard(0.12)}>
                <StatCard icon={<Star className="w-4 h-4" />} title={t("admin.avgRating")} value={avgRating.toFixed(1)} change={0} trend="up" />
              </motion.div>
              <motion.div variants={springCard(0.16)}>
                <StatCard icon={<CalendarClock className="w-4 h-4" />} title={t("admin.dailyRevenue")} value={`${fmtNum(dailyRevenue)} ${currency}`} change={0} trend="up" />
              </motion.div>
            </>
          )}
        </motion.div>

        {driverStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.1 }}
            className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm card-hover"
          >
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
              <span className="w-1 h-1 rounded-full bg-accent/60" />
              <h3 className="font-display text-sm font-semibold text-white/80">{t("admin.driverPerformance")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent/20">
                    <th className="text-right px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("admin.driver")}</th>
                    <th className="text-center px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("admin.deliveries")}</th>
                    <th className="text-center px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("admin.revenue")}</th>
                    <th className="text-center px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("admin.avgOrder")}</th>
                  </tr>
                </thead>
                <motion.tbody initial="initial" animate="animate">
                  {driverStats.map((d, i) => (
                    <motion.tr key={d.id} variants={springRow(i * 0.03)}
                      className={`${i < driverStats.length - 1 ? "border-b border-white/[0.02]" : ""} hover:bg-white/[0.015] transition-colors`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary/60 flex items-center justify-center text-xs font-semibold">
                            {d.name.charAt(0)}
                          </div>
                          <span className="font-medium text-white/80 text-sm">{d.name}</span>
                        </div>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className="font-semibold text-white/80">{d.deliveries}</span>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className="font-medium text-malachite/80">{fmtNum(d.revenue)} {currency}</span>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className="text-white/40">{d.deliveries > 0 ? fmtNum(Math.round(d.revenue / d.deliveries)) : 0} {currency}</span>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          </motion.div>
        )}

        {cashierStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.15 }}
            className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm card-hover"
          >
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
              <span className="w-1 h-1 rounded-full bg-accent/60" />
              <h3 className="font-display text-sm font-semibold text-white/80">{t("admin.cashierPerformance")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent/20">
                    <th className="text-right px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("admin.cashier")}</th>
                    <th className="text-center px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("admin.orders")}</th>
                    <th className="text-center px-5 py-3 text-accent/70 font-medium text-[10px] uppercase tracking-wider">{t("admin.revenue")}</th>
                  </tr>
                </thead>
                <motion.tbody initial="initial" animate="animate">
                  {cashierStats.map((c, i) => (
                    <motion.tr key={c.id} variants={springRow(i * 0.03)}
                      className={`${i < cashierStats.length - 1 ? "border-b border-white/[0.02]" : ""} hover:bg-white/[0.015] transition-colors`}
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium text-white/80 text-sm">{c.name}</span>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className="font-semibold text-white/80">{c.orders}</span>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className="font-medium text-malachite/80">{fmtNum(c.revenue)} {currency}</span>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        >
          <div className="lg:col-span-2">
            <SalesChart data={salesData} period={period} onPeriodChange={setPeriod} />
          </div>
          <PeakHoursChart data={peakHours} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-5"
        >
          <TopProducts data={topProducts} />
          <ReviewsFeed reviews={reviews} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.3 }}
        >
          <RestaurantSettings />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
