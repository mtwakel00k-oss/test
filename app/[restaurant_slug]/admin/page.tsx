"use client"

import { useEffect, useState, useCallback, useMemo, startTransition } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { DollarSign, TrendingUp, ShoppingBag, Star, CalendarClock, LogOut, ChartNoAxesColumn, Shield, DoorOpen, DoorClosed } from "lucide-react"
import { supabase, resetTenantClient, fetchApi } from "@/lib/tenant"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { motion, AnimatePresence } from "framer-motion"
import { StatCard } from "@/components/admin/stat-card"
import { ReviewsFeed } from "@/components/admin/reviews-feed"
import { TopProducts } from "@/components/admin/top-products"
import { TenantSidebar } from "@/components/admin/tenant-sidebar"

const SalesChart = dynamic(() => import("@/components/admin/sales-chart").then(m => ({ default: m.SalesChart })), {
  loading: () => <div className="h-72 rounded-2xl bg-white/5 " />,
})
const PeakHoursChart = dynamic(() => import("@/components/admin/peak-hours-chart").then(m => ({ default: m.PeakHoursChart })), {
  loading: () => <div className="h-72 rounded-2xl bg-white/5 " />,
})
const RestaurantSettings = dynamic(() => import("@/components/admin/restaurant-settings").then(m => ({ default: m.RestaurantSettings })), { ssr: false })
const ProductManager = dynamic(() => import("@/components/admin/product-manager").then(m => ({ default: m.ProductManager })), {
  ssr: false,
  loading: () => <div className="h-96 rounded-2xl bg-white/5 " />,
})
const OrdersList = dynamic(() => import("@/components/admin/orders-list").then(m => ({ default: m.OrdersList })), {
  ssr: false,
  loading: () => <div className="h-96 rounded-2xl bg-white/5 " />,
})
const OrderDetailSheet = dynamic(() => import("@/components/admin/order-detail-sheet").then(m => ({ default: m.OrderDetailSheet })))
const ClearData = dynamic(() => import("@/components/admin/clear-data").then(m => ({ default: m.ClearData })))
const PlanManager = dynamic(() => import("@/components/admin/plan-manager").then(m => ({ default: m.PlanManager })))
const EarningsOverview = dynamic(() => import("@/components/admin/earnings-overview").then(m => ({ default: m.EarningsOverview })), {
  loading: () => <div className="h-48 rounded-2xl bg-white/5 " />,
})
const AuditLog = dynamic(() => import("@/components/admin/audit-log").then(m => ({ default: m.AuditLog })), {
  loading: () => <div className="h-96 rounded-2xl bg-white/5 " />,
})
const PremiumAnalytics = dynamic(() => import("@/components/admin/premium-analytics").then(m => ({ default: m.PremiumAnalytics })), {
  loading: () => <div className="h-96 rounded-2xl bg-white/5 " />,
})
const OperationsManager = dynamic(() => import("@/components/admin/operations-manager").then(m => ({ default: m.OperationsManager })), {
  loading: () => <div className="h-96 rounded-2xl bg-white/5 " />,
})

type Period = "7d" | "30d" | "6m" | "12m"

interface ReviewItem {
  id: string
  rating: number
  text: string | null
  timestamp: Date | string
}

const springCard = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 70, damping: 16, delay } },
})

const springRow = (delay: number) => ({
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 90, damping: 18, delay } },
})

