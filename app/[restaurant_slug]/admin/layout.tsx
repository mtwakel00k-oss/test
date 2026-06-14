"use client"

import dynamic from "next/dynamic"
import AuthGuard from "@/components/auth-guard"
import { PageTransition } from "@/components/page-transition"

const SessionExpiryModal = dynamic(
  () => import("@/components/session-expiry-modal").then(m => ({ default: m.SessionExpiryModal })),
  { ssr: false },
)

export default function SlugAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard page="admin">
      <PageTransition>{children}</PageTransition>
      <SessionExpiryModal />
    </AuthGuard>
  )
}
