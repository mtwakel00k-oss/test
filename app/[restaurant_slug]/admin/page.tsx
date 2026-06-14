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
import { StatCard } from "@/components/admin/stat-card"
import { ReviewsFeed } from "@/components/admin/reviews-feed"
import { TopProducts } from "@/components/admin/top-products"

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
  const [adminTab, setAdminTab] = useState<"overview" | "products" | "orders">("overview")

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
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white" dir={dir}>
        <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 lg:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <ChartNoAxesColumn className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Developer Panel</h1>
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white" dir={dir}>
      <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 lg:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ChartNoAxesColumn className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">{t("admin.dashboard")}</h1>
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
        <div className="flex items-center gap-1.5 bg-white/5 p-0.5 rounded-lg w-fit border border-white/5">
          {(["overview", "products", "orders"] as const).map((tab) => (
            <button key={tab} onClick={() => setAdminTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                adminTab === tab ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"
              }`}>
              {tab === "overview" ? t("admin.overview") : tab === "products" ? t("admin.products") : t("admin.orders")}
            </button>
          ))}
        </div>

        {adminTab === "overview" && (
          <div className="flex items-center gap-1.5 bg-white/5 p-0.5 rounded-lg w-fit border border-white/5">
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  period === key ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"
                }`}>
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {loadingStats ? (
            <>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-muted" />
                    <div className="h-3 w-20 rounded bg-muted" />
                  </div>
                  <div className="h-6 w-28 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted/60" />
                </div>
              ))}
            </>
          ) : (
            <>
              <StatCard icon={<DollarSign className="w-4 h-4" />} title={t("admin.totalRevenue")} value={`${fmtNum(totalRevenue)} ${currency}`} change={0} trend="up" />
              <StatCard icon={<ShoppingBag className="w-4 h-4" />} title={t("admin.totalOrders")} value={totalOrders.toString()} change={0} trend="up" />
              <StatCard icon={<TrendingUp className="w-4 h-4" />} title={t("admin.avgOrder")} value={`${fmtNum(avgOrderValue)} ${currency}`} change={0} trend="up" />
              <StatCard icon={<Star className="w-4 h-4" />} title={t("admin.avgRating")} value={avgRating.toFixed(1)} change={0} trend="up" />
              <StatCard icon={<CalendarClock className="w-4 h-4" />} title={t("admin.dailyRevenue")} value={`${fmtNum(dailyRevenue)} ${currency}`} change={0} trend="up" />
            </>
          )}
        </div>

        {adminTab === "overview" && driverStats.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">{t("admin.driverPerformance")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium text-xs">{t("admin.driver")}</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs">{t("admin.deliveries")}</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs">{t("admin.revenue")}</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs">{t("admin.avgOrder")}</th>
                  </tr>
                </thead>
                <tbody>
                  {driverStats.map((d, i) => (
                    <tr key={d.id} className={i < driverStats.length - 1 ? "border-b border-border/30" : ""}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {d.name.charAt(0)}
                          </div>
                          <span className="font-medium text-foreground text-sm">{d.name}</span>
                        </div>
                      </td>
                      <td className="text-center px-4 py-2.5">
                        <span className="font-bold text-foreground">{d.deliveries}</span>
                      </td>
                      <td className="text-center px-4 py-2.5">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmtNum(d.revenue)} {currency}</span>
                      </td>
                      <td className="text-center px-4 py-2.5">
                        <span className="text-muted-foreground">{d.deliveries > 0 ? fmtNum(Math.round(d.revenue / d.deliveries)) : 0} {currency}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {adminTab === "overview" && cashierStats.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">{t("admin.cashierPerformance")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium text-xs">{t("admin.cashier")}</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs">{t("admin.orders")}</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs">{t("admin.revenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cashierStats.map((c, i) => (
                    <tr key={c.id} className={i < cashierStats.length - 1 ? "border-b border-border/30" : ""}>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-foreground text-sm">{c.name}</span>
                      </td>
                      <td className="text-center px-4 py-2.5">
                        <span className="font-bold text-foreground">{c.orders}</span>
                      </td>
                      <td className="text-center px-4 py-2.5">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmtNum(c.revenue)} {currency}</span>
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
