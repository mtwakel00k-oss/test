"use client"

import { useEffect, useState, useCallback, startTransition } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { LogOut, ChartNoAxesColumn, Shield, DoorOpen, DoorClosed } from "lucide-react"
import { resetTenantClient, fetchApi } from "@/lib/fetch-api"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"

const TenantSidebar = dynamic(() => import("@/components/admin/tenant-sidebar").then(m => ({ default: m.TenantSidebar })), {
  ssr: false,
  loading: () => <div className="w-56 shrink-0" />,
})
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
const AdminDataProvider = dynamic(() => import("@/components/admin/admin-data-provider").then(m => ({ default: m.AdminDataProvider })), {
  ssr: false,
  loading: () => <div className="space-y-6">
    <div className="h-8 w-96 rounded-full bg-white/5 " />
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-card/40 border border-white/5 rounded-2xl p-5 space-y-4 ">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10" />
            <div className="h-3 w-24 rounded-full bg-white/5" />
          </div>
          <div className="h-7 w-32 rounded-full bg-white/8" />
          <div className="h-3 w-20 rounded-full bg-white/5" />
        </div>
      ))}
    </div>
  </div>,
})

export default function AdminPage() {
  const { t, lang, dir } = useTranslation()
  const router = useRouter()
  const slug = useSlug()

  const [sheetOrderId, setSheetOrderId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [adminTab, setAdminTab] = useState<string>("overview")
  const [isOpen, setIsOpen] = useState(true)
  const [togglingOpen, setTogglingOpen] = useState(false)
  const [_planType, setPlanType] = useState<string | null>(null)

  useEffect(() => {
    fetchApi("/api/me").then(r => r.ok ? r.json() : null).then(data => {
      if (!data || (data.role !== "admin" && data.role !== "owner")) {
        router.push(`/${slug}/login`)
      } else {
        setUserRole(data.role)
      }
    }).catch(() => router.push(`/${slug}/login`))
  }, [router, slug])

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
    const id = setInterval(async () => {
      try {
        const res = await fetchApi("/api/tenant/logo")
        if (res.ok) { const j = await res.json(); if (typeof j.is_open === "boolean") setIsOpen(j.is_open) }
      } catch { /* ignore */ }
    }, 10000)
    return () => clearInterval(id)
  }, [])

  const currency = lang === "ar" ? "د.ج" : "DA"
  const fmtNum = (n: number) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")

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

      <header className="sticky top-0 z-30 border-b border-white/6 px-4 py-3 backdrop-blur-xl lg:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <ChartNoAxesColumn className="size-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-base font-medium tracking-tight text-white">{t("admin.dashboard")}</h1>
                <div className="h-0.5 w-8 rounded-full bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
              </div>
              <p className="text-[10px] text-white/40">{slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClearData onCleared={() => {}} />
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
      </header>

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
            {adminTab === "overview" ? (
              <AdminDataProvider
                currency={currency}
                fmtNum={fmtNum}
                onViewOrder={(id: string) => { setSheetOrderId(id); setSheetOpen(true) }}
              />
            ) : adminTab === "products" ? (
              <ProductManager />
            ) : adminTab === "orders" ? (
              <OrdersList onViewOrder={(id: string) => { setSheetOrderId(id); setSheetOpen(true) }} />
            ) : adminTab === "analytics" ? (
              <PremiumAnalytics />
            ) : adminTab === "staff" ? (
              <OperationsManager />
            ) : (
              <AuditLog />
            )}

            <OrderDetailSheet
              orderId={sheetOpen ? sheetOrderId : null}
              open={sheetOpen}
              onClose={() => setSheetOpen(false)}
              onOrderUpdated={() => {}}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
