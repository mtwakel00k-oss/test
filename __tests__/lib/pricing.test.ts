import { describe, it, expect } from "vitest"
import { getPlanPrice, computeSubscriptionRevenue, PLAN_PRICES, COMMISSION_RATE } from "@/lib/pricing"

describe("pricing", () => {
  it("PLAN_PRICES has correct values", () => {
    expect(PLAN_PRICES.starter).toBe(5000)
    expect(PLAN_PRICES.pro).toBe(10000)
    expect(PLAN_PRICES.elite).toBe(20000)
  })

  it("COMMISSION_RATE is 0", () => {
    expect(COMMISSION_RATE).toBe(0)
  })

  describe("getPlanPrice()", () => {
    it("returns price for starter", () => {
      expect(getPlanPrice("starter")).toBe(5000)
    })

    it("returns price for pro", () => {
      expect(getPlanPrice("pro")).toBe(10000)
    })

    it("returns price for elite", () => {
      expect(getPlanPrice("elite")).toBe(20000)
    })

    it("returns 0 for unknown plan", () => {
      expect(getPlanPrice("enterprise")).toBe(0)
    })

    it("returns 0 for null", () => {
      expect(getPlanPrice(null)).toBe(0)
    })
  })

  describe("computeSubscriptionRevenue()", () => {
    it("sums active tenants' plan prices", () => {
      const tenants = [
        { plan_type: "starter", is_active: true },
        { plan_type: "pro", is_active: true },
        { plan_type: "elite", is_active: true },
      ]
      expect(computeSubscriptionRevenue(tenants)).toBe(5000 + 10000 + 20000)
    })

    it("excludes inactive tenants", () => {
      const tenants = [
        { plan_type: "pro", is_active: true },
        { plan_type: "elite", is_active: false },
      ]
      expect(computeSubscriptionRevenue(tenants)).toBe(10000)
    })

    it("returns 0 for no tenants", () => {
      expect(computeSubscriptionRevenue([])).toBe(0)
    })

    it("handles tenants with null plan_type", () => {
      const tenants = [
        { plan_type: null, is_active: true },
        { plan_type: "pro", is_active: true },
      ]
      expect(computeSubscriptionRevenue(tenants)).toBe(10000)
    })
  })
})
