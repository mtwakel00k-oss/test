"use client"

import { useState } from "react"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTranslation } from "@/lib/use-translation"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

type PageRole = "cashier" | "chef" | "admin" | "owner"
const ROLE_PAGE: Record<PageRole, string> = { cashier: "pos", chef: "kitchen", admin: "admin", owner: "admin" }

interface TenantItem {
  slug: string
  name: string
}

const ICONS = {
  cashier: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
      <line x1="7" y1="15" x2="7" y2="15.01" />
      <line x1="12" y1="15" x2="16" y2="15" />
    </svg>
  ),
  chef: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z" />
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  owner: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <path d="M3 20h18" />
    </svg>
  ),
}

const ROLE_CONFIG: Record<PageRole, { labelKey: string; icon: React.ReactNode }> = {
  cashier: { labelKey: "login.cashier", icon: ICONS.cashier },
  chef: { labelKey: "login.chef", icon: ICONS.chef },
  admin: { labelKey: "login.admin", icon: ICONS.admin },
  owner: { labelKey: "login.owner", icon: ICONS.owner },
}

export default function LoginForm({ redirect: redirectProp, slug: slugProp, tenants }: { redirect?: string; slug?: string; tenants?: TenantItem[] }) {
  const [page, setPage] = useState<PageRole>(slugProp ? "cashier" : "admin")
  const [selectedSlug, setSelectedSlug] = useState(slugProp || "")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [shaking, setShaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showTenantPicker, setShowTenantPicker] = useState(false)
  const { t } = useTranslation()

  const handleLogin = async () => {
    if (!username || !password) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: page, slug: selectedSlug }),
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
      const targetSlug = data.slug || selectedSlug
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

  const visibleRoles: PageRole[] = selectedSlug ? ["cashier", "chef", "admin"] : ["admin", "owner"]
  const needsRestaurant = page !== "owner" && !selectedSlug && (!slugProp || slugProp === "")

  return (
    <div className="relative min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4 overflow-hidden" dir="rtl">
      {/* Background ambiance */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-accent/[0.04] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Top bar */}
      <div className="fixed top-4 ltr:right-4 rtl:left-4 flex items-center gap-2 z-50">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={shaking
          ? { x: [0, -8, 8, -6, 6, -3, 3, 0], opacity: 1, y: 0 }
          : { opacity: 1, y: 0 }
        }
        transition={shaking
          ? { type: "spring", stiffness: 200, damping: 6 }
          : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
        }
        className="relative w-full max-w-sm"
      >
        <div className="rounded-3xl border border-border/30 bg-card/70 backdrop-blur-2xl shadow-2xl shadow-primary/5 overflow-hidden">
          {/* Logo & Brand */}
          <div className="pt-10 pb-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.1 }}
              className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"
            >
              <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-2xl font-bold tracking-tight text-foreground"
            >
              RestoOS
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-1 text-xs text-muted-foreground/50"
            >
              {t("login.subtitle")}
            </motion.p>
          </div>

          <div className="px-6 pb-8 space-y-5">
            {/* Role tabs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex gap-1 rounded-xl border border-border/30 bg-muted/30 p-1"
            >
              {visibleRoles.map(key => {
                const cfg = ROLE_CONFIG[key]
                return (
                  <button
                    key={key}
                    data-testid={`role-tab-${key}`}
                    onClick={() => { setPage(key); setError("") }}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-300",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      page === key
                        ? "bg-card text-foreground shadow-sm ring-1 ring-border/30"
                        : "text-muted-foreground/50 hover:text-foreground"
                    )}
                  >
                    <span className="text-sm">{cfg.icon}</span>
                    <span>{t(cfg.labelKey)}</span>
                  </button>
                )
              })}
            </motion.div>

            {/* Tenant picker trigger */}
            {needsRestaurant && tenants && tenants.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  onClick={() => setShowTenantPicker(!showTenantPicker)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm transition-all duration-300",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    selectedSlug
                      ? "border-primary/30 bg-primary/5 text-foreground"
                      : "border-border/30 bg-muted/20 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <svg className="size-4 text-primary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    {selectedSlug
                      ? tenants.find(tn => tn.slug === selectedSlug)?.name || selectedSlug
                      : (t("login.selectRestaurant") || "اختر المطعم")}
                  </span>
                  <svg className={cn("size-4 text-muted-foreground/40 transition-transform duration-300", showTenantPicker && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {showTenantPicker && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-1 rounded-xl border border-border/20 bg-card/80 p-2 shadow-lg backdrop-blur-xl max-h-48 overflow-y-auto">
                        {tenants.map(tn => (
                          <button
                            key={tn.slug}
                            onClick={() => { setSelectedSlug(tn.slug); setShowTenantPicker(false) }}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-right transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              selectedSlug === tn.slug
                                ? "bg-primary/8 text-foreground"
                                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                            )}
                          >
                            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary">
                              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate">{tn.name}</div>
                              <Badge className="mt-0.5 font-mono text-[9px] bg-transparent text-muted-foreground/40 border-border/30">/{tn.slug}</Badge>
                            </div>
                            {selectedSlug === tn.slug && (
                              <svg className="size-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Animated transition between restaurant direct entry and login form */}
            <AnimatePresence mode="wait">
              {page === "admin" ? (
                <motion.div
                  key="restaurant"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Button
                    data-testid="restaurant-continue"
                    onClick={() => {
                      const slug = selectedSlug || slugProp
                      if (slug) window.location.href = `/${slug}/admin`
                    }}
                    disabled={!selectedSlug && !slugProp}
                    size="lg"
                    className="w-full h-12 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("login.logIn") || "ادخل إلى لوحة التحكم"}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-3"
                >
                  {/* Form fields */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3"
                  >
                    <Input
                      data-testid="username-input"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      placeholder={t("login.usernamePlaceholder")}
                      className={cn(error && "!border-destructive/40")}
                      autoFocus
                    />

                    <Input
                      data-testid="password-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      placeholder={t("login.passwordPlaceholder")}
                      className={cn(error && "!border-destructive/40")}
                    />
                  </motion.div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        data-testid="login-error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ type: "spring", stiffness: 150, damping: 16 }}
                        className="text-center text-xs font-medium text-destructive"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Button
                      data-testid="login-submit"
                      onClick={handleLogin}
                      disabled={loading || !username || !password || (needsRestaurant && !selectedSlug)}
                      size="lg"
                      className="w-full h-12 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="fixed bottom-6 text-[10px] font-medium text-muted-foreground/25 tracking-wider"
      >
        RestoOS &mdash; Smart POS System
      </motion.p>
    </div>
  )
}
