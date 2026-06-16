import { describe, it, expect } from "vitest"
import { getPrice, getAvailableSizes } from "@/lib/types"
import type { MenuProduct } from "@/lib/types"

const baseProduct: MenuProduct = {
  id: 1,
  name: "Test",
  description: "",
  category: "Pizza",
  est_speciale: false,
  has_white_sauce: false,
  prices: {
    M: { sauce_tomate: 500, creme_fraiche: 600, standard: 450 },
    L: { sauce_tomate: 700, creme_fraiche: 800, standard: 650 },
  },
}

describe("getPrice()", () => {
  it("returns standard price when no sauce", () => {
    expect(getPrice(baseProduct, "M", null)).toBe(450)
    expect(getPrice(baseProduct, "L", null)).toBe(650)
  })

  it("returns sauce_tomate price for sauceId=1", () => {
    expect(getPrice(baseProduct, "M", 1)).toBe(500)
    expect(getPrice(baseProduct, "L", 1)).toBe(700)
  })

  it("returns creme_fraiche price for sauceId=2", () => {
    expect(getPrice(baseProduct, "M", 2)).toBe(600)
    expect(getPrice(baseProduct, "L", 2)).toBe(800)
  })

  it("falls back to standard when sauce price is null", () => {
    const p: MenuProduct = {
      ...baseProduct,
      prices: { M: { sauce_tomate: null, creme_fraiche: null, standard: 450 } },
    }
    expect(getPrice(p, "M", 1)).toBe(450)
    expect(getPrice(p, "M", 2)).toBe(450)
  })

  it("returns sauce_tomate if sauceId=1 and standard is null", () => {
    const p: MenuProduct = {
      ...baseProduct,
      prices: { M: { sauce_tomate: 500, creme_fraiche: null, standard: null } },
    }
    expect(getPrice(p, "M", 1)).toBe(500)
  })

  it("returns 0 for missing size", () => {
    expect(getPrice(baseProduct, "XL", null)).toBe(0)
  })

  it("returns 0 for missing prices object", () => {
    const p = { ...baseProduct, prices: {} }
    expect(getPrice(p, "M", null)).toBe(0)
  })

  it("falls back to any available price when size exists but all are null", () => {
    const p = {
      ...baseProduct,
      prices: { M: { sauce_tomate: null, creme_fraiche: null, standard: null } } as const,
    }
    expect(getPrice(p as MenuProduct, "M", null)).toBe(0)
  })
})

describe("getAvailableSizes()", () => {
  it("returns sizes with at least one non-null price", () => {
    expect(getAvailableSizes(baseProduct)).toEqual(["M", "L"])
  })

  it("filters out sizes where all prices are null", () => {
    const p: MenuProduct = {
      ...baseProduct,
      prices: {
        S: { sauce_tomate: null, creme_fraiche: null, standard: null },
        M: { sauce_tomate: 500, creme_fraiche: null, standard: null },
      },
    }
    expect(getAvailableSizes(p)).toEqual(["M"])
  })

  it("returns empty array for empty prices", () => {
    const p = { ...baseProduct, prices: {} }
    expect(getAvailableSizes(p)).toEqual([])
  })
})
