"use client"

import { useEffect, useState } from "react"
import { LogOut, ChefHat } from "lucide-react"
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
    <header className="bg-card border-b border-border px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">{t("pos.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("pos.subtitle")}</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{activeOrders}</span> {t("pos.activeOrders")}
            </span>
          </div>
          <div className="w-px h-4 bg-border"></div>
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{totalOrders}</span> {t("pos.totalOrders")}
          </span>
          <div className="w-px h-4 bg-border"></div>
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{todayRevenue.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} {cur}</span> {t("pos.dailyRevenue")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{currentTime}</p>
            <p className="text-xs text-muted-foreground">{currentDate}</p>
          </div>
          <ThemeToggle />
          <LanguageSwitcher />
          <a
            href={`/${slug}/kitchen`}
            target="_blank"
            title={t("pos.kitchen")}
            className="h-9 w-9 rounded-lg bg-secondary hover:bg-amber-500/10 hover:text-amber-600 flex items-center justify-center transition-colors"
          >
            <ChefHat className="h-4 w-4" />
          </a>
          <button
            onClick={logout}
            title={t("login.logOut")}
            className="h-9 w-9 rounded-lg bg-secondary hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
