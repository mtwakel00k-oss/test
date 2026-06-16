import { Suspense } from "react"
import { createClient } from "@supabase/supabase-js"
import LoginForm from "./login-form"

async function getTenants() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await supabase.from("tenants").select("*").eq("is_active", true).order("name")
  return data || []
}

export default async function LoginPage(props: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect } = await props.searchParams
  const tenants = await getTenants()
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <LoginForm redirect={redirect} tenants={tenants} />
    </Suspense>
  )
}
