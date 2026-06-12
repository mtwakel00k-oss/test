"use client"

import AuthGuard from "@/components/auth-guard"
import { SessionExpiryModal } from "@/components/session-expiry-modal"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard page="admin">
      {children}
      <SessionExpiryModal />
    </AuthGuard>
  )
}
