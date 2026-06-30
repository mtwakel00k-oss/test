import { describe, it, expect } from "vitest"
import { restaurantJsonLd, menuJsonLd, jsonLdScript, safeJsonForScript } from "@/lib/json-ld"
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
      const products: MenuProduct[] = [{
        id: 1, name: "Pizza", description: "Yummy", category: "Pizzas",
        est_speciale: false, has_white_sauce: false, image_url: null,
        prices: { L: { standard: 500, sauce_tomate: null, creme_fraiche: null } },
      }]
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
    const products: MenuProduct[] = [{
      id: 2, name: "Empty", description: "", category: "Other",
      est_speciale: false, has_white_sauce: false, image_url: null,
      prices: {},
    }]
    const result = menuJsonLd(products)
    const items = result.hasMenuItem as Array<{ name: string }>
    expect(items).toHaveLength(1)
  })
  })

  describe("jsonLdScript()", () => {
    it("serializes to JSON string", () => {
      const result = jsonLdScript({ "@type": "Test" })
      expect(result).toBe('{"@type":"Test"}')
    })
  })

  describe("safeJsonForScript()", () => {
    it("escapes < to prevent </script> breakout", () => {
      const malicious = { name: 'Foo</script><script>alert("xss")</script>' }
      const result = safeJsonForScript(malicious)
      expect(result).toContain("\\u003c/script>")
      expect(result).not.toContain("</script>")
      expect(result).not.toContain("<")
    })

    it("passes through safe strings unchanged (except no <)", () => {
      const data = { name: "Burger House", price: 500 }
      const result = safeJsonForScript(data)
      expect(result).toContain("Burger House")
      expect(result).toContain("500")
    })
  })
})
