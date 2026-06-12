"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTranslation } from "@/lib/use-translation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

export default function LoginForm({ redirect: redirectProp, slug: slugProp, tenants }: { redirect?: string; slug?: string; tenants?: TenantItem[] }) {
  const [page, setPage] = useState<PageRole>(slugProp ? "cashier" : "admin")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [shaking, setShaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()

  const ROLE_LABELS: Record<PageRole, { icon: string; label: string; activeColor: string; inactiveBg: string; gradient: string }> = {
    cashier: { icon: "💳", label: t("login.cashier"), activeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", inactiveBg: "hover:bg-emerald-500/5", gradient: "from-emerald-500 to-emerald-600" },
    chef: { icon: "👨‍🍳", label: t("login.chef"), activeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400", inactiveBg: "hover:bg-sky-500/5", gradient: "from-sky-500 to-sky-600" },
    admin: { icon: "⚙️", label: t("login.admin"), activeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400", inactiveBg: "hover:bg-amber-500/5", gradient: "from-amber-500 to-orange-600" },
    owner: { icon: "👑", label: t("login.owner"), activeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400", inactiveBg: "hover:bg-violet-500/5", gradient: "from-violet-500 to-purple-600" },
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
        const msg = res.status === 429 ? t("login.tooMany") : (data.error || t("login.failed"))
        setError(msg)
        toast({ title: msg, variant: "destructive" })
        setShaking(true)
        setTimeout(() => setShaking(false), 400)
        return
      }
      // Store session expiry for admin session-extend modal
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
          <div className="space-y-2.5">
            {tenants.map((tenant, i) => (
              <button key={tenant.slug} onClick={() => router.push(`/${tenant.slug}/login`)}
                className="flex items-center justify-between w-full px-4 py-4 text-right transition-all border rounded-xl border-border bg-card text-foreground hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 group animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-lg group-hover:bg-primary/10 transition-colors">
                    🍽️
                  </div>
                  <div>
                    <span className="text-sm font-semibold">{tenant.name}</span>
                    <Badge variant="secondary" className="mt-0.5 text-[10px] font-mono">/{tenant.slug}</Badge>
                  </div>
                </div>
                <span className="text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-1 ltr:group-hover:-translate-x-1">←</span>
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
      <div className={`w-full max-w-sm ${shaking ? "animate-shake" : ""}`}>
        <Card className="border-border shadow-sm">
          {slugProp && (
            <div className="px-6 pt-4">
              <button onClick={() => router.push("/login")}
                className="flex items-center gap-1 text-xs transition-colors text-muted-foreground hover:text-foreground">
                <span>←</span> {t("login.changeRestaurant")}
              </button>
            </div>
          )}
          <CardHeader className="text-center">
            <div className={cn(
              "flex items-center justify-center w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br shadow-lg",
              page === "cashier" ? "from-emerald-500/20 to-emerald-600/10 shadow-emerald-500/10" :
              page === "chef" ? "from-sky-500/20 to-sky-600/10 shadow-sky-500/10" :
              page === "owner" ? "from-violet-500/20 to-purple-600/10 shadow-violet-500/10" :
              "from-amber-500/20 to-orange-600/10 shadow-amber-500/10"
            )}>
              <span className="text-2xl">{activeRole.icon}</span>
            </div>
            <CardTitle>{activeRole.label}</CardTitle>
            <CardDescription>{t("login.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {tabs.length > 1 && (
              <div className="flex gap-1.5 p-1 mb-5 rounded-lg bg-muted/50">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => { setPage(tab.key); setError("") }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                      page === tab.key
                        ? `${tab.activeColor} shadow-sm border border-border/30`
                        : `text-muted-foreground ${tab.inactiveBg} hover:text-foreground`
                    }`}>
                    <span className="text-sm">{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder={t("login.usernamePlaceholder")}
                className={error ? "border-destructive focus-visible:ring-destructive/20" : ""}
                autoFocus
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder={t("login.passwordPlaceholder")}
                className={error ? "border-destructive focus-visible:ring-destructive/20" : ""}
              />

              {error && <p className="text-xs font-medium text-center text-destructive">{error}</p>}

              <Button
                onClick={handleLogin}
                disabled={loading || !username || !password}
                className="w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("login.loggingIn")}
                  </span>
                ) : t("login.logIn")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
