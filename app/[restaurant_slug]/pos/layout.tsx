"use client"

import AuthGuard from "@/components/auth-guard"
import { StaffProvider } from "@/context/StaffContext"

export default function SlugPOSLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard page="pos">
      <StaffProvider>{children}</StaffProvider>
    </AuthGuard>
  )
}
