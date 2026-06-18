"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTranslation } from "@/lib/use-translation"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

type PageRole = "cashier" | "chef" | "admin" | "owner"
const ROLE_PAGE: Record<PageRole, string> = { cashier: "pos", chef: "kitchen", admin: "admin", owner: "admin" }

interface TenantItem {
  slug: string
  name: string
}

const ROLE_CONFIG: Record<PageRole, { icon: string; labelKey: string }> = {
  cashier: { icon: "💳", labelKey: "login.cashier" },
  chef: { icon: "👨‍🍳", labelKey: "login.chef" },
  admin: { icon: "⚙️", labelKey: "login.admin" },
  owner: { icon: "👑", labelKey: "login.owner" },
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

  const topBar = (
    <div className="absolute top-6 ltr:right-6 rtl:left-6 flex items-center gap-3 z-10">
      <ThemeToggle />
      <LanguageSwitcher />
    </div>
  )

  if (!slugProp && tenants && tenants.length > 0) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center app-surface overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 start-1/3 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />
        </div>
        {topBar}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="relative w-full max-w-md px-4"
        >
          <div className="mb-12 text-center">
            <div className="mx-auto mb-6 grid size-16 place-items-center rounded-[1.25rem] bg-primary/10 text-3xl shadow-[var(--shadow-md)]">
              🍽️
            </div>
            <h1 className="font-display text-3xl font-normal tracking-tight text-foreground">{t("login.pickRestaurant")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{t("login.pickRestaurantSub")}</p>
          </div>
          <div className="space-y-3">
            {tenants.map((tenant, i) => (
              <motion.button
                key={tenant.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                onClick={() => router.push(`/${tenant.slug}/login`)}
                className="group flex w-full items-center justify-between rounded-[1.25rem] border border-border/50 bg-card/70 px-5 py-4 text-right shadow-[var(--shadow-sm)] transition-all duration-500 hover:border-primary/20 hover:shadow-[var(--shadow-md)] active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/8 text-xl transition-transform duration-500 group-hover:scale-105">
                    🍽️
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground">{tenant.name}</span>
                    <Badge variant="secondary" className="mt-1.5 font-mono text-[10px]">/{tenant.slug}</Badge>
                  </div>
                </div>
                <svg className="size-5 text-muted-foreground/30 transition-all duration-500 group-hover:text-primary ltr:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center app-surface overflow-hidden selection:bg-primary/10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 end-0 h-80 w-80 rounded-full bg-primary/8 blur-[90px]" />
        <div className="absolute -bottom-24 start-0 h-72 w-72 rounded-full bg-accent/6 blur-[80px]" />
      </div>
      {topBar}
      <motion.div
        initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.85, ease: [0.32, 0.72, 0, 1] }}
        className={cn("relative w-full max-w-md px-4", shaking && "animate-shake")}
      >
        <div className="premium-bezel shadow-[var(--shadow-xl)]">
          <div className="premium-bezel-inner overflow-hidden">
            {slugProp && (
              <div className="px-8 pt-6">
                <button onClick={() => router.push("/login")}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t("login.changeRestaurant")}
                </button>
              </div>
            )}

            <div className="px-8 pt-8 pb-6 text-center">
              <div className="mx-auto mb-6 grid size-20 place-items-center rounded-[1.5rem] bg-primary/8 text-4xl transition-transform duration-500">
                {activeRole.icon}
              </div>
              <h1 className="font-display text-3xl font-normal tracking-tight text-foreground">{t(`${activeRole.labelKey}`)}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("login.subtitle")}</p>
            </div>

            <div className="px-8 pb-8">
              {visibleRoles.length > 1 && (
                <div className="mb-6 flex gap-1.5 rounded-full border border-border/40 bg-muted/40 p-1.5">
                  {visibleRoles.map(key => {
                    const cfg = ROLE_CONFIG[key]
                    return (
                      <button key={key} data-testid={`role-tab-${key}`} onClick={() => { setPage(key); setError("") }}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 transition-all duration-500",
                          page === key
                            ? "bg-card text-foreground shadow-[var(--shadow-sm)]"
                            : "text-muted-foreground hover:text-foreground",
                        )}>
                        <span className="text-base">{cfg.icon}</span>
                        <span className="text-xs font-semibold">{t(cfg.labelKey)}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="space-y-4">
                <Input
                  data-testid="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder={t("login.usernamePlaceholder")}
                  className={cn(error && "border-destructive/50")}
                  autoFocus
                />
                <Input
                  data-testid="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder={t("login.passwordPlaceholder")}
                  className={cn(error && "border-destructive/50")}
                />

                {error && (
                  <p data-testid="login-error" className="text-center text-xs font-medium text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  data-testid="login-submit"
                  onClick={handleLogin}
                  disabled={loading || !username || !password}
                  size="lg"
                  className="w-full"
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
      </motion.div>
    </div>
  )
}
