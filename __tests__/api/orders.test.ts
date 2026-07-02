import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ──────────────────────────────────────────────────────

vi.mock("@/lib/tenant", () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
          order: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle: vi.fn() })) })),
          limit: vi.fn(() => ({ maybeSingle: vi.fn() })),
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({ limit: vi.fn() })),
        })),
        order: vi.fn(() => ({ limit: vi.fn() })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ maybeSingle: vi.fn() })),
      })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
      rpc: vi.fn(),
    })),
    rpc: vi.fn(),
  }

  return {
    supabaseForRequest: vi.fn(() => Promise.resolve(mockSupabase)),
    supabaseForRequestAdmin: vi.fn(() => Promise.resolve(mockSupabase)),
    isTenantMismatch: vi.fn(() => null),
    parseSession: vi.fn(() => ({ role: "cashier", email: "test@test.com", slug: "burger-house" })),
    getTenantConfig: vi.fn(() => Promise.resolve({ is_open: true })),
    getIsOpen: vi.fn(() => Promise.resolve(true)),
  }
})

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 60, resetAt: Date.now() + 60000 })),
  rateLimitResponse: vi.fn(() => new Response("Rate limited", { status: 429 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }))

import { POST } from "@/app/api/orders/route"
import { NextRequest } from "next/server"

function makeRequest(body: unknown, slug = "burger-house"): NextRequest {
  const url = new URL(`http://localhost:3000/${slug}/api/orders`)
  const req = new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `session=${Buffer.from(JSON.stringify({ role: "cashier", slug })).toString("base64")}`,
    },
    body: JSON.stringify(body),
  })
  return req
}

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects missing items", async () => {
    const req = makeRequest({ customer_name: "Test" })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Validation failed")
  })

  it("rejects missing customer_name", async () => {
    const req = makeRequest({ items: [{ product_id: 1, product_name: "Pizza", size: "M", sauce: null, quantity: 1, unit_price: 500 }] })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Validation failed")
  })

  it("rejects invalid phone for delivery", async () => {
    const req = makeRequest({
      items: [{ product_id: 1, product_name: "Pizza", size: "M", sauce: null, quantity: 1, unit_price: 500 }],
      customer_name: "Test",
      order_type: "delivery",
      customer_phone: "1234",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Validation failed")
  })

  it("rejects dine-in without table_number", async () => {
    const req = makeRequest({
      items: [{ product_id: 1, product_name: "Pizza", size: "M", sauce: null, quantity: 1, unit_price: 500 }],
      customer_name: "Test",
      order_type: "dine_in",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Missing table_number")
  })

  it("rejects dine-in with invalid table_number", async () => {
    const req = makeRequest({
      items: [{ product_id: 1, product_name: "Pizza", size: "M", sauce: null, quantity: 1, unit_price: 500 }],
      customer_name: "Test",
      order_type: "dine_in",
      table_number: 0,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("accepts valid takeaway order", async () => {
    const { supabaseForRequestAdmin } = await import("@/lib/tenant")

    // Mock RPC response
    const mockRpc = vi.fn().mockResolvedValue({ data: 42, error: null })
    // Mock product query
    const mockProductsQuery = {
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          returns: vi.fn().mockResolvedValue({
            data: [{ id: 1, name: "Pizza", prices: { M: { standard: 500, sauce_tomate: null, creme_fraiche: null } } }],
          }),
        })),
      })),
    }
    // Mock insert
    const mockInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "mock-order-id", order_number: 42 },
          error: null,
        }),
      })),
    }))
    const mockSb = {
      from: vi.fn((table: string) => {
        if (table === "v_products_flat") return mockProductsQuery
        if (table === "orders") {
          return {
            insert: mockInsert,
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: "mock-order-id" }, error: null }),
              })),
              order: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })),
            })),
            delete: vi.fn(() => ({ eq: vi.fn() })),
          }
        }
        if (table === "order_items") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        return { select: vi.fn(() => ({ in: vi.fn() })), insert: vi.fn() }
      }),
      rpc: mockRpc,
    }

    vi.mocked(supabaseForRequestAdmin).mockResolvedValue(mockSb as never)

    const req = makeRequest({
      items: [{ product_id: 1, product_name: "Pizza", size: "M", sauce: null, quantity: 2, unit_price: 500 }],
      customer_name: "Ahmed",
      order_type: "takeaway",
    })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.id).toBe("mock-order-id")
    expect(json.orderNumber).toBe(42)
  })
})
