import { getTenantConfigRSC } from "@/lib/tenant"
import { ServiceWorkerRegister } from "@/components/service-worker-register"
import { notFound } from "next/navigation"
import { env } from "@/lib/env"
import { safeJsonForScript } from "@/lib/json-ld"

const MASTER_URL = env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function generateMetadata({ params }: { params: Promise<{ restaurant_slug: string }> }) {
  const { restaurant_slug } = await params
  const tenant = await getTenantConfigRSC(restaurant_slug)
  if (!tenant) return { title: "Restaurant Not Found" }
  return {
    title: `${tenant.name} - Order Your Favorites`,
    description: `Order your favorite meals from ${tenant.name}`,
    alternates: {
      canonical: `https://simploo.vercel.app/${restaurant_slug}/menu`,
    },
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
    is_open: tenant.is_open ?? true,
    brand_color: tenant.brand_color ?? null,
    brand_text_color: tenant.brand_text_color ?? null,
  }

  const tenantUrl = isShared ? MASTER_URL : tenant.supabase_url

  return (
    <>
      <link rel="preconnect" href={tenantUrl} crossOrigin="anonymous" />
      {config && (
        <script id="tenant-config" type="application/json" dangerouslySetInnerHTML={{ __html: safeJsonForScript(config) }} />
      )}
      {tenant.brand_color && /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|[a-zA-Z]+\([^)]*\))$/.test(tenant.brand_color) && (
        <style>{`
          :root {
            --brand: ${tenant.brand_color};
            --brand-text: ${typeof tenant.brand_text_color === "string" && /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|[a-zA-Z]+\([^)]*\))$/.test(tenant.brand_text_color) ? tenant.brand_text_color : '#ffffff'};
          }
        `}</style>
      )}
      <ServiceWorkerRegister />
      {children}
    </>
  )
}
