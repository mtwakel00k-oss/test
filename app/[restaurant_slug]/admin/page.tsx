"use client"

import { useEffect, useState, useCallback, startTransition } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { DollarSign, TrendingUp, ShoppingBag, Star, CalendarClock, LogOut, ChartNoAxesColumn } from "lucide-react"
import { supabase, resetTenantClient, fetchApi } from "@/lib/tenant"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { motion } from "framer-motion"
import { StatCard } from "@/components/admin/stat-card"
import { ReviewsFeed } from "@/components/admin/reviews-feed"
import { TopProducts } from "@/components/admin/top-products"
import { staggerContainer, fadeInUp } from "@/components/page-transition"

const SalesChart = dynamic(() => import("@/components/admin/sales-chart").then(m => ({ default: m.SalesChart })), {
  loading: () => <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />,
})
const PeakHoursChart = dynamic(() => import("@/components/admin/peak-hours-chart").then(m => ({ default: m.PeakHoursChart })), {
  loading: () => <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />,
})
const RestaurantSettings = dynamic(() => import("@/components/admin/restaurant-settings").then(m => ({ default: m.RestaurantSettings })), { ssr: false })
const ProductManager = dynamic(() => import("@/components/admin/product-manager").then(m => ({ default: m.ProductManager })), {
  ssr: false,
  loading: () => <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />,
})
const OrdersList = dynamic(() => import("@/components/admin/orders-list").then(m => ({ default: m.OrdersList })), {
  ssr: false,
  loading: () => <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />,
})
const OrderDetailSheet = dynamic(() => import("@/components/admin/order-detail-sheet").then(m => ({ default: m.OrderDetailSheet })))
const ClearData = dynamic(() => import("@/components/admin/clear-data").then(m => ({ default: m.ClearData })))
const PlanManager = dynamic(() => import("@/components/admin/plan-manager").then(m => ({ default: m.PlanManager })))
const AuditLog = dynamic(() => import("@/components/admin/audit-log").then(m => ({ default: m.AuditLog })), {
  loading: () => <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />,
})

type Period = "7d" | "30d" | "6m" | "12m"

interface ReviewItem {
  id: string
  rating: number
  text: string | null
  timestamp: Date | string
}

