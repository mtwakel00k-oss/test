import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockSessions: Record<string, { role: string; slug?: string }> = {
  "admin@test.com:adminpass": { role: "admin", slug: "burger-house" },
  "cashier@test.com:cashierpass": { role: "cashier", slug: "burger-house" },
  "root@root.app:ownerpass": { role: "owner", slug: "" },
  "chef@test.com:chefpass": { role: "chef", slug: "burger-house" },
}

vi.mock("@/lib/tenant", () => ({
  parseSession: vi.fn((cookieHeader: string) => {
    const match = cookieHeader.match(/session=([^;]*)/)
    if (!match) return {}
    try {
      const raw = JSON.parse(Buffer.from(decodeURIComponent(match[1]), "base64").toString())
      return mockSessions[raw.key] || {}
    } catch { return {} }
  }),
}))

function makeReq(sessionKey: string, slug?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/test")
  if (slug) url.searchParams.set("slug", slug)
  const cookieVal = Buffer.from(JSON.stringify({ key: sessionKey })).toString("base64")
  return new NextRequest(url, {
    headers: {
      cookie: `session=${cookieVal}`,
      ...(slug ? { "x-tenant-slug": slug } : {}),
    },
  })
}

describe("api-auth", () => {
  describe("requireStaff()", () => {
    it("allows admin", async () => {
      const { requireStaff } = await import("@/lib/api-auth")
      const result = requireStaff(makeReq("admin@test.com:adminpass"))
      expect("role" in result).toBe(true)
      if ("role" in result) expect(result.role).toBe("admin")
    })

    it("allows cashier", async () => {
      const { requireStaff } = await import("@/lib/api-auth")
      const result = requireStaff(makeReq("cashier@test.com:cashierpass"))
      expect("role" in result).toBe(true)
      if ("role" in result) expect(result.role).toBe("cashier")
    })

    it("allows chef", async () => {
      const { requireStaff } = await import("@/lib/api-auth")
      const result = requireStaff(makeReq("chef@test.com:chefpass"))
      expect("role" in result).toBe(true)
      if ("role" in result) expect(result.role).toBe("chef")
    })

    it("rejects unauthenticated", async () => {
      const { requireStaff } = await import("@/lib/api-auth")
      const result = requireStaff(makeReq("unknown:invalid"))
      expect("json" in result).toBe(true)
      if ("json" in result) {
        const body = await result.json()
        expect(body.error).toBe("Unauthorized")
      }
    })

    it("returns 401 for missing cookie", async () => {
      const { requireStaff } = await import("@/lib/api-auth")
      const req = new NextRequest(new URL("http://localhost:3000/api/test"))
      const result = requireStaff(req)
      expect("json" in result).toBe(true)
      if ("json" in result) expect(result.status).toBe(401)
    })
  })

  describe("requireAdmin()", () => {
    it("allows admin", async () => {
      const { requireAdmin } = await import("@/lib/api-auth")
      const result = requireAdmin(makeReq("admin@test.com:adminpass"))
      expect("role" in result).toBe(true)
      if ("role" in result) expect(result.role).toBe("admin")
    })

    it("rejects cashier with 401", async () => {
      const { requireAdmin } = await import("@/lib/api-auth")
      const result = requireAdmin(makeReq("cashier@test.com:cashierpass"))
      expect("json" in result).toBe(true)
      if ("json" in result) {
        expect(result.status).toBe(401)
        const body = await result.json()
        expect(body.error).toBe("Unauthorized")
      }
    })

    it("rejects chef with 401", async () => {
      const { requireAdmin } = await import("@/lib/api-auth")
      const result = requireAdmin(makeReq("chef@test.com:chefpass"))
      expect("json" in result).toBe(true)
      if ("json" in result) expect(result.status).toBe(401)
    })

    it("allows owner (ADMIN_ROLES includes owner)", async () => {
      const { requireAdmin } = await import("@/lib/api-auth")
      const result = requireAdmin(makeReq("root@root.app:ownerpass"))
      expect("role" in result).toBe(true)
      if ("role" in result) expect(result.role).toBe("owner")
    })
  })

  describe("requireRootOwner()", () => {
    it("allows owner without slug", async () => {
      const { requireRootOwner } = await import("@/lib/api-auth")
      const result = requireRootOwner(makeReq("root@root.app:ownerpass"))
      expect("role" in result).toBe(true)
      if ("role" in result) expect(result.role).toBe("owner")
    })

    it("rejects admin with 403", async () => {
      const { requireRootOwner } = await import("@/lib/api-auth")
      const result = requireRootOwner(makeReq("admin@test.com:adminpass"))
      expect("json" in result).toBe(true)
      if ("json" in result) {
        expect(result.status).toBe(403)
        const body = await result.json()
        expect(body.error).toBe("Forbidden")
      }
    })
  })

  describe("resolveTenantSlug()", () => {
    it("resolves from session slug", async () => {
      const { resolveTenantSlug } = await import("@/lib/api-auth")
      const req = makeReq("admin@test.com:adminpass")
      const session = { email: "admin@test.com", role: "admin", slug: "burger-house" }
      expect(resolveTenantSlug(req, session)).toBe("burger-house")
    })

    it("resolves from body slug when no session slug", async () => {
      const { resolveTenantSlug } = await import("@/lib/api-auth")
      const req = makeReq("unknown:invalid")
      expect(resolveTenantSlug(req, {}, "tenant-slug")).toBe("tenant-slug")
    })

    it("resolves from header when no session slug", async () => {
      const { resolveTenantSlug } = await import("@/lib/api-auth")
      const req = makeReq("unknown:invalid", "header-slug")
      expect(resolveTenantSlug(req, {})).toBe("header-slug")
    })

    it("rejects header mismatch with session slug", async () => {
      const { resolveTenantSlug } = await import("@/lib/api-auth")
      const req = makeReq("admin@test.com:adminpass", "different-slug")
      const session = { email: "admin@test.com", role: "admin", slug: "burger-house" }
      expect(resolveTenantSlug(req, session)).toBeNull()
    })

    it("returns null when session slug and body slug differ", async () => {
      const { resolveTenantSlug } = await import("@/lib/api-auth")
      const req = makeReq("admin@test.com:adminpass")
      const session = { email: "admin@test.com", role: "admin", slug: "burger-house" }
      expect(resolveTenantSlug(req, session, "other-slug")).toBeNull()
    })

    it("returns null when no session, no body, no header slug", async () => {
      const { resolveTenantSlug } = await import("@/lib/api-auth")
      const req = makeReq("unknown:invalid")
      expect(resolveTenantSlug(req, {})).toBeNull()
    })
  })
})
