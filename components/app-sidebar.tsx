"use client"

import { usePathname } from "next/navigation"
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, ChefHat, Truck, Star, Settings, LogOut } from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/blocks/sidebar"
import { resetTenantClient } from "@/lib/tenant"

const nav = [
  { group: "عام", items: [
    { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/admin?tab=orders", label: "الطلبات", icon: ShoppingBag },
    { href: "/admin?tab=products", label: "المنتجات", icon: UtensilsCrossed },
    { href: "/admin?tab=reviews", label: "التقييمات", icon: Star },
  ]},
  { group: "التقارير", items: [
    { href: "/admin?tab=analytics", label: "المبيعات", icon: ChefHat },
    { href: "/admin?tab=peak", label: "ساعات الذروة", icon: Truck },
  ]},
]

export function AppSidebar() {
  const path = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-extrabold text-sm">
            R
          </div>
          <span className="text-sm font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            RestoOS
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {nav.map((g) => (
          <SidebarGroup key={g.group}>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{g.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={path === item.href} tooltip={item.label}>
                      <a href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="تسجيل الخروج">
              <button onClick={async () => { resetTenantClient(); await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login" }}>
                <LogOut className="size-4" />
                <span>تسجيل الخروج</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
