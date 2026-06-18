"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTranslation } from "@/lib/use-translation"
import { CardContent as _CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

type PageRole = "cashier" | "chef" | "admin" | "owner"
const ROLE_PAGE: Record<PageRole, string> = { cashier: "pos", chef: "kitchen", admin: "admin", owner: "admin" }

interface TenantItem {
  slug: string
  name: string
}

const ROLE_CONFIG: Record<PageRole, { icon: string; labelKey: string; accent: string }> = {
  cashier: { icon: "💳", labelKey: "login.cashier", accent: "emerald" },
  chef: { icon: "👨‍🍳", labelKey: "login.chef", accent: "sky" },
  admin: { icon: "⚙️", labelKey: "login.admin", accent: "teal" },
  owner: { icon: "👑", labelKey: "login.owner", accent: "violet" },
}

const ACCENT_STYLES: Record<string, { color: string; bg: string; ring: string; gradient: string }> = {
  emerald: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20", gradient: "from-emerald-500 to-emerald-600" },
  sky: { color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", ring: "ring-sky-500/20", gradient: "from-sky-500 to-sky-600" },
  teal: { color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10", ring: "ring-teal-500/20", gradient: "from-teal-500 to-teal-600" },
  violet: { color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", ring: "ring-violet-500/20", gradient: "from-violet-500 to-violet-600" },
}

export default function LoginForm({ redirect: redirectProp, slug: slugProp, tenants }: { redirect?: string; slug?: string; tenants?: TenantItem[] }) {
  const [page, setPage] = useState<PageRole>(slugProp ? "cashier" : "admin")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [shaking, setShaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()

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
        const msg = res.status === 429 ? t("login.tooMany") : (data.error || t("login.failed"))
        setError(msg)
        toast({ title: msg, variant: "destructive" })
        setShaking(true)
        setTimeout(() => setShaking(false), 400)
        return
      }
      localStorage.setItem("sessionExpiresAt", String(Date.now() + 7 * 24 * 60 * 60 * 1000))
      const targetSlug = data.slug || slugProp
      if (page === "owner") {
        window.location.href = "/admin"
      } else if (redirectProp) {
        window.location.href = redirectProp
      } else if (targetSlug) {
        window.location.href = `/${targetSlug}/${ROLE_PAGE[page]}`
      }
    } catch (err) {
      console.error("Login error:", err)
      const msg = t("login.failed")
      setError(msg)
      toast({ title: msg, variant: "destructive" })
      setShaking(true)
      setTimeout(() => setShaking(false), 400)
    } finally { setLoading(false) }
  }

  const visibleRoles: PageRole[] = slugProp ? ["cashier", "chef", "admin"] : ["admin", "owner"]
  const activeRole = ROLE_CONFIG[page]
  const accent = ACCENT_STYLES[activeRole.accent]

  const topBar = (
    <div className="absolute top-6 ltr:right-6 rtl:left-6 flex items-center gap-3">
      <ThemeToggle />
      <LanguageSwitcher />
    </div>
  )

  if (!slugProp && tenants && tenants.length > 0) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-background overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary-light),transparent_60%),radial-gradient(ellipse_at_bottom_left,oklch(0.48_0.165_185/0.08),transparent_50%)]" />
        {topBar}
        <div className="relative w-full max-w-sm px-4">
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary-light/30 ring-4 ring-primary/5">
              <span className="text-3xl">🍽️</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("login.pickRestaurant")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("login.pickRestaurantSub")}</p>
          </div>
          <div className="space-y-3">
            {tenants.map((tenant, i) => (
              <button key={tenant.slug} onClick={() => router.push(`/${tenant.slug}/login`)}
                className="group flex items-center justify-between w-full px-5 py-4 text-right transition-all duration-200 rounded-2xl border border-border/60 bg-card/50 hover:border-primary/20 hover:bg-card hover:shadow-sm hover:shadow-primary/5 active:scale-[0.99]"
                style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light/30 text-lg transition-all duration-200 group-hover:bg-primary-bg group-hover:scale-105">
                    🍽️
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground">{tenant.name}</span>
                    <Badge variant="secondary" className="mt-1 text-[10px] font-mono">/{tenant.slug}</Badge>
                  </div>
                </div>
                <svg className="w-5 h-5 text-muted-foreground/40 transition-all duration-200 group-hover:text-foreground/60 ltr:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background overflow-hidden selection:bg-primary/10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--primary-light),transparent_60%),radial-gradient(ellipse_at_bottom_right,oklch(0.58_0.14_165/0.06),transparent_50%)]" />
      {topBar}
      <div className={cn("relative w-full max-w-sm px-4", shaking && "animate-shake")}>
        <div className="rounded-3xl border border-border/40 bg-card/60 backdrop-blur-2xl shadow-xl shadow-primary/5 overflow-hidden">
          {slugProp && (
            <div className="px-8 pt-6">
              <button onClick={() => router.push("/login")}
                className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground/50 hover:text-foreground/70 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t("login.changeRestaurant")}
              </button>
            </div>
          )}

          <div className="px-8 pt-8 pb-6 text-center">
            <div className={cn(
              "size-20 mx-auto mb-5 rounded-[1.75rem] flex items-center justify-center text-3xl ring-8 transition-all duration-500 group-hover:scale-110",
              accent.bg, accent.ring
            )}>
              {activeRole.icon}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t(`${activeRole.labelKey}`)}</h1>
            <p className="text-xs font-medium text-muted-foreground/60 mt-1.5 tracking-wider">{t("login.subtitle")}</p>
          </div>

          <div className="px-8 pb-8">
            {visibleRoles.length > 1 && (
              <div className="flex gap-2 p-1.5 mb-6 rounded-2xl bg-muted/50 border border-border/30">
                {visibleRoles.map(key => {
                  const cfg = ROLE_CONFIG[key]
                  const _acs = ACCENT_STYLES[cfg.accent]
                  return (
                    <button key={key} data-testid={`role-tab-${key}`} onClick={() => { setPage(key); setError("") }}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2",
                        page === key
                          ? "bg-card text-foreground shadow-sm border border-border/30"
                          : "text-muted-foreground/50 hover:text-foreground/70"
                      )}>
                      <span className="text-lg">{cfg.icon}</span>
                      <span className="text-xs font-semibold tracking-wider">{t(cfg.labelKey)}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <Input
                  data-testid="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder={t("login.usernamePlaceholder")}
                  className={cn(
                    "h-12 rounded-xl border border-border/50 bg-muted/30 px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:bg-background transition-all",
                    error && "border-destructive/50 focus-visible:ring-destructive/10"
                  )}
                  autoFocus
                />
              </div>
              <div>
                <Input
                  data-testid="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder={t("login.passwordPlaceholder")}
                  className={cn(
                    "h-12 rounded-xl border border-border/50 bg-muted/30 px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:bg-background transition-all",
                    error && "border-destructive/50 focus-visible:ring-destructive/10"
                  )}
                />
              </div>

              {error && (
                <p data-testid="login-error" className="text-xs font-semibold tracking-wide text-center text-destructive py-1">
                  {error}
                </p>
              )}

              <Button
                data-testid="login-submit"
                onClick={handleLogin}
                disabled={loading || !username || !password}
                variant="default"
                className={cn("w-full h-12 rounded-xl text-xs font-bold tracking-wider shadow-lg", `shadow-${activeRole.accent}-500/20`)}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("login.loggingIn")}
                  </span>
                ) : t("login.logIn")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}