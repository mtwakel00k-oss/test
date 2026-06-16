import { getTenantConfigRSC } from "@/lib/tenant"
import Script from "next/script"
import { notFound } from "next/navigation"

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

  let bootstrapScript = ""
  try {
    const config = {
      url: tenant.supabase_url,
      key: tenant.supabase_anon_key.startsWith("sb_secret_")
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        : tenant.supabase_anon_key,
      slug: restaurant_slug,
      name: tenant.name,
      logo_url: tenant.logo_url ?? null,
      plan_type: tenant.plan_type ?? "starter",
    }
    bootstrapScript = `window.__TENANT_CONFIG__=${JSON.stringify(config)}`
  } catch {}

  return (
    <>
      {bootstrapScript && (
        <Script id="tenant-config" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: bootstrapScript }} />
      )}
      {children}
    </>
  )
}
