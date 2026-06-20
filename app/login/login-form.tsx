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

function RoleIcon({ role }: { role: PageRole }) {
  const svgs: Record<PageRole, React.ReactNode> = {
    cashier: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    chef: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z" />
        <line x1="6" y1="17" x2="18" y2="17" />
      </svg>
    ),
    admin: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    owner: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  }
  return <>{svgs[role]}</>
}

const ROLE_CONFIG: Record<PageRole, { labelKey: string }> = {
  cashier: { labelKey: "login.cashier" },
  chef: { labelKey: "login.chef" },
  admin: { labelKey: "login.admin" },
  owner: { labelKey: "login.owner" },
}

export default function LoginForm({ redirect: redirectProp, slug: slugProp, tenants }: { redirect?: string; slug?: string; tenants?: TenantItem[] }) {
  const [page, setPage] = useState<PageRole>(slugProp ? "cashier" : "admin")
  const [showOwnerForm, setShowOwnerForm] = useState(false)
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
    if (showOwnerForm) {
      return renderLoginForm()
    }
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center app-surface overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 start-1/3 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />
        </div>
        {topBar}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md px-4"
        >
          <div className="mb-12 text-center">
            <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-primary/10 shadow-[var(--shadow-md)]">
              <svg className="size-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
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
                transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => router.push(`/${tenant.slug}/login`)}
                className="group flex w-full items-center justify-between rounded-2xl border border-border/50 bg-card/70 px-5 py-4 text-right shadow-sm transition-all duration-500 hover:border-primary/20 hover:shadow-[var(--shadow-md)] active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary transition-transform duration-500 group-hover:scale-105">
                    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
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
          <div className="mt-8 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">{t("login.or")}</span>
              </div>
            </div>
            <button onClick={() => { setShowOwnerForm(true); setPage("owner") }}
              className="group inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary transition-all duration-500 hover:border-primary/40 hover:bg-primary/10 active:scale-[0.98]"
            >
              <RoleIcon role="owner" />
              <span>{t("login.owner")}</span>
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  function renderLoginForm() {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center app-surface overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 end-0 h-80 w-80 rounded-full bg-primary/8 blur-[90px]" />
          <div className="absolute -bottom-24 start-0 h-72 w-72 rounded-full bg-accent/6 blur-[80px]" />
        </div>
        {topBar}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className={cn("relative w-full max-w-sm px-4", shaking && "animate-shake")}
        >
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-[var(--shadow-xl)]">
            {(slugProp || showOwnerForm) && (
              <div className="px-6 pt-5">
                <button onClick={() => showOwnerForm ? setShowOwnerForm(false) : router.push("/login")}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground/60 transition-colors hover:text-foreground">
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t("login.changeRestaurant")}
                </button>
              </div>
            )}

            <div className="px-6 pt-6 pb-5 text-center">
              <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-primary/8 text-primary transition-transform duration-500">
                <RoleIcon role={page} />
              </div>
              <h1 className="font-display text-2xl font-normal tracking-tight text-foreground">{t(`${activeRole.labelKey}`)}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground/60">{t("login.subtitle")}</p>
            </div>

            <div className="px-6 pb-6">
              {visibleRoles.length > 1 && (
                <div className="mb-5 flex gap-1 rounded-full border border-border/30 bg-muted/40 p-1">
                  {visibleRoles.map(key => (
                    <button key={key} data-testid={`role-tab-${key}`} onClick={() => { setPage(key); setError("") }}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-full py-2 transition-all duration-500",
                        page === key
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground/50 hover:text-foreground",
                      )}>
                      <span className={cn("transition-colors", page === key ? "text-primary" : "text-muted-foreground/40")}>
                        <RoleIcon role={key} />
                      </span>
                      <span className="text-xs font-semibold">{t(ROLE_CONFIG[key].labelKey)}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
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
                  className="w-full h-12 rounded-xl text-sm font-semibold shadow-[var(--shadow-md)]"
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
        </motion.div>
      </div>
    )
  }

  return renderLoginForm()
}
