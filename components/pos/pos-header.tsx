"use client"

import { useEffect, useState, useRef } from "react"
import { LogOut, Receipt, Plus, User, ChevronDown, Check, Key } from "lucide-react"
import { useRouter } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { resetTenantClient } from "@/lib/tenant"
import { useSlug } from "@/lib/use-slug"
import { useTranslation } from "@/lib/use-translation"
import { cn } from "@/lib/utils"
import { useStaff } from "@/context/StaffContext"
import { ChangePasswordDialog } from "@/components/change-password-dialog"

interface POSHeaderProps {
  totalOrders?: number
  activeOrders: number
  todayRevenue: number
  onNewOrder?: () => void
  userName?: string
  userRole?: string
}

export function POSHeader({ totalOrders: _totalOrders, activeOrders, todayRevenue, onNewOrder, userName, userRole }: POSHeaderProps) {
  const router = useRouter()
  const slug = useSlug()
  const { t, lang } = useTranslation()
  const [currentTime, setCurrentTime] = useState("")
  const [currentDate, setCurrentDate] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const cur = lang === "ar" ? "د.ج" : "DA"
  const { activeStaff, staffList, setActiveStaff, loading } = useStaff()
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

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

  return (<>
    <header className="sticky top-0 z-30 px-4 pt-4 md:px-6">
      <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-border/50 bg-card/70 px-5 py-3 shadow-[var(--shadow-sm)] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-11 rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-md),var(--shadow-glow)]">
            <Receipt className="size-5" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold leading-none tracking-tight text-foreground">{t("pos.title")}</h1>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-malachite " />
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t("pos.subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeStaff && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-success/10 border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-[11px] text-success font-semibold whitespace-nowrap">
                {lang === "ar" ? "الكاشير:" : lang === "fr" ? "Caissier:" : "Cashier:"} {activeStaff.name}
              </span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted/50 border border-border/50">
              <div className="relative size-2">
                <span className="absolute inset-0 rounded-full bg-malachite animate-ping opacity-75" />
                <span className="relative block size-2 rounded-full bg-malachite" />
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
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-md),var(--shadow-glow)] transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">
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

                <button onClick={() => { setMenuOpen(false); setPasswordDialogOpen(true) }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-foreground hover:bg-muted transition-colors border-t border-border/40">
                  <Key className="w-3.5 h-3.5 text-muted-foreground" />
                  {lang === "ar" ? "تغيير كلمة المرور" : lang === "fr" ? "Changer le mot de passe" : "Change Password"}
                </button>

                <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-destructive hover:bg-destructive/5 transition-colors">
                  <LogOut className="w-3.5 h-3.5" /> {t("login.logOut")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
  </>)
}
