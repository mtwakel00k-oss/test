import { Suspense } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { parseSession } from "@/lib/tenant"
import { env } from "@/lib/env"
import LoginForm from "./login-form"

const VALID_ROLES = ["cashier", "chef", "admin", "owner"]

async function getTenants() {
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await supabase.from("tenants").select("*").eq("is_active", true).order("name")
  return data || []
}

export default async function LoginPage(props: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: redirectParam } = await props.searchParams

  // Already authenticated? Redirect immediately (prevents flash)
  try {
    const c = await cookies()
    const sessionCookie = c.get("session")?.value
    if (sessionCookie) {
      const session = parseSession(`session=${sessionCookie}`)
      if (session.role && VALID_ROLES.includes(session.role)) {
        const dest = redirectParam && !redirectParam.startsWith("/login") ? redirectParam : session.slug ? `/${session.slug}/admin` : "/admin"
        redirect(dest)
      }
    }
  } catch (e) { console.warn("Login redirect check failed", e) }

  const tenants = await getTenants()
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <LoginForm redirect={redirectParam} tenants={tenants} />
    </Suspense>
  )
}
