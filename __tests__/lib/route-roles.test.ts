import { describe, it, expect } from "vitest"
import { getAllowedRolesForRoute, extractSlug, ROUTE_ROLES } from "@/lib/route-roles"

describe("route-roles", () => {
  describe("ROUTE_ROLES", () => {
    it("cashier has access to pos", () => {
      expect(ROUTE_ROLES.pos).toContain("cashier")
    })
    it("admin has access to all", () => {
      expect(ROUTE_ROLES.pos).toContain("admin")
      expect(ROUTE_ROLES.kitchen).toContain("admin")
      expect(ROUTE_ROLES.admin).toContain("admin")
    })
    it("owner has access to all", () => {
      expect(ROUTE_ROLES.pos).toContain("owner")
      expect(ROUTE_ROLES.kitchen).toContain("owner")
      expect(ROUTE_ROLES.admin).toContain("owner")
    })
  })

  describe("getAllowedRolesForRoute()", () => {
    it("returns roles for /pos", () => {
      const roles = getAllowedRolesForRoute("/pos")
      expect(roles).toContain("cashier")
    })
    it("returns roles for /burger-house/admin", () => {
      const roles = getAllowedRolesForRoute("/burger-house/admin")
      expect(roles).toContain("admin")
    })
    it("returns null for unknown route", () => {
      expect(getAllowedRolesForRoute("/unknown")).toBeNull()
    })
    it("returns null for root", () => {
      expect(getAllowedRolesForRoute("/")).toBeNull()
    })
  })

  describe("extractSlug()", () => {
    it("extracts slug from /burger-house/admin", () => {
      expect(extractSlug("/burger-house/admin")).toBe("burger-house")
    })
    it("returns null for /admin (no slug)", () => {
      expect(extractSlug("/admin")).toBeNull()
    })
    it("returns null for /pos", () => {
      expect(extractSlug("/pos")).toBeNull()
    })
  })
})
