"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DollarSign, TrendingUp, ShoppingBag, Star, CalendarClock, LogOut, ChartNoAxesColumn } from "lucide-react"
import { supabase, resetTenantClient, fetchApi } from "@/lib/tenant"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { StatCard } from "@/components/admin/stat-card"
import { SalesChart } from "@/components/admin/sales-chart"
import { ReviewsFeed } from "@/components/admin/reviews-feed"
import { TopProducts } from "@/components/admin/top-products"
import { PeakHoursChart } from "@/components/admin/peak-hours-chart"
import { RestaurantSettings } from "@/components/admin/restaurant-settings"
import { ProductManager } from "@/components/admin/product-manager"
import { OrdersList } from "@/components/admin/orders-list"
import { OrderDetailSheet } from "@/components/admin/order-detail-sheet"
import { ClearData } from "@/components/admin/clear-data"
import { PlanManager } from "@/components/admin/plan-manager"

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

  const PERIOD_LABELS: Record<Period, string> = {
    "7d": t("admin.week"), "30d": t("admin.month"), "6m": t("admin.sixMonths"), "12m": t("admin.year"),
  }
  const fmtNum = (n: number) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")
  const currency = lang === "ar" ? "د.ج" : "DA"

  const [period, setPeriod] = useState<Period>("30d")
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
    try {
      const res = await fetchApi(`/api/admin/stats?period=${period}`)
      if (!res.ok) return null
      return await res.json()
    } catch { return null }
  }, [period])

  useEffect(() => { fetchStats().then(setStatsFromResult) }, [fetchStats])

  useEffect(() => {
    const channel = supabase()
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchStats().then(setStatsFromResult))
      .subscribe()
    const poll = setInterval(() => fetchStats().then(setStatsFromResult), 15000)
    return () => { supabase().removeChannel(channel); clearInterval(poll) }
  }, [fetchStats])

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <header className="bg-card border-b border-border px-4 lg:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <ChartNoAxesColumn className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">{t("admin.dashboard")}</h1>
              <p className="text-[11px] text-muted-foreground">{slug}</p>
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
            }} className="h-8 px-3 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("login.logOut")}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-1.5 bg-muted/50 p-0.5 rounded-lg w-fit">
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={<DollarSign className="w-4 h-4" />} title={t("admin.totalRevenue")} value={`${fmtNum(totalRevenue)} ${currency}`} change={0} trend="up" />
          <StatCard icon={<ShoppingBag className="w-4 h-4" />} title={t("admin.totalOrders")} value={totalOrders.toString()} change={0} trend="up" />
          <StatCard icon={<TrendingUp className="w-4 h-4" />} title={t("admin.avgOrder")} value={`${fmtNum(avgOrderValue)} ${currency}`} change={0} trend="up" />
          <StatCard icon={<Star className="w-4 h-4" />} title={t("admin.avgRating")} value={avgRating.toFixed(1)} change={0} trend="up" />
          <StatCard icon={<CalendarClock className="w-4 h-4" />} title={t("admin.dailyRevenue")} value={`${fmtNum(dailyRevenue)} ${currency}`} change={0} trend="up" />
        </div>

        {driverStats.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">أداء السائقين</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium text-xs">السائق</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs">توصيلات</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs">الإيرادات</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs">متوسط الطلب</th>
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

        {cashierStats.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">أداء الكاشير</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium text-xs">الكاشير</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs">الطلبات</th>
                    <th className="text-center px-4 py-2.5 text-muted-foreground font-medium text-xs">الإيرادات</th>
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
        <ProductManager />
        {slug === "developer" && <PlanManager />}
        <OrdersList onViewOrder={handleViewOrder} />

        <OrderDetailSheet
          orderId={sheetOrderId}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onOrderUpdated={() => fetchStats().then(setStatsFromResult)}
        />
      </main>
    </div>
  )
}
