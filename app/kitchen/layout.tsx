"use client"

import AuthGuard from "@/components/auth-guard"

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard page="kitchen">{children}</AuthGuard>
}
