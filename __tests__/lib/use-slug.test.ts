import { describe, it, expect, beforeEach, afterEach } from "vitest"

const mockConfig = { url: "", key: "", slug: "burger-house", name: "", logo_url: null }

function setConfig(config: typeof mockConfig | null) {
  const existing = document.getElementById("tenant-config")
  if (existing) existing.remove()
  if (config) {
    const el = document.createElement("script")
    el.id = "tenant-config"
    el.type = "application/json"
    el.textContent = JSON.stringify(config)
    document.body.appendChild(el)
  }
}

async function importModule() {
  return await import("@/lib/use-slug")
}

describe("useSlug()", () => {
  beforeEach(() => {
    setConfig(mockConfig)
  })

  afterEach(() => {
    document.getElementById("tenant-config")?.remove()
  })

  it("returns path unchanged when no config", async () => {
    setConfig(null)
    const { slugPath } = await importModule()
    expect(slugPath("/admin")).toBe("/admin")
    expect(slugPath("login")).toBe("login")
  })

  it("reads slug from tenant-config script tag", async () => {
    setConfig({ ...mockConfig, slug: "my-restaurant" })
    const { slugPath } = await importModule()
    expect(slugPath("/pos")).toBe("/my-restaurant/pos")
  })

  it("slugPath handles leading slash", async () => {
    const { slugPath } = await importModule()
    expect(slugPath("pos")).toBe("/burger-house/pos")
    expect(slugPath("/kitchen")).toBe("/burger-house/kitchen")
  })
})
