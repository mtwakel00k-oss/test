"use client"

import { useEffect, useState, useRef } from "react"
import { LogOut, Receipt, Plus, User, ChevronDown, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { resetTenantClient } from "@/lib/tenant"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { cn } from "@/lib/utils"
import { useStaff } from "@/context/StaffContext"

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
  const cur = lang === "ar" ? "د.ج" : "DA"
  const { activeStaff, staffList, setActiveStaff, loading } = useStaff()

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

  return (
    <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-2xl shadow-sm">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-11 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-black text-foreground tracking-tight leading-none mb-1">{t("pos.title")}</h1>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("pos.subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeStaff && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] text-amber-400 font-semibold whitespace-nowrap">
                {lang === "ar" ? "الكاشير:" : lang === "fr" ? "Caissier:" : "Cashier:"} {activeStaff.name}
              </span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted/50 border border-border/50">
              <div className="relative size-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative block size-2 rounded-full bg-emerald-500" />
              </div>
              <span className="text-xs font-black text-foreground tabular-nums">
                {activeOrders} <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold ms-1">{t("pos.activeOrders")}</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
              <span className="text-xs font-black text-primary tabular-nums">
                {todayRevenue.toLocaleString()} <span className="text-[10px] opacity-70 ms-0.5">{cur}</span>
              </span>
            </div>
          </div>

          {onNewOrder && (
            <button data-testid="new-order-tab" onClick={onNewOrder}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("pos.newOrder")}</span>
            </button>
          )}

          <div className="w-px h-5 bg-border/60 mx-1" />

          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-foreground tabular-nums leading-tight">{currentTime}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{currentDate}</p>
          </div>

          <ThemeToggle />
          <LanguageSwitcher />

          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border/60 hover:bg-muted transition-all">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground max-w-[80px] truncate">
                {activeStaff ? activeStaff.name : (userName || t("pos.user"))}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className={cn("absolute top-full mt-1.5 w-56 rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden z-50", lang === "ar" ? "left-0" : "right-0")}>
                <div className="px-3 py-2.5 border-b border-border/40">
                  <p className="text-xs font-bold text-foreground">{userName || t("pos.user")}</p>
                  {userRole && <p className="text-[10px] text-muted-foreground mt-0.5">{userRole}</p>}
                </div>

                <div className="border-b border-border/40">
                  <div className="px-3 py-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {lang === "ar" ? "المستخدم الحالي" : lang === "fr" ? "Opérateur" : "Active Cashier"}
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <button onClick={() => { setActiveStaff(null); setMenuOpen(false) }}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-muted",
                        !activeStaff ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"
                      )}>
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{userName || t("pos.user")}</span>
                      {!activeStaff && <Check className="w-3 h-3 ml-auto shrink-0" />}
                    </button>
                    {loading ? (
                      <div className="px-3 py-2 text-[11px] text-muted-foreground">
                        {lang === "ar" ? "جاري التحميل..." : "Loading..."}
                      </div>
                    ) : staffList.length === 0 ? (
                      <div className="px-3 py-2 text-[11px] text-muted-foreground">
                        {lang === "ar" ? "لا يوجد موظفون" : lang === "fr" ? "Aucun employé" : "No staff"}
                      </div>
                    ) : (
                      staffList.map(staff => (
                        <button key={staff.id} onClick={() => { setActiveStaff(staff); setMenuOpen(false) }}
                          className={cn(
                            "flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-muted",
                            activeStaff?.id === staff.id ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
                          )}>
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                            activeStaff?.id === staff.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            {staff.name.charAt(0)}
                          </div>
                          <span className="truncate">{staff.name}</span>
                          {activeStaff?.id === staff.id && <Check className="w-3 h-3 ml-auto shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-destructive hover:bg-destructive/5 transition-colors">
                  <LogOut className="w-3.5 h-3.5" /> {t("login.logOut")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
