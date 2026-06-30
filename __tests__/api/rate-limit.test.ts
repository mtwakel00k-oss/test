import { describe, it, expect, vi } from "vitest"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/env", () => ({
  env: {
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    NEXT_PUBLIC_SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  },
}))

describe("rate-limit", () => {
  describe("checkRateLimit()", () => {
    it("allows when no Redis or Supabase configured", async () => {
      const result = await checkRateLimit("test-key")
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
    })

    it("allows with custom config", async () => {
      const result = await checkRateLimit("test-key", { max: 10, windowMs: 60000 })
      expect(result.allowed).toBe(true)
    })
  })

  describe("rateLimitResponse()", () => {
    it("returns 429 with Retry-After header", () => {
      const res = rateLimitResponse(Date.now() + 30000)
      expect(res.status).toBe(429)
      expect(res.headers.get("Retry-After")).toBeTruthy()
      expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy()
    })
  })

  describe("getClientIp()", () => {
    it("extracts from x-forwarded-for", () => {
      const req = new Request("http://localhost", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      })
      expect(getClientIp(req)).toBe("1.2.3.4")
    })

    it("falls back to x-real-ip", () => {
      const req = new Request("http://localhost", {
        headers: { "x-real-ip": "9.9.9.9" },
      })
      expect(getClientIp(req)).toBe("9.9.9.9")
    })

    it("returns unknown when no headers", () => {
      const req = new Request("http://localhost")
      expect(getClientIp(req)).toBe("unknown")
    })
  })
})
