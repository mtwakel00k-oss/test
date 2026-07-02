"use client"

import { motion } from "framer-motion"
import { ChartNoAxesColumn, ShoppingBag, ClipboardList, Shield, BarChart3, Users, Percent } from "lucide-react"
import type { ReactNode } from "react"

interface SidebarItem {
  id: string
  label: string
  icon: ReactNode
  adminOnly?: boolean
}

interface TenantSidebarProps {
  currentTab: string
  onTabChange: (tab: string) => void
  userRole: string | null
  labels: Record<string, string>
}

export function TenantSidebar({ currentTab, onTabChange, userRole, labels }: TenantSidebarProps) {
  const isAdmin = userRole === "admin" || userRole === "owner"

  const items: SidebarItem[] = [
    { id: "overview", label: labels.overview, icon: <ChartNoAxesColumn className="size-4" strokeWidth={1.5} /> },
    { id: "products", label: labels.products, icon: <ShoppingBag className="size-4" strokeWidth={1.5} /> },
    { id: "orders", label: labels.orders, icon: <ClipboardList className="size-4" strokeWidth={1.5} /> },
    { id: "audit", label: labels.audit, icon: <Shield className="size-4" strokeWidth={1.5} />, adminOnly: true },
    { id: "analytics", label: labels.analytics, icon: <BarChart3 className="size-4" strokeWidth={1.5} />, adminOnly: true },
    { id: "staff", label: labels.staff, icon: <Users className="size-4" strokeWidth={1.5} />, adminOnly: true },
    { id: "promotions", label: labels.promotions || "Promotions", icon: <Percent className="size-4" strokeWidth={1.5} />, adminOnly: true },
  ]

  const visible = items.filter(item => !item.adminOnly || isAdmin)

  return (
    <nav className="w-56 shrink-0 space-y-1" aria-label="Admin navigation">
      {visible.map((item) => {
        const active = currentTab === item.id
        return (
          <motion.button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            whileTap={{ scale: 0.97 }}
            className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-accent/15 text-accent"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {active && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
        )
      })}
    </nav>
  )
}
