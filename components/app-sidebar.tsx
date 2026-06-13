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
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-background/80 backdrop-blur-2xl">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-xl shadow-xl shadow-primary/20 shrink-0">
            R
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
            <span className="text-sm font-black text-foreground tracking-tight">RestoOS</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">الإدارة</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {nav.map((g) => (
          <SidebarGroup key={g.group} className="py-4">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-4 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{g.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={path === item.href} 
                      tooltip={item.label}
                      className="rounded-2xl h-11 px-4 transition-all duration-300 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                    >
                      <a href={item.href} className="flex items-center gap-3">
                        <item.icon className={cn("size-5 transition-transform duration-300", path === item.href && "scale-110")} />
                        <span className="font-bold text-sm">{item.label}</span>
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