export default function AdminPage() {
  const { t, lang, dir } = useTranslation()
  const router = useRouter()
  const slug = useSlug()

  useEffect(() => {
    fetchApi("/api/me").then(r => r.ok ? r.json() : null).then(data => {
      if (!data || (data.role !== "admin" && data.role !== "owner")) {
        router.push(`/${slug}/login`)
      }
    }).catch(() => router.push(`/${slug}/login`))
  }, [router, slug])

  const PERIOD_LABELS: Record<Period, string> = {
    "7d": t("admin.week"), "30d": t("admin.month"), "6m": t("admin.sixMonths"), "12m": t("admin.year"),
  }
  const fmtNum = (n: number) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")
  const currency = lang === "ar" ? "د.ج" : "DA"

  const [period, setPeriod] = useState<Period>("30d")
  const [loadingStats, setLoadingStats] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [avgOrderValue, setAvgOrderValue] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [salesData, setSalesData] = useState<{ date: string; revenue: number; orders: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([])
  const [peakHours, setPeakHours] = useState<{ hour: number; orders: number }[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [driverStats, setDriverStats] = useState<{ id: string; name: string; phone: string; deliveries: number; revenue: number }[]>([])
  const [cashierStats, setCashierStats] = useState<{ id: string; name: string; orders: number; revenue: number }[]>([])
  const [sheetOrderId, setSheetOrderId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [adminTab, setAdminTab] = useState<"overview" | "products" | "orders" | "audit">("overview")

  const handleViewOrder = useCallback((orderId: string) => {
    setSheetOrderId(orderId)
    setSheetOpen(true)
  }, [])

  function setStatsFromResult(result: {
    totalRevenue: number; totalOrders: number; avgOrderValue: number; dailyRevenue: number
    topProducts: { name: string; quantity: number; revenue: number }[]
    salesData: { date: string; revenue: number; orders: number }[]
    peakHours: { hour: number; orders: number }[]
    avgRating: number; reviews: ReviewItem[]; driverStats?: { id: string; name: string; phone: string; deliveries: number; revenue: number }[]; cashierStats?: { id: string; name: string; orders: number; revenue: number }[]
  } | null) {
    if (!result) return
    setTotalRevenue(result.totalRevenue)
    setTotalOrders(result.totalOrders)
    setAvgOrderValue(result.avgOrderValue)
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchStats().then(data => startTransition(() => setStatsFromResult(data))) }, [fetchStats])

  useEffect(() => {
    const channel = supabase()
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchStats().then(setStatsFromResult))
      .subscribe()
    const poll = setInterval(() => fetchStats().then(setStatsFromResult), 15000)
    return () => { supabase().removeChannel(channel); clearInterval(poll) }
  }, [fetchStats])

  if (slug === "developer") {
    return (
      <div className="admin-surface" dir={dir}>
        <header className="sticky top-0 z-30 border-b border-white/6 px-4 py-3 backdrop-blur-xl lg:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
                <ChartNoAxesColumn className="size-4" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Developer Panel</h1>
                <p className="text-[10px] text-white/40">Restaurant Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
              <button onClick={async () => {
                resetTenantClient()
                await fetch("/api/auth/logout", { method: "POST" })
                router.push(`/${slug}/login`)
              }} className="h-8 px-3 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("login.logOut")}</span>
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4 lg:p-6">
          <PlanManager />
        </main>
      </div>
    )
  }

  return (
    <div className="admin-surface" dir={dir}>
      <header className="sticky top-0 z-30 border-b border-white/6 px-4 py-3 backdrop-blur-xl lg:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <ChartNoAxesColumn className="size-4" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-display text-base font-normal text-white">{t("admin.dashboard")}</h1>
              <p className="text-[10px] text-white/40">{slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClearData onCleared={() => fetchStats().then(setStatsFromResult)} />
            <ThemeToggle />
            <LanguageSwitcher />
            <button onClick={async () => {
              resetTenantClient()
              await fetch("/api/auth/logout", { method: "POST" })
              router.push(`/${slug}/login`)
            }} className="h-8 px-3 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("login.logOut")}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex w-fit items-center gap-1 rounded-full border border-white/6 bg-white/[0.03] p-0.5 backdrop-blur-sm">
          {(["overview", "products", "orders", "audit"] as const).map((tab) => (
            <button key={tab} onClick={() => setAdminTab(tab)}
              className={`rounded-full px-5 py-2 text-xs font-semibold transition-all duration-500 ${
                adminTab === tab ? "bg-white/10 text-white shadow-[var(--shadow-sm)]" : "text-white/40 hover:text-white/70"
              }`}>
              {tab === "overview" ? t("admin.overview") : tab === "products" ? t("admin.products") : tab === "orders" ? t("admin.orders") : t("admin.audit")}
            </button>
          ))}
        </div>

        {adminTab === "overview" && (
          <div className="flex w-fit items-center gap-1 rounded-full border border-white/6 bg-white/[0.03] p-0.5">
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setPeriod(key)}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition-all duration-500 ${
                  period === key ? "bg-white/10 text-white shadow-[var(--shadow-sm)]" : "text-white/40 hover:text-white/70"
                }`}>
                {label}
              </button>
            ))}
          </div>
        )}

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {loadingStats ? (
            <>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-card/40 border border-white/5 rounded-2xl p-5 space-y-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5" />
                    <div className="h-3 w-24 rounded-full bg-white/5" />
                  </div>
                  <div className="h-7 w-32 rounded-full bg-white/8" />
                  <div className="h-3 w-20 rounded-full bg-white/5" />
                </div>
              ))}
            </>
          ) : (
            <>
              <motion.div variants={fadeInUp(0)}><StatCard icon={<DollarSign className="w-4 h-4" />} title={t("admin.totalRevenue")} value={`${fmtNum(totalRevenue)} ${currency}`} change={0} trend="up" /></motion.div>
              <motion.div variants={fadeInUp(0.04)}><StatCard icon={<ShoppingBag className="w-4 h-4" />} title={t("admin.totalOrders")} value={totalOrders.toString()} change={0} trend="up" /></motion.div>
              <motion.div variants={fadeInUp(0.08)}><StatCard icon={<TrendingUp className="w-4 h-4" />} title={t("admin.avgOrder")} value={`${fmtNum(avgOrderValue)} ${currency}`} change={0} trend="up" /></motion.div>
              <motion.div variants={fadeInUp(0.12)}><StatCard icon={<Star className="w-4 h-4" />} title={t("admin.avgRating")} value={avgRating.toFixed(1)} change={0} trend="up" /></motion.div>
              <motion.div variants={fadeInUp(0.16)}><StatCard icon={<CalendarClock className="w-4 h-4" />} title={t("admin.dailyRevenue")} value={`${fmtNum(dailyRevenue)} ${currency}`} change={0} trend="up" /></motion.div>
            </>
          )}
        </motion.div>

        {adminTab === "overview" && driverStats.length > 0 && (
          <div className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="px-5 py-3.5 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white/80">{t("admin.driverPerformance")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-right px-5 py-3 text-white/40 font-medium text-[10px] uppercase tracking-wider">{t("admin.driver")}</th>
                    <th className="text-center px-5 py-3 text-white/40 font-medium text-[10px] uppercase tracking-wider">{t("admin.deliveries")}</th>
                    <th className="text-center px-5 py-3 text-white/40 font-medium text-[10px] uppercase tracking-wider">{t("admin.revenue")}</th>
                    <th className="text-center px-5 py-3 text-white/40 font-medium text-[10px] uppercase tracking-wider">{t("admin.avgOrder")}</th>
                  </tr>
                </thead>
                <tbody>
                  {driverStats.map((d, i) => (
                    <tr key={d.id} className={i < driverStats.length - 1 ? "border-b border-white/[0.02]" : ""}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-white/5 text-white/60 flex items-center justify-center text-xs font-semibold">
                            {d.name.charAt(0)}
                          </div>
                          <span className="font-medium text-white/80 text-sm">{d.name}</span>
                        </div>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className="font-semibold text-white/80">{d.deliveries}</span>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className="font-medium text-emerald-400/80">{fmtNum(d.revenue)} {currency}</span>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className="text-white/40">{d.deliveries > 0 ? fmtNum(Math.round(d.revenue / d.deliveries)) : 0} {currency}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {adminTab === "overview" && cashierStats.length > 0 && (
          <div className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="px-5 py-3.5 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white/80">{t("admin.cashierPerformance")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-right px-5 py-3 text-white/40 font-medium text-[10px] uppercase tracking-wider">{t("admin.cashier")}</th>
                    <th className="text-center px-5 py-3 text-white/40 font-medium text-[10px] uppercase tracking-wider">{t("admin.orders")}</th>
                    <th className="text-center px-5 py-3 text-white/40 font-medium text-[10px] uppercase tracking-wider">{t("admin.revenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cashierStats.map((c, i) => (
                    <tr key={c.id} className={i < cashierStats.length - 1 ? "border-b border-white/[0.02]" : ""}>
                      <td className="px-5 py-3">
                        <span className="font-medium text-white/80 text-sm">{c.name}</span>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className="font-semibold text-white/80">{c.orders}</span>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className="font-medium text-emerald-400/80">{fmtNum(c.revenue)} {currency}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {adminTab === "overview" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <SalesChart data={salesData} period={period} onPeriodChange={setPeriod} />
              </div>
              <PeakHoursChart data={peakHours} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TopProducts data={topProducts} />
              <ReviewsFeed reviews={reviews} />
            </div>

            <RestaurantSettings />
          </>
        )}
        {adminTab === "products" && <ProductManager />}
        {adminTab === "orders" && <OrdersList onViewOrder={handleViewOrder} />}
        {adminTab === "audit" && <AuditLog />}

        <OrderDetailSheet
          orderId={sheetOpen ? sheetOrderId : null}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onOrderUpdated={() => fetchStats().then(setStatsFromResult)}
        />
      </main>
    </div>
  )
}
