import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/tenant", () => ({
  getTenantConfig: vi.fn(),
}))

describe("requirePremiumTier()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null for pro tier", async () => {
    const { getTenantConfig } = await import("@/lib/tenant")
    vi.mocked(getTenantConfig).mockResolvedValue({
      slug: "test", plan_type: "pro",
    } as never)
    const { requirePremiumTier } = await import("@/lib/require-premium")
    const result = await requirePremiumTier("test")
    expect(result).toBeNull()
  })

  it("returns null for elite tier", async () => {
    const { getTenantConfig } = await import("@/lib/tenant")
    vi.mocked(getTenantConfig).mockResolvedValue({
      slug: "test", plan_type: "elite",
    } as never)
    const { requirePremiumTier } = await import("@/lib/require-premium")
    const result = await requirePremiumTier("test")
    expect(result).toBeNull()
  })

  it("blocks starter tier with 403", async () => {
    const { getTenantConfig } = await import("@/lib/tenant")
    vi.mocked(getTenantConfig).mockResolvedValue({
      slug: "test", plan_type: "starter",
    } as never)
    const { requirePremiumTier } = await import("@/lib/require-premium")
    const result = await requirePremiumTier("test")
    expect(result).not.toBeNull()
    if (result) {
      expect(result.status).toBe(403)
      const body = await result.json()
      expect(body.code).toBe("FEATURE_NOT_AVAILABLE")
    }
  })

  it("blocks when config is null", async () => {
    const { getTenantConfig } = await import("@/lib/tenant")
    vi.mocked(getTenantConfig).mockResolvedValue(null)
    const { requirePremiumTier } = await import("@/lib/require-premium")
    const result = await requirePremiumTier("test")
    expect(result).not.toBeNull()
    expect(result?.status).toBe(403)
  })

  it("returns null when slug is empty", async () => {
    const { requirePremiumTier } = await import("@/lib/require-premium")
    const result = await requirePremiumTier("")
    expect(result).toBeNull()
  })
})
