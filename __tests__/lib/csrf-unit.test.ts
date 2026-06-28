import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/env", () => ({
  env: {
    CSRF_SECRET: "fixed-32byte-secret-for-testing!!",
    NODE_ENV: "test",
  },
}))

// We need to explicitly test the module in isolation
describe("CSRF token crypto (unit)", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("generateCsrfToken creates a base64url string", async () => {
    const { generateCsrfToken } = await import("@/lib/csrf")
    const token = generateCsrfToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("verifyCsrfToken returns true for self-generated token", async () => {
    const csrf = await import("@/lib/csrf")
    const token = csrf.generateCsrfToken()
    expect(csrf.verifyCsrfToken(token)).toBe(true)
  })

  it("verifyCsrfToken returns false for garbage", async () => {
    const { verifyCsrfToken } = await import("@/lib/csrf")
    expect(verifyCsrfToken("AAAA")).toBe(false)
  })
})
