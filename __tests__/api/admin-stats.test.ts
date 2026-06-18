import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/tenant", () => ({
  supabaseForRequest: vi.fn(),
  isTenantMismatch: vi.fn(() => null),
  parseSession: vi.fn(() => ({ role: "admin", email: "admin@test.com", slug: "burger-house" })),
}))

vi.mock("@/lib/api-auth", () => ({
  requireRootOwner: vi.fn(() => undefined),
  isErrorResponse: vi.fn(() => false),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://master.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "svc-key",
  },
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          limit: vi.fn(() => ({
            returns: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            returns: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}))

import { GET } from "@/app/api/admin/stats/route"
import { NextRequest } from "next/server"
import { supabaseForRequest } from "@/lib/tenant"

function makeRequest(searchParams?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/admin/stats${searchParams ? `?${searchParams}` : ""}`)
  return new NextRequest(url, {
    headers: {
      cookie: `session=${Buffer.from(JSON.stringify({ role: "admin", slug: "burger-house" })).toString("base64")}`,
    },
  })
}

function makeOwnerRequest(searchParams?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/admin/stats${searchParams ? `?${searchParams}` : ""}`)
  return new NextRequest(url, {
    headers: {
      cookie: `session=${Buffer.from(JSON.stringify({ role: "owner", email: "o@t.com", slug: "" })).toString("base64")}`,
    },
  })
}

function buildClient(orders: unknown[], items: unknown[], ratings: unknown[]) {
  const returns = (data: unknown) => vi.fn().mockResolvedValue({ data, error: null })
  const ordersChain = {
    select: vi.fn(() => ({
      gte: vi.fn(() => ({
        limit: vi.fn(() => ({
          returns: returns(orders),
          not: vi.fn(() => ({ returns: returns([]) })),
        })),
      })),
      in: vi.fn(() => ({
        gte: vi.fn(() => ({
          not: vi.fn(() => ({ returns: returns([]) })),
        })),
      })),
    })),
  }
  const itemsChain = {
    select: vi.fn(() => ({
      gte: vi.fn(() => ({
        limit: vi.fn(() => ({
          returns: returns(items),
        })),
      })),
    })),
  }
  const ratingsChain = {
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        limit: vi.fn(() => ({
          returns: returns(ratings),
        })),
      })),
    })),
  }
  return {
    from: vi.fn((t: string) => {
      if (t === "orders") return ordersChain
      if (t === "order_items") return itemsChain
      if (t === "ratings") return ratingsChain
      return { select: vi.fn() }
    }),
  } as never
}

describe("GET /api/admin/stats", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("returns stats for tenant dashboard", async () => {
    const now = new Date().toISOString()
    const orders = [
      { id: "1", status: "completed", total: 1000, created_at: now, driver_id: null },
      { id: "2", status: "completed", total: 500, created_at: now, driver_id: null },
    ]
    const items = [{ product_name: "Pizza", quantity: 2 }]
    const ratings = [{ id: "r1", rating: 5, comment: "Good", created_at: now }]

    vi.mocked(supabaseForRequest).mockResolvedValue(buildClient(orders, items, ratings))

    const res = await GET(makeRequest("period=30d"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.totalRevenue).toBe(1500)
    expect(json.totalOrders).toBe(2)
    expect(json.topProducts).toHaveLength(1)
    expect(json.topProducts[0].name).toBe("Pizza")
    expect(json.avgRating).toBe(5)
  })

  it("returns empty stats for period with no data", async () => {
    vi.mocked(supabaseForRequest).mockResolvedValue(buildClient([], [], []))

    const res = await GET(makeRequest("period=7d"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.totalRevenue).toBe(0)
    expect(json.totalOrders).toBe(0)
    expect(json.topProducts).toEqual([])
  })

  it("rejects unauthorized user", async () => {
    const { parseSession } = await import("@/lib/tenant")
    vi.mocked(parseSession).mockReturnValueOnce({ role: "cashier", email: "c@t.com", slug: "bh" })

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it("handles root mode with owner role", async () => {
    const orders = [{ id: "1", status: "completed", total: 1000, created_at: new Date().toISOString(), driver_id: null }]
    const items = [{ product_name: "Burger", quantity: 1 }]
    const ratings = [{ id: "r1", rating: 4, comment: "OK", created_at: new Date().toISOString() }]

    vi.mocked(supabaseForRequest).mockResolvedValue(buildClient(orders, items, ratings))

    const res = await GET(makeOwnerRequest("mode=root"))
    expect(res.status).toBe(200)
  })
})
