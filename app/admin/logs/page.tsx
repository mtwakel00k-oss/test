"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuditLog } from "@/components/admin/audit-log"

export default function LogsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(data => {
      if (!data || data.role !== "owner") router.push("/login")
      else setReady(true)
    }).catch(() => router.push("/login"))
  }, [router])

  if (!ready) return null

  return <AuditLog />
}
