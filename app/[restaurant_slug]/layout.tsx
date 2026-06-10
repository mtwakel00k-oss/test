import { getTenantConfigRSC } from "@/lib/tenant"
import { notFound } from "next/navigation"

const MASTER_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function generateMetadata({ params }: { params: Promise<{ restaurant_slug: string }> }) {
  const { restaurant_slug } = await params
  const tenant = await getTenantConfigRSC(restaurant_slug)
  if (!tenant) return { title: "Restaurant Not Found" }
  return {
    title: `${tenant.name} - Order Your Favorites`,
    description: `Order your favorite meals from ${tenant.name}`,
  }
}

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurant_slug: string }>
}) {
  const { restaurant_slug } = await params
  const tenant = await getTenantConfigRSC(restaurant_slug)
  if (!tenant) notFound()

  const isShared = tenant.supabase_url === MASTER_URL || !tenant.supabase_url

  let configStr = ""
  try {
    const config = {
      url: isShared ? MASTER_URL : tenant.supabase_url,
      key: isShared
        ? ANON_KEY
        : tenant.supabase_anon_key.startsWith("sb_secret_")
          ? ANON_KEY
          : tenant.supabase_anon_key,
      slug: restaurant_slug,
      name: tenant.name,
      logo_url: tenant.logo_url ?? null,
      plan_type: tenant.plan_type ?? "starter",
    }
    configStr = JSON.stringify(config)
  } catch {}

  return (
    <>
      {configStr && (
        <script id="tenant-config" type="application/json" dangerouslySetInnerHTML={{ __html: configStr }} />
      )}
      {children}
    </>
  )
}
