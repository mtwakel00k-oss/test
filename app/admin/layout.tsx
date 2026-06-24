"use client"

import React from "react"
import Link from "next/link"
import { Shield, LayoutDashboard, Settings, Users, ClipboardList } from "lucide-react"
import AuthGuard from "@/components/auth-guard"
import { SessionExpiryModal } from "@/components/session-expiry-modal"
import { useTranslation } from "@/lib/use-translation"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <AuthGuard page="admin">
      <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20" dir="rtl">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl">
          <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm shadow-primary/20">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight">{t("admin.centralDashboard")}</span>
                <p className="text-xs text-muted-foreground">{t("admin.simplooSystem")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
                {t("admin.rootOwner")}
              </span>
            </div>
          </div>
        </header>

        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <aside className="lg:col-span-1">
              <nav className="space-y-1.5 rounded-2xl border border-border/40 bg-muted/30 p-3 backdrop-blur-sm">
                <Link href="/admin" className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-all">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t("admin.home")}</span>
                </Link>
                <Link href="/admin/tenants" className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                  <Users className="h-4 w-4" />
                  <span>{t("admin.manageTenants")}</span>
                </Link>
                <Link href="/admin/logs" className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                  <ClipboardList className="h-4 w-4" />
                  <span>{t("admin.securityLogs")}</span>
                </Link>
                <Link href="/admin/settings" className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                  <Settings className="h-4 w-4" />
                  <span>{t("admin.generalSettings")}</span>
                </Link>
              </nav>
            </aside>
            <main className="lg:col-span-3 min-h-[calc(100vh-12rem)]">
              {children}
              <SessionExpiryModal />
            </main>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
