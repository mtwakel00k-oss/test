import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/tenant", () => ({
  getTenantConfig: vi.fn(() => Promise.resolve({
    id: "1", slug: "burger-house", name: "Burger House",
    supabase_url: "", supabase_anon_key: "", is_active: true, is_open: true,
    created_at: "", logo_url: null, plan_type: "pro",
  })),
  getTenantConfigRSC: vi.fn(() => Promise.resolve({
    id: "1", slug: "burger-house", name: "Burger House",
    supabase_url: "", supabase_anon_key: "", is_active: true, is_open: true,
    created_at: "", logo_url: null, plan_type: "pro",
  })),
}))

vi.mock("@/lib/supabase-server", () => ({
  supabaseForSlugRSC: vi.fn(() => Promise.resolve({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  })),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "key",
  },
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  })),
}))

describe("SEO", () => {
  it("restaurantJsonLd includes required fields", async () => {
    const { restaurantJsonLd } = await import("@/lib/json-ld")
    const data = restaurantJsonLd("Test", "test", "Desc")
    expect(data["@context"]).toBe("https://schema.org")
    expect(data["@type"]).toBe("Restaurant")
    expect(data.name).toBe("Test")
    expect(data.url).toContain("/test/menu")
  })

  it("menuJsonLd includes menu items", async () => {
    const { menuJsonLd } = await import("@/lib/json-ld")
    const products = [{
      id: 1, name: "Burger", description: "Tasty", category: "Burgers",
      est_speciale: false, has_white_sauce: false, image_url: null,
      prices: { L: { standard: 800, sauce_tomate: null, creme_fraiche: null } },
    }]
    const data = menuJsonLd(products)
    expect(data["@type"]).toBe("Menu")
    const items = data.hasMenuItem as Array<{ name: string }>
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe("Burger")
  })
})
