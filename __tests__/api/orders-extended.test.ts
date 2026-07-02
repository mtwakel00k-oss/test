import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Shared Mocks ───────────────────────────────────────────────

const mockCheckRateLimit = vi.hoisted(() => vi.fn(() => Promise.resolve({ allowed: true, remaining: 60, resetAt: Date.now() + 60000 })))

vi.mock("@/lib/tenant", () => ({
  supabaseForRequest: vi.fn(),
  supabaseForRequestAdmin: vi.fn(),
  isTenantMismatch: vi.fn(() => null),
  parseSession: vi.fn(() => ({ role: "cashier", email: "test@test.com", slug: "burger-house" })),
  getTenantConfig: vi.fn(() => Promise.resolve({ is_open: true })),
  getIsOpen: vi.fn(() => Promise.resolve(true)),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  rateLimitResponse: vi.fn((resetAt?: number) => {
    const retryAfter = resetAt ? Math.ceil((resetAt - Date.now()) / 1000) : 30
    return new Response("Rate limited", { status: 429, headers: { "Retry-After": String(Math.max(retryAfter, 1)) } })
  }),
  getClientIp: vi.fn(() => "127.0.0.1"),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }))

import { POST } from "@/app/api/orders/route"
import { NextRequest } from "next/server"
import { supabaseForRequestAdmin } from "@/lib/tenant"

function makeRequest(body: unknown, slug = "burger-house"): NextRequest {
  const url = new URL(`http://localhost:3000/${slug}/api/orders`)
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `session=${Buffer.from(JSON.stringify({ role: "cashier", slug })).toString("base64")}`,
    },
    body: JSON.stringify(body),
  })
}

function buildMockSupabase(overrides: {
  rpcResult?: { data: number | null; error: string | null }
  products?: Array<{ id: number; name: string; prices: Record<string, unknown> }>
  insertResult?: { data: Record<string, unknown> | null; error: string | null }
  verifyResult?: { data: Record<string, unknown> | null; error: string | null }
  itemsError?: string | null
}) {
  const {
    rpcResult = { data: 42, error: null },
    products = [],
    insertResult = { data: { id: "order-1", order_number: 42 }, error: null },
    verifyResult = { data: { id: "order-1" }, error: null },
    itemsError = null,
  } = overrides

  return {
    from: vi.fn((table: string) => {
      if (table === "v_products_flat") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              returns: vi.fn().mockResolvedValue({ data: products }),
            })),
          })),
        }
      }
      if (table === "orders") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue(insertResult),
            })),
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue(verifyResult),
            })),
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
          delete: vi.fn(() => ({ eq: vi.fn() })),
        }
      }
      if (table === "order_items") {
        return { insert: vi.fn().mockResolvedValue({ error: itemsError ? new Error(itemsError) : null }) }
      }
      return { select: vi.fn(() => ({ in: vi.fn() })), insert: vi.fn() }
    }),
    rpc: vi.fn().mockResolvedValue(rpcResult),
  }
}

describe("POST /api/orders — Extended", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects empty items array", async () => {
    const req = makeRequest({ items: [], customer_name: "Test" })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("rejects delivery with missing phone", async () => {
    const req = makeRequest({
      items: [{ product_id: 1, product_name: "Pizza", size: "M", sauce: null, quantity: 1, unit_price: 500 }],
      customer_name: "Test",
      order_type: "delivery",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("customer_phone")
  })

  it("filters out stale products from payload", async () => {
    const mockSb = buildMockSupabase({
      products: [{ id: 1, name: "Pizza", prices: { M: { standard: 500, sauce_tomate: null, creme_fraiche: null } } }],
      rpcResult: { data: 7, error: null },
      insertResult: { data: { id: "order-stale", order_number: 7 }, error: null },
      verifyResult: { data: { id: "order-stale" }, error: null },
    })

    vi.mocked(supabaseForRequestAdmin).mockResolvedValue(mockSb as never)

    const req = makeRequest({
      items: [
        { product_id: 1, product_name: "Pizza", size: "M", sauce: null, quantity: 1, unit_price: 500 },
        { product_id: 999, product_name: "Ghost", size: "L", sauce: null, quantity: 1, unit_price: 999 },
      ],
      customer_name: "Ali",
      order_type: "takeaway",
    })

    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.removed_product_ids).toEqual([999])
  })

  it("rejects all-stale order", async () => {
    const mockSb = buildMockSupabase({
      products: [],
      rpcResult: { data: 0, error: null },
    })

    vi.mocked(supabaseForRequestAdmin).mockResolvedValue(mockSb as never)

    const req = makeRequest({
      items: [{ product_id: 999, product_name: "Ghost", size: "L", sauce: null, quantity: 1, unit_price: 999 }],
      customer_name: "Ali",
      order_type: "takeaway",
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe("ALL_PRODUCTS_STALE")
  })

  it("respects rate limiter", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 30000 })

    const req = makeRequest({
      items: [{ product_id: 1, product_name: "Pizza", size: "M", sauce: null, quantity: 1, unit_price: 500 }],
      customer_name: "Test",
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBeTruthy()
  })

  it("enforces tenant isolation via slug", async () => {
    const mockSbA = buildMockSupabase({
      products: [{ id: 1, name: "Pizza A", prices: { M: { standard: 500, sauce_tomate: null, creme_fraiche: null } } }],
      rpcResult: { data: 1, error: null },
      insertResult: { data: { id: "tenant-a-order", order_number: 1 }, error: null },
      verifyResult: { data: { id: "tenant-a-order" }, error: null },
    })
    const mockSbB = buildMockSupabase({
      products: [{ id: 2, name: "Sushi B", prices: { M: { standard: 800, sauce_tomate: null, creme_fraiche: null } } }],
      rpcResult: { data: 1, error: null },
      insertResult: { data: { id: "tenant-b-order", order_number: 1 }, error: null },
      verifyResult: { data: { id: "tenant-b-order" }, error: null },
    })

    // Tenant A
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue(mockSbA as never)
    const reqA = makeRequest({
      items: [{ product_id: 1, product_name: "Pizza A", size: "M", sauce: null, quantity: 1, unit_price: 500 }],
      customer_name: "TenantA",
      order_type: "takeaway",
    }, "tenant-a")
    const resA = await POST(reqA)
    expect(resA.status).toBe(200)
    const jsonA = await resA.json()
    expect(jsonA.id).toBe("tenant-a-order")

    // Tenant B
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue(mockSbB as never)
    const reqB = makeRequest({
      items: [{ product_id: 2, product_name: "Sushi B", size: "M", sauce: null, quantity: 1, unit_price: 800 }],
      customer_name: "TenantB",
      order_type: "takeaway",
    }, "tenant-b")
    const resB = await POST(reqB)
    expect(resB.status).toBe(200)
    const jsonB = await resB.json()
    expect(jsonB.id).toBe("tenant-b-order")
  })
})
