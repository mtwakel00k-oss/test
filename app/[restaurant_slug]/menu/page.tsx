import { supabaseForSlugRSC } from "@/lib/tenant"
import type { MenuProduct } from "@/lib/types"
import { FoodDeliveryApp } from "@/components/food-delivery-app"

export default async function MenuPage({ params }: { params: Promise<{ restaurant_slug: string }> }) {
  const { restaurant_slug } = await params
  let initialProducts: MenuProduct[] = []

  try {
    const sb = await supabaseForSlugRSC(restaurant_slug)
    const { data } = await (sb.from("v_products_flat"))
      .select("*")
      .order("category")
      .order("id")

    if (data) {
      const availability: Record<number, boolean> = {}
      try {
        const { data: avail } = await (sb.from("produits")).select("id, is_available")
        if (avail) {
          for (const row of avail) {
            availability[row.id] = row.is_available !== false
          }
        }
      } catch {}

      initialProducts = (data as MenuProduct[]).map(item => ({
        ...item,
        is_available: item.id in availability ? availability[item.id] : true,
      }))
    }
  } catch {
    // Fall back to client-side fetch
  }

  return <FoodDeliveryApp initialProducts={initialProducts} slug={restaurant_slug} />
}
