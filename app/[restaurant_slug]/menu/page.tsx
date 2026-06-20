import { Suspense, Fragment } from "react"
import { supabaseForSlugRSC, getTenantConfigRSC } from "@/lib/tenant"
import type { MenuProduct } from "@/lib/types"
import { FoodDeliveryApp } from "@/components/food-delivery-app"
import { MenuSkeleton } from "@/components/menu-skeleton"
import { restaurantJsonLd, menuJsonLd, jsonLdScript } from "@/lib/json-ld"

async function MenuContent({ slug }: { slug: string }) {
  let initialProducts: MenuProduct[] = []
  let restaurantName = ""

  try {
    const [sb, tenant] = await Promise.all([
      supabaseForSlugRSC(slug),
      getTenantConfigRSC(slug),
    ])
    restaurantName = tenant?.name || ""

    const [productsResult, availResult] = await Promise.all([
      (sb.from("v_products_flat")).select("*").order("category").order("id"),
      (async () => { try { return await sb.from("produits").select("id, is_available") } catch { return { data: null } } })(),
    ])

    const data = productsResult.data
    if (data) {
      const availability: Record<number, boolean> = {}
      const avail = availResult?.data
      if (avail) {
        for (const row of avail) {
          availability[row.id] = row.is_available !== false
        }
      }

      initialProducts = (data as MenuProduct[]).map(item => ({
        ...item,
        is_available: item.id in availability ? availability[item.id] : true,
      }))
    }
  } catch {
    // Fall back to client-side fetch
  }

  const ld = restaurantName ? [
    restaurantJsonLd(restaurantName, slug, `Order your favorite meals from ${restaurantName}`),
    menuJsonLd(initialProducts),
  ] : []

  return (
    <Fragment>
      {ld.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(ld.length === 1 ? ld[0] : { "@context": "https://schema.org", "@graph": ld }),
          }}
        />
      )}
      <FoodDeliveryApp initialProducts={initialProducts} slug={slug} />
    </Fragment>
  )
}

export default async function MenuPage({ params }: { params: Promise<{ restaurant_slug: string }> }) {
  const { restaurant_slug } = await params

  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent slug={restaurant_slug} />
    </Suspense>
  )
}
