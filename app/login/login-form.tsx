"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTranslation } from "@/lib/use-translation"

type PageRole = "cashier" | "chef" | "admin" | "owner"
const ROLE_PAGE: Record<PageRole, string> = { cashier: "pos", chef: "kitchen", admin: "admin", owner: "admin" }

interface TenantItem {
  slug: string
  name: string
}

export default function LoginForm({ redirect: redirectProp, slug: slugProp, tenants }: { redirect?: string; slug?: string; tenants?: TenantItem[] }) {
  const [page, setPage] = useState<PageRole>("cashier")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [shaking, setShaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()

  const ROLE_LABELS: Record<PageRole, { icon: string; label: string }> = {
    cashier: { icon: "💰", label: t("login.cashier") },
    chef: { icon: "👨‍🍳", label: t("login.chef") },
    admin: { icon: "⚙️", label: t("login.admin") },
    owner: { icon: "👑", label: t("login.owner") },
  }

  const handleLogin = async () => {
    if (!username || !password) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: page, slug: slugProp }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(res.status === 429 ? t("login.tooMany") : t("login.failed"))
        setShaking(true)
        setTimeout(() => setShaking(false), 300)
        return
      }
      const targetSlug = data.slug || slugProp
      if (page === "owner") {
        window.location.href = "/admin"
      } else if (redirectProp) {
        window.location.href = redirectProp
      } else if (targetSlug) {
        window.location.href = `/${targetSlug}/${ROLE_PAGE[page]}`
      }
    } catch {
      setError(t("login.failed"))
      setShaking(true)
      setTimeout(() => setShaking(false), 300)
    } finally { setLoading(false) }
  }

  const visibleRoles: PageRole[] = slugProp ? ["cashier", "chef", "admin"] : ["cashier", "chef", "admin", "owner"]
  const tabs = visibleRoles.map((key) => ({ key, ...ROLE_LABELS[key] }))

  const topBar = (
    <div className="absolute top-4 ltr:right-4 rtl:left-4 flex items-center gap-2">
      <ThemeToggle />
      <LanguageSwitcher />
    </div>
  )

  if (!slugProp && tenants && tenants.length > 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {topBar}
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🍽️</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">{t("login.pickRestaurant")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("login.pickRestaurantSub")}</p>
          </div>
          <div className="space-y-2">
            {tenants.map((t) => (
              <button key={t.slug} onClick={() => router.push(`/${t.slug}/login`)}
                className="w-full text-right rounded-xl border border-border bg-card px-4 py-3.5 text-foreground hover:border-primary/30 hover:shadow-sm transition-all flex items-center justify-between group">
                <div>
                  <span className="font-medium text-sm">{t.name}</span>
                  <span className="text-xs text-muted-foreground block mt-0.5">/{t.slug}</span>
                </div>
                <span className="text-muted-foreground group-hover:text-primary transition-colors">←</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const activeRole = ROLE_LABELS[page]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <style>{`@keyframes shake { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-6px) } 40% { transform: translateX(6px) } 60% { transform: translateX(-4px) } 80% { transform: translateX(4px) } }`}</style>
      {topBar}
      <div className="w-full max-w-sm">
        <div className={`bg-card border border-border rounded-2xl p-6 ${shaking ? "animate-[shake_0.3s_ease-in-out]" : ""}`}>
          {slugProp && (
            <button onClick={() => router.push("/login")}
              className="mb-4 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <span>←</span> {t("login.changeRestaurant")}
            </button>
          )}
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">{activeRole.icon}</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">{activeRole.label}</h1>
            <p className="text-xs text-muted-foreground mt-1">{t("login.subtitle")}</p>
          </div>

          <div className="flex gap-1.5 mb-5 bg-secondary/50 rounded-lg p-1">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => { setPage(tab.key); setError("") }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  page === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className={`w-full rounded-lg border bg-background px-3 py-2.5 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-colors ${
                  error ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
                }`}
                placeholder={t("login.usernamePlaceholder")} autoFocus />
              <span className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">🔑</span>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-colors ${
                error ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
              }`}
              placeholder={t("login.passwordPlaceholder")} />

            {error && <p className="text-xs text-destructive text-center font-medium">{error}</p>}

            <button onClick={handleLogin} disabled={loading || !username || !password}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors active:scale-[0.98]">
              {loading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("login.loggingIn")}
                </span>
              ) : t("login.logIn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
