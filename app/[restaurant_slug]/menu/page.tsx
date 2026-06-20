import { Suspense } from "react"
import { supabaseForSlugRSC } from "@/lib/tenant"
import type { MenuProduct } from "@/lib/types"
import { FoodDeliveryApp } from "@/components/food-delivery-app"
import { MenuSkeleton } from "@/components/menu-skeleton"

async function MenuContent({ slug }: { slug: string }) {
  let initialProducts: MenuProduct[] = []

  try {
    const sb = await supabaseForSlugRSC(slug)
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

  return <FoodDeliveryApp initialProducts={initialProducts} slug={slug} />
}

export default async function MenuPage({ params }: { params: Promise<{ restaurant_slug: string }> }) {
  const { restaurant_slug } = await params

  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent slug={restaurant_slug} />
    </Suspense>
  )
}
