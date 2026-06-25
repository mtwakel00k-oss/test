"use client"

import dynamic from "next/dynamic"
import AuthGuard from "@/components/auth-guard"
import { PageTransition } from "@/components/page-transition"

const OperationsManager = dynamic(
  () => import("@/components/admin/operations-manager").then(m => ({ default: m.OperationsManager })),
  { ssr: false },
)

export default function OperationsPage() {
  return (
    <AuthGuard page="admin">
      <PageTransition>
        <OperationsManager />
      </PageTransition>
    </AuthGuard>
  )
}
