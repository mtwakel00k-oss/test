"use client"

import { useEffect, useState } from "react"
import { LogOut, ChefHat, Receipt } from "lucide-react"
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
}

export function POSHeader({ totalOrders, activeOrders, todayRevenue }: POSHeaderProps) {
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
    <header className="bg-card border-b border-border px-3 lg:px-5 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-foreground">{t("pos.title")}</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">{t("pos.subtitle")}</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              <span className="font-semibold text-foreground">{activeOrders}</span>
              <span className="hidden lg:inline"> {t("pos.activeOrders")}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50">
            <Receipt className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              <span className="font-semibold text-foreground">{totalOrders}</span>
              <span className="hidden lg:inline"> {t("pos.totalOrders")}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
            <span className="w-1 h-1 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              <span className="font-semibold tabular-nums text-primary">{todayRevenue.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} {cur}</span>
              <span className="hidden lg:inline"> {t("pos.dailyRevenue")}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="text-right hidden sm:block ltr:text-left">
            <p className="text-xs font-medium text-foreground tabular-nums">{currentTime}</p>
            <p className="text-[10px] text-muted-foreground">{currentDate}</p>
          </div>
          <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
          <ThemeToggle />
          <LanguageSwitcher />
          <a href={`/${slug}/kitchen`} target="_blank" title={t("pos.kitchen")}
            className="h-8 w-8 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors">
            <ChefHat className="h-3.5 w-3.5" />
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
