import { Suspense } from "react"
import LoginForm from "@/app/login/login-form"

export default async function SlugLoginPage(props: {
  params: Promise<{ restaurant_slug: string }>
  searchParams: Promise<{ redirect?: string }>
}) {
  const { restaurant_slug } = await props.params
  const { redirect } = await props.searchParams
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <LoginForm redirect={redirect} slug={restaurant_slug} />
    </Suspense>
  )
}
