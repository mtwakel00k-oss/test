import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/tenant", () => ({
  supabaseForRequestAdmin: vi.fn(),
  isTenantMismatch: vi.fn(() => null),
  parseSession: vi.fn(() => ({ role: "cashier", email: "test@test.com", slug: "burger-house" })),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 60, resetAt: Date.now() + 60000 })),
  rateLimitResponse: vi.fn(() => new Response("Rate limited", { status: 429 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}))

vi.mock("@/lib/check-feature", () => ({
  checkFeature: vi.fn(() => Promise.resolve(true)),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST, DELETE } from "@/app/api/ratings/route"
import { NextRequest } from "next/server"
import { supabaseForRequestAdmin } from "@/lib/tenant"
import { checkFeature } from "@/lib/check-feature"

function makeRequest(method: string, body: unknown): NextRequest {
  const url = new URL("http://localhost:3000/api/ratings")
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      cookie: `session=${Buffer.from(JSON.stringify({ role: "cashier", slug: "burger-house" })).toString("base64")}`,
    },
    body: JSON.stringify(body),
  })
}

describe("POST /api/ratings", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("submits a valid rating", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockSelectMaybe = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null })
    const from = vi.fn((table: string) => {
      if (table === "produits") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockSelectMaybe })) })) }
      if (table === "ratings") return { insert: mockInsert }
      return { select: vi.fn(), insert: vi.fn() }
    })
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const req = makeRequest("POST", { product_id: 1, rating: 5, comment: "Great!" })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalled()
  })

  it("rejects invalid rating (out of range)", async () => {
    const req = makeRequest("POST", { product_id: 1, rating: 6 })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("rejects missing product_id", async () => {
    const req = makeRequest("POST", { rating: 5 })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("rejects comment over 1000 chars", async () => {
    const req = makeRequest("POST", { product_id: 1, rating: 5, comment: "x".repeat(1001) })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when product no longer exists", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) })) })),
      insert: vi.fn(),
    }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const req = makeRequest("POST", { product_id: 999, rating: 5 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Product no longer exists")
  })

  it("returns 403 when feature is not enabled", async () => {
    vi.mocked(checkFeature).mockResolvedValueOnce(false)

    const req = makeRequest("POST", { product_id: 1, rating: 5 })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("retries without order_id when column missing", async () => {
    const mockInsert = vi.fn()
      .mockResolvedValueOnce({ error: { message: "column order_id does not exist" } })
      .mockResolvedValueOnce({ error: null })
    const from = vi.fn((table: string) => {
      if (table === "produits") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1 } }) })) })) }
      if (table === "orders") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "ord-1" } }) })) })) }
      if (table === "ratings") return { insert: mockInsert }
      return { select: vi.fn(), insert: vi.fn() }
    })
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const req = makeRequest("POST", { product_id: 1, rating: 4, order_id: "ord-1" })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledTimes(2)
  })

  it("respects rate limiter", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit")
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 })

    const req = makeRequest("POST", { product_id: 1, rating: 5 })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })
})

describe("DELETE /api/ratings", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("clears all ratings (admin)", async () => {
    const mockDelete = vi.fn(() => ({ not: vi.fn().mockResolvedValue({ error: null }) }))
    const from = vi.fn(() => ({ delete: mockDelete, select: vi.fn() }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const { parseSession } = await import("@/lib/tenant")
    vi.mocked(parseSession).mockReturnValueOnce({ role: "admin", email: "a@t.com", slug: "bh" })

    const req = makeRequest("DELETE", {})
    const res = await DELETE(req)
    expect(res.status).toBe(200)
  })

  it("rejects non-admin", async () => {
    const req = makeRequest("DELETE", {})
    const res = await DELETE(req)
    expect(res.status).toBe(403)
  })
})
