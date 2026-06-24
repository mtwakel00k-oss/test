"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useSlug } from "@/lib/use-slug"
import { ROUTE_ROLES, type AppPage } from "@/lib/route-roles"
import { UnauthorizedAccess } from "@/components/admin/unauthorized-access"

export default function AuthGuard({ children, page }: { children: ReactNode; page: AppPage }) {
  const [status, setStatus] = useState<"loading" | "ok" | "denied" | "forbidden">("loading")
  const [sessionRole, setSessionRole] = useState<string | null>(null)
  const router = useRouter()
  const slug = useSlug()
  const redirectedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/login")
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          const sessionSlug = data.slug as string | undefined
          const role = data.role as string

          if (slug && sessionSlug && slug !== sessionSlug) {
            setStatus("denied")
            return
          }

          const allowed = ROUTE_ROLES[page] as readonly string[]
          if (allowed.includes(role)) {
            setSessionRole(role)
            setStatus("ok")
          } else {
            setSessionRole(role)
            setStatus("forbidden")
          }
          return
        }
        setStatus("denied")
      } catch {
        if (!cancelled) setStatus("denied")
      }
    })()
    return () => { cancelled = true }
  }, [page, slug])

  useEffect(() => {
    if (status === "forbidden" && !redirectedRef.current) {
      redirectedRef.current = true
      if (sessionRole === "cashier" && slug) {
        router.push(`/${slug}/pos`)
      } else if (sessionRole === "chef" && slug) {
        router.push(`/${slug}/kitchen`)
      } else {
        const loginPath = slug && slug !== "root" ? `/${slug}/login` : "/login"
        router.push(loginPath)
      }
    }
  }, [status, sessionRole, slug, router])

  if (status === "loading") return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  if (status === "denied") {
    const loginPath = slug && slug !== "root" ? `/${slug}/login` : "/login"
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">انتهت صلاحية الجلسة</p>
          <button onClick={() => router.push(loginPath)}
            className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90">
            تسجيل الدخول
          </button>
        </div>
      </div>
    )
  }

  if (status === "forbidden") {
    return <UnauthorizedAccess />
  }

  return <>{children}</>
}
