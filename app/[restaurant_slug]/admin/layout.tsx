"use client"

import AuthGuard from "@/components/auth-guard"

export default function SlugAdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard page="admin">{children}</AuthGuard>
}
