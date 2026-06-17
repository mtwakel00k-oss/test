"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Building2, Shield } from "lucide-react"
import { resetTenantClient } from "@/lib/tenant"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { PlanManager } from "@/components/admin/plan-manager"
import { PageTransition } from "@/components/page-transition"

export default function AdminDashboard() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(data => {
      if (!data || data.role !== "owner") router.push("/login")
      else setReady(true)
    }).catch(() => router.push("/login"))
  }, [router])

  if (!ready) return null

  return (
    <div className="min-h-screen bg-background" dir="ltr">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">Root Admin</h1>
              <p className="text-xs text-muted-foreground">Developer panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <button onClick={async () => { resetTenantClient(); await fetch("/api/auth/logout", { method: "POST" }); router.push("/login") }}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95">
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>
      <PageTransition>
        <main className="p-4 lg:p-6 max-w-7xl mx-auto">
          <PlanManager />
        </main>
      </PageTransition>
    </div>
  )
}