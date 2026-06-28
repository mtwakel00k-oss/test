import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/env", () => ({
  env: {
    CSRF_SECRET: "test-csrf-secret-for-testing-only!",
    NODE_ENV: "test",
  },
}))

describe("CSRF", () => {
  describe("generateCsrfToken / verifyCsrfToken", () => {
    it("generates and verifies a token", async () => {
      const { generateCsrfToken, verifyCsrfToken } = await import("@/lib/csrf")
      const token = generateCsrfToken()
      expect(typeof token).toBe("string")
      expect(token.length).toBeGreaterThan(0)
      expect(verifyCsrfToken(token)).toBe(true)
    })

    it("rejects invalid token", async () => {
      const { verifyCsrfToken } = await import("@/lib/csrf")
      expect(verifyCsrfToken("invalid-token")).toBe(false)
    })

  it("rejects tampered token", async () => {
    const { generateCsrfToken, verifyCsrfToken } = await import("@/lib/csrf")
    const token = generateCsrfToken()
    // Corrupt the middle of the token (affects auth tag)
    const mid = Math.floor(token.length / 2)
    const tampered = token.slice(0, mid) + "Z" + token.slice(mid + 1)
    expect(verifyCsrfToken(tampered)).toBe(false)
  })
  })

  describe("csrfMiddleware()", () => {
    it("skips GET requests", async () => {
      const { csrfMiddleware } = await import("@/lib/csrf")
      const req = new Request("http://localhost:3000/", { method: "GET" })
      const { NextRequest } = await import("next/server")
      const nextReq = new NextRequest(req)
      expect(csrfMiddleware(nextReq)).toBeNull()
    })

    it("skips API routes", async () => {
      const { csrfMiddleware } = await import("@/lib/csrf")
      const { NextRequest } = await import("next/server")
      const req = new NextRequest(new URL("http://localhost:3000/api/orders"), { method: "POST" })
      expect(csrfMiddleware(req)).toBeNull()
    })
  })
})
