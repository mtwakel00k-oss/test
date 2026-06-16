"use client"

import AuthGuard from "@/components/auth-guard"

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard page="pos">{children}</AuthGuard>
}
