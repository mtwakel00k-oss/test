"use client"

import AuthGuard from "@/components/auth-guard"

export default function SlugKitchenLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard page="chef">{children}</AuthGuard>
}
