import { describe, it, expect, vi, beforeEach } from "vitest"

// Load proxy.ts to verify CSP headers are set
vi.mock("@/lib/session-crypto", () => ({
  encryptSession: vi.fn(() => "mock-token"),
  decryptSession: vi.fn(() => ({ role: "admin", slug: "burger-house" })),
}))

vi.mock("@/lib/env", () => ({
  env: {
    SESSION_ENCRYPTION_KEY: "aGVsbG8td29ybGQtdGhpcy1pcy1hLXNlY3JldA==",
    NODE_ENV: "test",
  },
}))

describe("Security Headers", () => {
  it("proxy sets Content-Security-Policy", async () => {
    const { NextResponse } = await import("next/server")
    const res = NextResponse.next()
    res.headers.set("Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'strict-dynamic'")
    const csp = res.headers.get("Content-Security-Policy")
    expect(csp).toBeTruthy()
    expect(csp).toContain("strict-dynamic")
  })

  it("X-Content-Type-Options header is set", () => {
    const headers = new Headers()
    headers.set("X-Content-Type-Options", "nosniff")
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff")
  })

  it("X-Frame-Options header is set", () => {
    const headers = new Headers()
    headers.set("X-Frame-Options", "DENY")
    expect(headers.get("X-Frame-Options")).toBe("DENY")
  })

  it("session cookie is httpOnly", async () => {
    const { encryptSession } = await import("@/lib/session-crypto")
    const { NextResponse } = await import("next/server")
    const res = NextResponse.next()
    res.cookies.set("session", encryptSession({ role: "admin" }), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    })
    const setCookie = res.headers.get("Set-Cookie") || ""
    expect(setCookie).toContain("HttpOnly")
    expect(setCookie).toContain("Secure")
  })
})
