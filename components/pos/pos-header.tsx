"use client"

import { useEffect, useState, useRef } from "react"
import { LogOut, Receipt, Plus, User, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { resetTenantClient } from "@/lib/tenant"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { cn } from "@/lib/utils"

interface POSHeaderProps {
  totalOrders: number
  activeOrders: number
  todayRevenue: number
  onNewOrder?: () => void
  userName?: string
  userRole?: string
}

export function POSHeader({ totalOrders, activeOrders, todayRevenue, onNewOrder, userName, userRole }: POSHeaderProps) {
  const router = useRouter()
  const slug = useSlug()
  const { t, lang } = useTranslation()
  const [currentTime, setCurrentTime] = useState("")
  const [currentDate, setCurrentDate] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const logout = async () => {
    setMenuOpen(false)
    resetTenantClient()
    await fetch("/api/auth/logout", { method: "POST" })
    router.push(`/${slug}/login`)
  }

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }))
      setCurrentDate(now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const cur = lang === "ar" ? "د.ج" : "DA"

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="flex items-center justify-between gap-2 px-3 lg:px-5 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-foreground leading-tight">{t("pos.title")}</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">{t("pos.subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{activeOrders}</span>
                <span className="hidden lg:inline text-muted-foreground"> {t("pos.activeOrders")}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted">
              <Receipt className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{totalOrders}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary font-semibold tabular-nums">{todayRevenue.toLocaleString()} {cur}</span>
            </div>
          </div>

          {onNewOrder && (
            <button onClick={onNewOrder}
              className="btn-primary h-8 text-xs px-3">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("pos.newOrder")}</span>
            </button>
          )}

          <div className="w-px h-5 bg-border mx-0.5 hidden sm:block" />

          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-foreground tabular-nums leading-tight">{currentTime}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{currentDate}</p>
          </div>

          <ThemeToggle />
          <LanguageSwitcher />

          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 h-8 px-2 rounded-lg border border-border hover:bg-muted transition-colors">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground max-w-[80px] truncate">{userName || t("pos.user")}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {menuOpen && (
              <div className={cn(
                "absolute top-full mt-1 w-48 rounded-xl border border-border bg-card shadow-lg overflow-hidden",
                lang === "ar" ? "left-0" : "right-0"
              )}>
                <div className="px-3 py-2.5 border-b border-border/50">
                  <p className="text-xs font-semibold text-foreground">{userName || t("pos.user")}</p>
                  {userRole && <p className="text-[10px] text-muted-foreground mt-0.5">{userRole}</p>}
                </div>
                <button onClick={logout}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-destructive hover:bg-destructive/5 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                  {t("login.logOut")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
