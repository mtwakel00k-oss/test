import { describe, it, expect } from "vitest"
import { restaurantJsonLd, menuJsonLd, jsonLdScript } from "@/lib/json-ld"
import type { MenuProduct } from "@/lib/types"

describe("json-ld", () => {
  describe("restaurantJsonLd()", () => {
    it("returns structured data for a restaurant", () => {
      const result = restaurantJsonLd("Burger House", "burger-house", "Best burgers")
      expect(result["@context"]).toBe("https://schema.org")
      expect(result["@type"]).toBe("Restaurant")
      expect(result.name).toBe("Burger House")
      expect(result.description).toBe("Best burgers")
    })
  })

  describe("menuJsonLd()", () => {
    it("returns structured data for menu items", () => {
      const products: MenuProduct[] = [
        { id: 1, name: "Pizza", category: "Pizzas", prices: { L: { standard: 500 } }, image_url: null },
      ]
      const result = menuJsonLd(products)
      expect(result["@type"]).toBe("Menu")
      expect(Array.isArray(result.hasMenuItem)).toBe(true)
      expect(result.hasMenuItem).toHaveLength(1)
    })

    it("handles empty product list", () => {
      const result = menuJsonLd([])
      expect(result.hasMenuItem).toEqual([])
    })

    it("handles products without prices", () => {
      const products: MenuProduct[] = [
        { id: 2, name: "Empty", category: "Other" } as MenuProduct,
      ]
      const result = menuJsonLd(products)
      expect(result.hasMenuItem).toHaveLength(1)
    })
  })

  describe("jsonLdScript()", () => {
    it("serializes to JSON string", () => {
      const result = jsonLdScript({ "@type": "Test" })
      expect(result).toBe('{"@type":"Test"}')
    })
  })
})
