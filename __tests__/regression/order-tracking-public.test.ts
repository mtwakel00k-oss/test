import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/tenant", () => {
  const mockSupabase = () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: vi.fn() })) })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    })),
    rpc: vi.fn(),
  })
  return {
    supabaseForRequestAdmin: vi.fn(() => Promise.resolve(mockSupabase())),
    isTenantMismatch: vi.fn(() => null),
    parseSession: vi.fn(() => ({})),
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

vi.mock("@/lib/order-tracking", () => ({
  findOrderAcrossTenants: vi.fn(() => Promise.resolve(null)),
}))

vi.mock("@/lib/constants", () => ({
  DB_STATUS_TO_POS: { pending: "pending", preparing: "preparing", ready: "ready", completed: "completed", cancelled: "cancelled" } as Record<string, string>,
}))

import { GET } from "@/app/api/orders/[id]/route"
import { NextRequest } from "next/server"
import { supabaseForRequestAdmin } from "@/lib/tenant"

function makePublicRequest(id: string, phone?: string, slug = "burger-house"): NextRequest {
  let urlStr = `http://localhost:3000/api/orders/${id}?public=true`
  if (phone) urlStr += `&phone=${encodeURIComponent(phone)}`
  const url = new URL(urlStr)
  return new NextRequest(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-slug": slug,
    },
  })
}

function buildMockSupabase(orderData: Record<string, unknown> | null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: orderData, error: null }),
        })),
      })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: vi.fn() })) })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    })),
    rpc: vi.fn(),
  }
}

function assertOrderShape(json: Record<string, unknown>) {
  expect(json.order).toBeDefined()
  expect(json.order).toHaveProperty("id")
  expect(json.order).toHaveProperty("status")
  expect(json.order).toHaveProperty("order_number")
  expect(json.order).toHaveProperty("order_type")
  expect(json.order).toHaveProperty("total")
}

describe("@regression Public GET /api/orders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows dine_in order without phone verification", async () => {
    const order = {
      id: "dine-in-uuid",
      status: "pending",
      order_number: 1,
      order_type: "dine_in",
      total: 1500,
      customer_name: "Ahmed",
      table_number: 5,
      customer_phone: null,
      items: [{ product_name: "Pizza", quantity: 1, size: "M", subtotal: 1500 }],
    }
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue(buildMockSupabase(order) as never)

    const res = await GET(makePublicRequest("dine-in-uuid"), { params: Promise.resolve({ id: "dine-in-uuid" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    assertOrderShape(json)
    expect(json.order.order_type).toBe("dine_in")
  })

  it("allows takeaway order without phone verification", async () => {
    const order = {
      id: "takeaway-uuid",
      status: "pending",
      order_number: 2,
      order_type: "takeaway",
      total: 1000,
      customer_name: "Sami",
      customer_phone: null,
      items: [{ product_name: "Burger", quantity: 2, size: "L", subtotal: 1000 }],
    }
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue(buildMockSupabase(order) as never)

    const res = await GET(makePublicRequest("takeaway-uuid"), { params: Promise.resolve({ id: "takeaway-uuid" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    assertOrderShape(json)
    expect(json.order.order_type).toBe("takeaway")
  })

  it("allows delivery order with correct phone", async () => {
    const order = {
      id: "delivery-uuid",
      status: "pending",
      order_number: 3,
      order_type: "delivery",
      total: 2000,
      customer_name: "Ali",
      customer_phone: "0555123456",
      delivery_address: "Algiers",
      items: [{ product_name: "Pizza", quantity: 1, size: "L", subtotal: 2000 }],
    }
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue(buildMockSupabase(order) as never)

    const res = await GET(makePublicRequest("delivery-uuid", "0555123456"), { params: Promise.resolve({ id: "delivery-uuid" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    assertOrderShape(json)
    expect(json.order.order_type).toBe("delivery")
  })

  it("rejects delivery order without phone param", async () => {
    const order = {
      id: "delivery-uuid-2",
      status: "pending",
      order_number: 4,
      order_type: "delivery",
      total: 2000,
      customer_name: "Ali",
      customer_phone: "0555123456",
      items: [{ product_name: "Pizza", quantity: 1, size: "L", subtotal: 2000 }],
    }
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue(buildMockSupabase(order) as never)

    const res = await GET(makePublicRequest("delivery-uuid-2"), { params: Promise.resolve({ id: "delivery-uuid-2" }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Phone verification required")
  })

  it("rejects delivery order with wrong phone", async () => {
    const order = {
      id: "delivery-uuid-3",
      status: "pending",
      order_number: 5,
      order_type: "delivery",
      total: 2000,
      customer_name: "Ali",
      customer_phone: "0555123456",
      items: [{ product_name: "Pizza", quantity: 1, size: "L", subtotal: 2000 }],
    }
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue(buildMockSupabase(order) as never)

    const res = await GET(makePublicRequest("delivery-uuid-3", "0666123456"), { params: Promise.resolve({ id: "delivery-uuid-3" }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toContain("not found")
  })

  it("returns 404 for non-existent order", async () => {
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue(buildMockSupabase(null) as never)

    const res = await GET(makePublicRequest("nonexistent-uuid"), { params: Promise.resolve({ id: "nonexistent-uuid" }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toContain("not found")
  })
})
