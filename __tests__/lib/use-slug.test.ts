import { beforeEach, afterEach, describe, it, expect } from "vitest"

const mockConfig = { url: "", key: "", slug: "burger-house", name: "", logo_url: null }

function injectConfig(config: typeof mockConfig | null) {
  document.getElementById("tenant-config")?.remove()
  if (!config) return
  const el = document.createElement("script")
  el.id = "tenant-config"
  el.type = "application/json"
  el.textContent = JSON.stringify(config)
  document.body.appendChild(el)
}

beforeEach(() => injectConfig(mockConfig))
afterEach(() => injectConfig(null))

describe("slugPath()", () => {
  it("returns path unchanged when no config", async () => {
    injectConfig(null)
    const { slugPath } = await import("@/lib/use-slug")
    expect(slugPath("/admin")).toBe("/admin")
  })
  it("prepends slug to path", async () => {
    const { slugPath } = await import("@/lib/use-slug")
    expect(slugPath("/pos")).toBe("/burger-house/pos")
  })
  it("handles missing leading slash", async () => {
    const { slugPath } = await import("@/lib/use-slug")
    expect(slugPath("kitchen")).toBe("/burger-house/kitchen")
  })
})
