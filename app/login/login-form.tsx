"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTranslation } from "@/lib/use-translation"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { motion, LayoutGroup } from "framer-motion"

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
  const [focusedInput, setFocusedInput] = useState<"username" | "password" | null>(null)
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

  const BrandPanel = () => {
    const shapes = [
      { type: "circle", size: 220, x: "5%", y: "10%", dur: 9, rotDur: 30 },
      { type: "diamond", size: 130, x: "72%", y: "15%", dur: 11, rotDur: 22 },
      { type: "circle", size: 90, x: "18%", y: "68%", dur: 7, rotDur: 18 },
      { type: "diamond", size: 170, x: "78%", y: "74%", dur: 13, rotDur: 35 },
      { type: "circle", size: 55, x: "52%", y: "28%", dur: 8, rotDur: 20 },
    ]

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative hidden md:flex flex-col items-center justify-center bg-zinc-950 p-12 overflow-hidden min-h-screen select-none"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: [
              "linear-gradient(rgba(42,180,80,.12) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(42,180,80,.12) 1px, transparent 1px)",
            ].join(","),
            backgroundSize: "32px 32px",
          }}
        />

        <div className="pointer-events-none absolute -top-48 -right-48 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[150px]" />
        <div className="pointer-events-none absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full bg-accent/8 blur-[120px]" />

        {shapes.map((s, i) => (
          <motion.div
            key={i}
            className={cn(
              "pointer-events-none absolute border border-primary/15",
              s.type === "circle" ? "rounded-full" : "rounded-[2px]"
            )}
            style={{
              width: s.size,
              height: s.size,
              left: s.x,
              top: s.y,
            }}
            animate={{
              y: [0, -(20 + i * 5), 0],
              rotate: s.type === "circle" ? [0, 360] : [45, 405],
            }}
            transition={{
              y: { duration: s.dur, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: s.rotDur, repeat: Infinity, ease: "linear" },
            }}
          />
        ))}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={`dot-${i}`}
              className="absolute h-1.5 w-1.5 rounded-full bg-primary/25"
              style={{
                left: `${(i % 8) * 14 + 4}%`,
                top: `${Math.floor(i / 8) * 30 + 12}%`,
              }}
              animate={{
                opacity: [0, 0.5, 0],
                scale: [0, 1.3, 0],
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4 + (i % 3),
                repeat: Infinity,
                delay: (i * 0.4) % 5,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 18, delay: 0.3 }}
          className="relative z-10 flex flex-col items-center text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.5 }}
            className="mb-10 grid size-28 place-items-center rounded-3xl bg-white/5 ring-1 ring-primary/20 shadow-2xl backdrop-blur-xl"
          >
            <svg className="size-14 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 16, delay: 0.6 }}
            className="font-display text-[3rem] font-normal leading-none tracking-tight text-white"
          >
            RestoOS
          </motion.h1>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 14, delay: 0.8 }}
            className="my-5 h-px w-16 origin-center bg-primary/30"
          />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 90, damping: 15, delay: 0.9 }}
            className="text-base text-white/65 max-w-[16rem] leading-relaxed"
          >
            حيث تُكتب قصص النكهات
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="mt-16 flex items-center gap-2"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-primary/30"
                animate={{
                  opacity: [0.2, 0.8, 0.2],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="mt-4 text-[11px] font-medium tracking-[0.2em] uppercase text-white/25"
          >
            Smart POS System
          </motion.p>
        </motion.div>
      </motion.div>
    )
  }

  const PageShell = ({ children }: { children: ReactNode }) => (
    <div dir="rtl" className="min-h-[100dvh] bg-background md:grid md:grid-cols-[43%_57%] overflow-hidden">
      <BrandPanel />
      <div className="relative min-h-[100dvh] flex flex-col">
        {/* Scan line overlay on right panel */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02] z-0"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0.42 0.16 145 / 0.04) 2px, oklch(0.42 0.16 145 / 0.04) 4px)",
          }}
        />

        <div className="md:hidden flex items-center gap-3 bg-background px-5 py-4 border-b border-border/50">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-display text-base text-foreground">RestoOS</span>
            <p className="text-[11px] text-muted-foreground truncate">نظام نقاط البيع الذكي</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="hidden md:flex absolute top-6 ltr:right-6 rtl:left-6 items-center gap-3 z-10">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center p-4 md:p-8 overflow-hidden z-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 end-0 h-80 w-80 rounded-full bg-primary/5 blur-[90px]" />
            <div className="absolute -bottom-24 start-0 h-72 w-72 rounded-full bg-accent/5 blur-[80px]" />
          </div>
          {children}
        </div>
      </div>
    </div>
  )

  if (!slugProp && tenants && tenants.length > 0) {
    if (showOwnerForm) {
      return (
        <PageShell>
          <LoginCard />
        </PageShell>
      )
    }

    return (
      <PageShell>
        <motion.div
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md px-4"
        >
          <div className="mb-12 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.2 }}
              className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 shadow-lg"
            >
              <svg className="size-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 16, delay: 0.3 }}
            className="font-display text-3xl font-normal tracking-tight text-foreground"
          >
            {t("login.pickRestaurant")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-3 text-sm text-muted-foreground"
          >
            {t("login.pickRestaurantSub")}
          </motion.p>
          </div>
          <div className="space-y-3">
            {tenants.map((tenant, i) => (
              <motion.button
                key={tenant.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => router.push(`/${tenant.slug}/login`)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group flex w-full items-center justify-between rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl px-5 py-4 text-right shadow-sm transition-all duration-500 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
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
                    <Badge className="mt-1.5 font-mono text-[10px] bg-muted/50 text-muted-foreground border-border/50">/{tenant.slug}</Badge>
                  </div>
                </div>
                <svg className="size-5 text-muted-foreground transition-all duration-500 group-hover:text-primary ltr:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
            ))}
          </div>
          <div className="mt-8 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t("login.or")}</span>
              </div>
            </div>
            <motion.button
              onClick={() => { setShowOwnerForm(true); setPage("owner") }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
              className="group inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary transition-all duration-500 hover:border-primary/40 hover:bg-primary/10"
            >
              <RoleIcon role="owner" />
              <span>{t("login.owner")}</span>
            </motion.button>
          </div>
        </motion.div>
      </PageShell>
    )
  }

  function LoginCard() {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
        animate={shaking
          ? { x: [0, -8, 8, -6, 6, -3, 3, 0], opacity: 1, y: 0, filter: 'blur(0px)' }
          : { x: 0, opacity: 1, y: 0, filter: 'blur(0px)' }
        }
        transition={shaking
          ? { type: "spring", stiffness: 200, damping: 6 }
          : { duration: 0.85, ease: [0.22, 1, 0.36, 1] }
        }
        className="relative w-full max-w-sm px-4"
      >
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl shadow-primary/5">
          {(slugProp || showOwnerForm) && (
            <div className="px-6 pt-5">
              <button onClick={() => showOwnerForm ? setShowOwnerForm(false) : router.push("/login")}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t("login.changeRestaurant")}
              </button>
            </div>
          )}

          <div className="px-6 pt-6 pb-5 text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"
            >
              <RoleIcon role={page} />
            </motion.div>
            <h1 className="font-display text-2xl font-normal tracking-tight text-foreground">{t(`${activeRole.labelKey}`)}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          <div className="px-6 pb-6">
            {visibleRoles.length > 1 && (
              <LayoutGroup>
                <div className="mb-5 flex gap-1 rounded-full border border-border/40 bg-muted/20 p-1 backdrop-blur-xl">
                  {visibleRoles.map(key => (
                    <button
                      key={key}
                      data-testid={`role-tab-${key}`}
                      onClick={() => { setPage(key); setError("") }}
                      className={cn(
                        "relative flex flex-1 items-center justify-center gap-2 rounded-full py-2 transition-colors",
                        page === key
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground/70",
                      )}
                    >
                      {page === key && (
                        <motion.div
                          layoutId="active-tab-bg"
                          className="absolute inset-0 rounded-full bg-card shadow-sm ring-1 ring-border/60"
                          transition={{ type: "spring", stiffness: 150, damping: 20 }}
                        />
                      )}
                      <span className={cn("relative z-10 transition-colors", page === key ? "text-primary" : "text-muted-foreground")}>
                        <RoleIcon role={key} />
                      </span>
                      <span className="relative z-10 text-xs font-semibold">{t(ROLE_CONFIG[key].labelKey)}</span>
                    </button>
                  ))}
                </div>
              </LayoutGroup>
            )}

            <div className="space-y-3.5">
              <div className="relative">
                <Input
                  data-testid="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  onFocus={() => setFocusedInput("username")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder={t("login.usernamePlaceholder")}
                  className={cn(
                    "relative z-10 bg-background border-input text-foreground placeholder:text-muted-foreground",
                    "focus-visible:ring-primary/50 focus-visible:border-primary/50",
                    "focus-visible:shadow-[0_0_12px_-2px_oklch(0.42_0.16_145/0.25)]",
                    error && "border-destructive/50"
                  )}
                  autoFocus
                />
                <motion.div
                  className="pointer-events-none absolute -inset-0.5 rounded-xl bg-primary/10 blur-md"
                  initial={false}
                  animate={{
                    opacity: focusedInput === "username" ? 1 : 0,
                    scale: focusedInput === "username" ? 1 : 0.95,
                  }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                />
              </div>

              <div className="relative">
                <Input
                  data-testid="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder={t("login.passwordPlaceholder")}
                  className={cn(
                    "relative z-10 bg-background border-input text-foreground placeholder:text-muted-foreground",
                    "focus-visible:ring-primary/50 focus-visible:border-primary/50",
                    "focus-visible:shadow-[0_0_12px_-2px_oklch(0.42_0.16_145/0.25)]",
                    error && "border-destructive/50"
                  )}
                />
                <motion.div
                  className="pointer-events-none absolute -inset-0.5 rounded-xl bg-primary/10 blur-md"
                  initial={false}
                  animate={{
                    opacity: focusedInput === "password" ? 1 : 0,
                    scale: focusedInput === "password" ? 1 : 0.95,
                  }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                />
              </div>

              {error && (
                <motion.p
                  data-testid="login-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 150, damping: 16 }}
                  className="text-center text-xs font-medium text-destructive"
                >
                  {error}
                </motion.p>
              )}

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
              >
                <Button
                  data-testid="login-submit"
                  onClick={handleLogin}
                  disabled={loading || !username || !password}
                  size="lg"
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
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
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <PageShell>
      <LoginCard />
    </PageShell>
  )
}
