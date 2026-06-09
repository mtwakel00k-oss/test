"use client"

import { useEffect, useState } from "react"
import { LogOut, ChefHat, Receipt, Plus, LayoutDashboard } from "lucide-react"
import { useRouter } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { resetTenantClient } from "@/lib/tenant"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"

interface POSHeaderProps {
  totalOrders: number
  activeOrders: number
  todayRevenue: number
  onNewOrder?: () => void
}

export function POSHeader({ totalOrders, activeOrders, todayRevenue, onNewOrder }: POSHeaderProps) {
  const router = useRouter()
  const slug = useSlug()
  const { t, lang } = useTranslation()
  const [currentTime, setCurrentTime] = useState("")
  const [currentDate, setCurrentDate] = useState("")

  const logout = async () => {
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

  const cur = lang === "ar" ? "د.ج" : "DA"

  return (
    <header className="bg-card border-b border-border px-3 lg:px-5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-foreground leading-tight">{t("pos.title")}</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">{t("pos.subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{activeOrders}</span>
                <span className="hidden lg:inline text-muted-foreground"> {t("pos.activeOrders")}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50">
              <Receipt className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{totalOrders}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs text-primary font-semibold tabular-nums">{todayRevenue.toLocaleString()} {cur}</span>
            </div>
          </div>

          {onNewOrder && (
            <button onClick={onNewOrder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95 shadow-sm">
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
          <a href={`/${slug}/kitchen`} target="_blank" title={t("pos.kitchen")}
            className="h-8 w-8 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors">
            <ChefHat className="h-3.5 w-3.5" />
          </a>
          <a href={`/${slug}/admin`} title={t("pos.admin")}
            className="h-8 w-8 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors">
            <LayoutDashboard className="h-3.5 w-3.5" />
          </a>
          <button onClick={logout} title={t("login.logOut")}
            className="h-8 w-8 rounded-lg bg-secondary hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  )
}
