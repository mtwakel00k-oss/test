"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DollarSign, TrendingUp, ShoppingBag, Star, CalendarClock, LogOut } from "lucide-react"
import { supabase, fetchApi, resetTenantClient } from "@/lib/tenant"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTranslation } from "@/lib/use-translation"
import { StatCard } from "@/components/admin/stat-card"
import { SalesChart } from "@/components/admin/sales-chart"
import { ReviewsFeed } from "@/components/admin/reviews-feed"
import { TopProducts } from "@/components/admin/top-products"
import { PeakHoursChart } from "@/components/admin/peak-hours-chart"
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

export default function AdminDashboard() {
  const { t, lang, dir } = useTranslation()
  const router = useRouter()
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [prevRevenue, setPrevRevenue] = useState(0)
  const [activeOrders, setActiveOrders] = useState(0)
  const [prevActiveOrders, setPrevActiveOrders] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [prevAvgRating, setPrevAvgRating] = useState(0)
  const [todayOrders, setTodayOrders] = useState(0)
  const [chartData, setChartData] = useState<{ date: string; revenue: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number }[]>([])
  const [peakHours, setPeakHours] = useState<{ hour: number; orders: number }[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [period, setPeriod] = useState<Period>("6m")
  const [sheetOrderId, setSheetOrderId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const fmtNum = (n: number) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")
  const currency = lang === "ar" ? "د.ج" : "DA"

  const refreshDashboard = useCallback(() => {
    fetchApi(`/api/admin/stats?mode=root&period=${period}`).then(async (res) => {
      if (!res.ok) return
      const data = await res.json()
      setTotalRevenue(data.totalRevenue)
      setPrevRevenue(data.prevRevenue)
      setActiveOrders(data.activeOrders)
      setPrevActiveOrders(data.prevActiveOrders)
      setAvgRating(data.avgRating)
      setPrevAvgRating(data.prevAvgRating)
      setTodayOrders(data.todayOrders)
      setChartData(data.chartData || [])
      setTopProducts(data.topProducts || [])
      setPeakHours(data.peakHours || [])
      setReviews(data.reviews || [])
    })
  }, [period])


  useEffect(() => {
    refreshDashboard()
    const channel = supabase()
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refreshDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "ratings" }, refreshDashboard)
      .subscribe()
    const poll = setInterval(refreshDashboard, 15000)
    return () => {
      supabase().removeChannel(channel)
      clearInterval(poll)
    }
  }, [refreshDashboard])

  const handleViewOrder = useCallback((orderId: string) => {
    setSheetOrderId(orderId)
    setSheetOpen(true)
  }, [])

  const handlePeriodChange = (p: Period) => setPeriod(p)

  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
  const ordersChange = prevActiveOrders > 0 ? ((activeOrders - prevActiveOrders) / prevActiveOrders) * 100 : 0
  const ratingChange = prevAvgRating > 0 ? avgRating - prevAvgRating : 0

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <header className="border-b border-border">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{t("admin.dashboard")}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t("admin.overview")}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{t("admin.dashboard")}</p>
                <p className="text-xs text-muted-foreground">{t("admin.portal")}</p>
              </div>
              <ClearData onCleared={refreshDashboard} />
              <ThemeToggle />
              <LanguageSwitcher />
              <button
                onClick={async () => {
                  resetTenantClient()
                  await fetch("/api/auth/logout", { method: "POST" })
                  router.push("/login")
                }}
                className="h-9 w-9 rounded-lg bg-secondary hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
                title={t("login.logOut")}
              >
                <LogOut className="h-4 w-4" />
              </button>
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">BH</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title={t("admin.revenue")}
            value={`${fmtNum(totalRevenue)} ${currency}`}
            change={Math.round(revenueChange * 10) / 10}
            icon={<DollarSign className="w-5 h-5" />}
            trend={revenueChange >= 0 ? "up" : "down"}
          />
          <StatCard
            title={t("admin.profit")}
            value={`${fmtNum(totalRevenue * 0.4)} ${currency}`}
            change={Math.round(revenueChange * 10) / 10}
            icon={<TrendingUp className="w-5 h-5" />}
            trend={revenueChange >= 0 ? "up" : "down"}
          />
          <StatCard
            title={t("admin.activeOrders")}
            value={activeOrders.toString()}
            change={Math.round(ordersChange * 10) / 10}
            icon={<ShoppingBag className="w-5 h-5" />}
            trend={ordersChange >= 0 ? "up" : "down"}
            isLive
          />
          <StatCard
            title={t("admin.todayOrders")}
            value={todayOrders.toString()}
            change={0}
            icon={<CalendarClock className="w-5 h-5" />}
            trend="up"
          />
          <StatCard
            title={t("admin.rating")}
            value={avgRating.toFixed(1)}
            change={Math.round(ratingChange * 10) / 10}
            icon={<Star className="w-5 h-5" />}
            trend={ratingChange >= 0 ? "up" : "down"}
            suffix="/5"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <SalesChart data={chartData} period={period} onPeriodChange={handlePeriodChange} />
          </div>
          <div className="lg:col-span-2">
            <ReviewsFeed reviews={reviews} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
          <div className="lg:col-span-2">
            <TopProducts data={topProducts} />
          </div>
          <div className="lg:col-span-3">
            <PeakHoursChart data={peakHours} />
          </div>
        </div>

        <div className="mt-6">
          <OrdersList onViewOrder={handleViewOrder} />
        </div>

        <div className="mt-6">
          <ProductManager />
        </div>

        <div className="mt-6">
          <PlanManager />
        </div>
      </main>

      <OrderDetailSheet
        orderId={sheetOrderId}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onOrderUpdated={refreshDashboard}
      />
    </div>
  )
}
