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
  const activeRole = ROLE_LABELS[page]

  const topBar = (
    <div className="absolute top-4 ltr:right-4 rtl:left-4 flex items-center gap-2">
      <ThemeToggle />
      <LanguageSwitcher />
    </div>
  )

  if (!slugProp && tenants && tenants.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        {topBar}
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/5">
              <span className="text-2xl">🍽️</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">{t("login.pickRestaurant")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("login.pickRestaurantSub")}</p>
          </div>
          <div className="space-y-2">
            {tenants.map((tenant) => (
              <button key={tenant.slug} onClick={() => router.push(`/${tenant.slug}/login`)}
                className="flex items-center justify-between w-full px-4 py-3.5 text-right transition-all border rounded-xl border-border bg-card text-foreground hover:border-primary/30 hover:shadow-sm group">
                <div>
                  <span className="text-sm font-medium">{tenant.name}</span>
                  <span className="block mt-0.5 text-xs text-muted-foreground">/{tenant.slug}</span>
                </div>
                <span className="text-muted-foreground transition-colors group-hover:text-primary">←</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 bg-background">
      {topBar}
      <div className="w-full max-w-sm">
        <div className={`relative overflow-hidden bg-card border border-border rounded-2xl p-6 shadow-sm ${shaking ? "animate-shake" : ""}`}>
          {slugProp && (
            <button onClick={() => router.push("/login")}
              className="flex items-center gap-1 mb-4 text-xs transition-colors text-muted-foreground hover:text-foreground">
              <span>←</span> {t("login.changeRestaurant")}
            </button>
          )}
          <div className="mb-5 text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/5">
              <span className="text-2xl">{activeRole.icon}</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">{activeRole.label}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          <div className="flex gap-1.5 p-1 mb-5 rounded-lg bg-muted/50">
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
                className={`input-base pr-9 ${
                  error ? "border-destructive focus:ring-destructive/20" : ""
                }`}
                placeholder={t("login.usernamePlaceholder")} autoFocus />
              <span className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">🔑</span>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={`input-base ${error ? "border-destructive focus:ring-destructive/20" : ""}`}
              placeholder={t("login.passwordPlaceholder")} />

            {error && <p className="text-xs font-medium text-center text-destructive">{error}</p>}

            <button onClick={handleLogin} disabled={loading || !username || !password}
              className="btn-primary w-full py-2.5">
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