export default function AdminPage() {
  const { t, lang, dir } = useTranslation()
  const router = useRouter()
  const slug = useSlug()

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
  const [driverStats, setDriverStats] = useState<{ id: string; name: string; phone: string; deliveries: number; revenue: number }[]>([])
  const [cashierStats, setCashierStats] = useState<{ id: string; name: string; orders: number; revenue: number }[]>([])
  const [sheetOrderId, setSheetOrderId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [adminTab, setAdminTab] = useState<string>("overview")
  const [isOpen, setIsOpen] = useState(true)
  const [togglingOpen, setTogglingOpen] = useState(false)
  const [planType, setPlanType] = useState<string | null>(null)

  useEffect(() => {
    fetchApi("/api/me").then(r => r.ok ? r.json() : null).then(data => {
      if (!data || (data.role !== "admin" && data.role !== "owner")) {
        router.push(`/${slug}/login`)
      } else {
        setUserRole(data.role)
      }
    }).catch(() => router.push(`/${slug}/login`))
  }, [router, slug])

  const PERIOD_LABELS: Record<Period, string> = {
    "7d": t("admin.week"), "30d": t("admin.month"), "6m": t("admin.sixMonths"), "12m": t("admin.year"),
  }
  const fmtNum = (n: number) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")
  const currency = lang === "ar" ? "د.ج" : "DA"

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchStats().then(data => startTransition(() => setStatsFromResult(data))) }, [fetchStats])

  useEffect(() => {
    const cfg = (window as unknown as Record<string, unknown>).__TENANT_CONFIG__ as { is_open?: boolean; plan_type?: string } | undefined
    if (cfg) {
      if (typeof cfg.is_open === "boolean") { const v = cfg.is_open; startTransition(() => setIsOpen(v)) }
      if (cfg.plan_type) {
        const pt = cfg.plan_type; startTransition(() => setPlanType(pt))
        if (cfg.plan_type === "starter" && adminTab !== "overview") {
          startTransition(() => setAdminTab("overview"))
        }
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isBasic = planType === "starter"
  const adminTabs = useMemo(() => {
    const premiumTabs = ["audit", "analytics", "staff"] as const
    const all = ["overview", "products", "orders", "audit", "analytics", "staff"] as const
    if (isBasic) return all.filter(t => !(premiumTabs as readonly string[]).includes(t))
    return all
  }, [isBasic])

  const toggleOpen = useCallback(async () => {
    const next = !isOpen
    setTogglingOpen(true)
    setIsOpen(next)
    try {
      await fetchApi("/api/tenant/logo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_open: next }),
      })
    } catch { /* ignore */ } finally { setTogglingOpen(false) }
  }, [isOpen])

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

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetchApi("/api/tenant/logo")
        if (res.ok) { const j = await res.json(); if (typeof j.is_open === "boolean") setIsOpen(j.is_open) }
      } catch { /* ignore */ }
    }, 10000)
    return () => clearInterval(id)
  }, [])

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
                <h1 className="font-display text-base font-normal text-white">Developer Panel</h1>
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
        <main className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
          {userRole === "owner" && (
            <div className="bg-card/50 border border-border/50 backdrop-blur-xl rounded-2xl p-5 lg:p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10">
                  <Shield className="w-4 h-4 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-foreground tracking-tight">Root Admin</h2>
                  <p className="text-xs text-muted-foreground/60">Platform earnings</p>
                </div>
              </div>
              <EarningsOverview />
            </div>
          )}
          <PlanManager />
        </main>
      </div>
    )
  }

  return (
    <div className="admin-surface" dir={dir}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[150px]" />
      </div>

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className="sticky top-0 z-30 border-b border-white/6 px-4 py-3 backdrop-blur-xl lg:px-6"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <ChartNoAxesColumn className="size-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-base font-medium tracking-tight text-white">{t("admin.dashboard")}</h1>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
                  className="h-0.5 w-8 rounded-full bg-gradient-to-r from-accent/0 via-accent to-accent/0 origin-left"
                />
              </div>
              <p className="text-[10px] text-white/40">{slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClearData onCleared={() => fetchStats().then(setStatsFromResult)} />
            <button
              onClick={toggleOpen}
              disabled={togglingOpen}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                isOpen
                  ? "bg-malachite/10 text-malachite hover:bg-malachite/20"
                  : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
              }`}
            >
              {isOpen ? <DoorOpen className="w-3.5 h-3.5" /> : <DoorClosed className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isOpen ? t("admin.open") : t("admin.closed")}</span>
            </button>
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
      </motion.header>

      <main className="relative max-w-7xl mx-auto p-4 lg:p-6">
        <div className="flex gap-6">
          <TenantSidebar
            currentTab={adminTab}
            onTabChange={setAdminTab}
            userRole={userRole}
            labels={{
              overview: t("admin.overview"),
              products: t("admin.products"),
              orders: t("admin.orders"),
              audit: t("admin.audit"),
              analytics: t("analytics.premiumAnalytics"),
              staff: t("admin.staff"),
            }}
          />
          <div className="flex-1 min-w-0 space-y-6">
            <AnimatePresence mode="wait">
          {adminTab === "overview" ? (
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
          ) : adminTab === "products" ? (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <ProductManager />
            </motion.div>
          ) : adminTab === "orders" ? (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <OrdersList onViewOrder={handleViewOrder} />
            </motion.div>
          ) : adminTab === "analytics" ? (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <PremiumAnalytics />
            </motion.div>
          ) : adminTab === "staff" ? (
            <motion.div
              key="staff"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <OperationsManager />
            </motion.div>
          ) : (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <AuditLog />
            </motion.div>
          )}
        </AnimatePresence>

          <OrderDetailSheet
            orderId={sheetOpen ? sheetOrderId : null}
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            onOrderUpdated={() => fetchStats().then(setStatsFromResult)}
          />
        </div>
        </div>
      </main>
    </div>
  )
}
