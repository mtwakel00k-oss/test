import { describe, it, expect, beforeEach } from "vitest"

// Mock window.__TENANT_CONFIG__
const mockConfig = { url: "", key: "", slug: "burger-house", name: "", logo_url: null }

Object.defineProperty(globalThis, "window", {
  value: {
    __TENANT_CONFIG__: mockConfig,
  },
  writable: true,
})

async function importModule() {
  return await import("@/lib/use-slug")
}

describe("useSlug()", () => {
  beforeEach(() => {
    window.__TENANT_CONFIG__ = { ...mockConfig }
  })

  it("returns path unchanged when no config", async () => {
    window.__TENANT_CONFIG__ = undefined as unknown as typeof mockConfig
    const { slugPath } = await importModule()
    expect(slugPath("/admin")).toBe("/admin")
    expect(slugPath("login")).toBe("login")
  })

  it("reads slug from __TENANT_CONFIG__", async () => {
    window.__TENANT_CONFIG__ = { ...mockConfig, slug: "my-restaurant" }
    const { slugPath } = await importModule()
    expect(slugPath("/pos")).toBe("/my-restaurant/pos")
  })

  it("slugPath handles leading slash", async () => {
    const { slugPath } = await importModule()
    expect(slugPath("pos")).toBe("/burger-house/pos")
    expect(slugPath("/kitchen")).toBe("/burger-house/kitchen")
  })
})
