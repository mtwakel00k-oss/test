"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTranslation } from "@/lib/use-translation"

type PageRole = "cashier" | "chef" | "admin" | "owner"
const ROLE_PAGE: Record<PageRole, string> = { cashier: "pos", chef: "kitchen", admin: "admin", owner: "admin" }
const ROLE_ICONS: Record<PageRole, string> = {
  cashier: "💰",
  chef: "👨‍🍳",
  admin: "⚙️",
  owner: "👑",
}

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
    cashier: { icon: ROLE_ICONS.cashier, label: t("login.cashier") },
    chef: { icon: ROLE_ICONS.chef, label: t("login.chef") },
    admin: { icon: ROLE_ICONS.admin, label: t("login.admin") },
    owner: { icon: ROLE_ICONS.owner, label: t("login.owner") },
  }

  const isEmail = username.includes("@")

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
    } finally {
      setLoading(false)
    }
  }

  const activeRole = ROLE_LABELS[page]
  const visibleRoles: PageRole[] = slugProp ? ["cashier", "chef", "admin"] : ["cashier", "chef", "admin", "owner"]
  const tabs = visibleRoles.map((key) => ({ key, ...ROLE_LABELS[key] }))

  const topBar = (
    <div className="absolute top-4 end-4 flex items-center gap-2">
      <ThemeToggle />
      <LanguageSwitcher />
    </div>
  )

  // No slug provided — show restaurant picker
  if (!slugProp && tenants && tenants.length > 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {topBar}
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🍽️</div>
            <h1 className="text-xl font-bold text-foreground">{t("login.pickRestaurant")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("login.pickRestaurantSub")}</p>
          </div>
          <div className="space-y-2">
            {tenants.map((t) => (
              <button key={t.slug} onClick={() => router.push(`/${t.slug}/login`)}
                className="w-full text-right rounded-lg border border-border bg-secondary px-4 py-3 text-foreground hover:bg-primary/10 hover:border-primary transition-colors">
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground block">/{t.slug}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <style>{`@keyframes shake { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-6px) } 40% { transform: translateX(6px) } 60% { transform: translateX(-4px) } 80% { transform: translateX(4px) } }`}</style>
      {topBar}
      <div className={`w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-lg ${shaking ? "animate-[shake_0.3s_ease-in-out]" : ""}`}>
        {slugProp && (
          <button onClick={() => router.push("/login")}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("login.changeRestaurant")}
          </button>
        )}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{activeRole.icon}</div>
          <h1 className="text-xl font-bold text-foreground">
            {activeRole.label}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("login.subtitle")}</p>
        </div>

        <div className="flex gap-2 mb-6 bg-secondary rounded-lg p-1">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => { setPage(tab.key); setError("") }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                page === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <div className="relative">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className={`w-full rounded-lg border bg-secondary px-3 py-2.5 ps-9 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
                  error ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
                }`}
                placeholder={t("login.usernamePlaceholder")} autoFocus />
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {isEmail ? "📧" : "🔑"}
              </span>
            </div>
          </div>
          <div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={`w-full rounded-lg border bg-secondary px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
                error ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
              }`}
              placeholder={t("login.passwordPlaceholder")} />
          </div>

          {isEmail && (
            <p className="text-xs text-muted-foreground text-center">
              {t("login.autoLink")}
            </p>
          )}

          {error && <p className="text-sm text-red-500 text-center font-medium">{error}</p>}

          <button onClick={handleLogin} disabled={loading || !username || !password}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {loading ? t("login.loggingIn") : t("login.logIn")}
          </button>
        </div>
      </div>
    </div>
  )
}
