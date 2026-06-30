import type { MenuProduct } from "@/lib/types"

function bestPrice(p: MenuProduct): number {
  const size = "L"
  const prices = p.prices?.[size]
  if (!prices) return 0
  return prices.standard || prices.sauce_tomate || prices.creme_fraiche || 0
}

export function restaurantJsonLd(
  name: string,
  slug: string,
  description: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name,
    description,
    url: `https://simploo.vercel.app/${slug}/menu`,
    servesCuisine: "Local",
    acceptsReservations: "No",
    "@id": `https://simploo.vercel.app/${slug}/menu#restaurant`,
    image: `https://simploo.vercel.app/${slug}/menu`,
  }
}

export function menuJsonLd(products: MenuProduct[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": "#menu",
    name: "Menu",
    hasMenuItem: products.map((p, i) => ({
      "@type": "MenuItem",
      name: p.name,
      description: p.description || undefined,
      offers: {
        "@type": "Offer",
        price: bestPrice(p),
        priceCurrency: "DZD",
      },
      image: p.image_url || undefined,
      position: i + 1,
    })),
  }
}

export function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

export function jsonLdScript(data: Record<string, unknown>): string {
  return safeJsonForScript(data)
}
