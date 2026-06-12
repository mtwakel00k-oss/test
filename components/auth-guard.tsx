"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useSlug } from "@/lib/use-slug"

const pageRoleMap: Record<string, string[]> = {
  pos: ["cashier", "admin", "owner"],
  admin: ["admin", "owner"],
  kitchen: ["chef", "admin", "owner"],
}

export default function AuthGuard({ children, page }: { children: ReactNode; page: "pos" | "admin" | "kitchen" }) {
  const [status, setStatus] = useState<"loading" | "ok" | "denied" | "forbidden">("loading")
  const router = useRouter()
  const slug = useSlug()

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/auth/login")
        if (res.ok) {
          const data = await res.json()
          const sessionSlug = data.slug as string | undefined
          const role = data.role as string

          if (slug && sessionSlug && slug !== sessionSlug) {
            setStatus("denied")
            return
          }

          const allowed = pageRoleMap[page] || []
          setStatus(allowed.includes(role) ? "ok" : "forbidden")
          return
        }
        setStatus("denied")
      } catch {
        setStatus("denied")
      }
    })()
  }, [page, slug])

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
