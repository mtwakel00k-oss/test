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
    <div className="relative flex items-center justify-center min-h-screen p-8 bg-background selection:bg-primary/10">
      {topBar}
      <div className={`w-full max-w-lg ${shaking ? "animate-shake" : ""}`}>
        <div className="bg-card/50 backdrop-blur-3xl border border-border/50 rounded-[3rem] shadow-2xl overflow-hidden">
          {slugProp && (
            <div className="px-10 pt-8">
              <button onClick={() => router.push("/login")}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all text-muted-foreground/40 hover:text-foreground">
                <span>←</span> {t("login.changeRestaurant")}
              </button>
            </div>
          )}
          <CardHeader className="text-center p-10 pb-6">
            <div className={cn(
              "size-20 mx-auto mb-6 rounded-[1.75rem] flex items-center justify-center text-3xl shadow-2xl transition-all duration-500 hover:scale-110",
              page === "cashier" ? "bg-emerald-500/10 text-emerald-600 shadow-emerald-500/10" :
              page === "chef" ? "bg-sky-500/10 text-sky-600 shadow-sky-500/10" :
              page === "owner" ? "bg-violet-500/10 text-violet-600 shadow-violet-500/10" :
              "bg-amber-500/10 text-amber-600 shadow-amber-500/10"
            )}>
              {activeRole.icon}
            </div>
            <CardTitle className="text-3xl font-black tracking-tight leading-none mb-2">{activeRole.label}</CardTitle>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{t("login.subtitle")}</p>
          </CardHeader>
          <CardContent className="p-10 pt-0">
            {tabs.length > 1 && (
              <div className="flex gap-2 p-2 mb-8 rounded-[1.5rem] bg-muted/50 border border-border/50 shadow-inner">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => { setPage(tab.key); setError("") }}
                    className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                      page === tab.key
                        ? "bg-background text-primary shadow-xl shadow-primary/5 border border-border/50"
                        : "text-muted-foreground/60 hover:text-foreground"
                    }`}>
                    <span className="text-lg">{tab.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative group">
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder={t("login.usernamePlaceholder")}
                  className={cn(
                    "h-14 rounded-2xl border border-border/50 bg-muted/30 px-6 text-sm font-bold text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:bg-background transition-all",
                    error && "border-rose-500 focus-visible:ring-rose-500/10"
                  )}
                  autoFocus
                />
              </div>
              <div className="relative group">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder={t("login.passwordPlaceholder")}
                  className={cn(
                    "h-14 rounded-2xl border border-border/50 bg-muted/30 px-6 text-sm font-bold text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:bg-background transition-all",
                    error && "border-rose-500 focus-visible:ring-rose-500/10"
                  )}
                />
              </div>

              {error && <p className="text-[10px] font-black uppercase tracking-widest text-center text-rose-500 py-2">{error}</p>}

              <Button
                onClick={handleLogin}
                disabled={loading || !username || !password}
                className="w-full h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("login.loggingIn")}
                  </span>
                ) : t("login.logIn")}
              </Button>
            </div>
          </CardContent>
        </div>
      </div>
    </div>
  )
}
