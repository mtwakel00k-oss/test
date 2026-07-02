import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/tenant", () => ({
  supabaseForRequest: vi.fn(),
  supabaseForRequestAdmin: vi.fn(),
  supabaseForSlug: vi.fn(),
  isTenantMismatch: vi.fn(() => null),
  parseSession: vi.fn(() => ({ role: "admin", email: "admin@test.com", slug: "burger-house" })),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 60, resetAt: Date.now() + 60000 })),
  rateLimitResponse: vi.fn(() => new Response("Rate limited", { status: 429 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/collect", () => ({
  markOrderAsCollected: vi.fn(),
}))

import { NextRequest } from "next/server"
import { supabaseForRequestAdmin, parseSession } from "@/lib/tenant"
import { markOrderAsCollected } from "@/lib/collect"
import { GET as ManageGET, PATCH as ManagePATCH } from "@/app/api/delivery/manage/[order_id]/route"
import { POST as CollectPOST } from "@/app/api/delivery/collect/route"
import { GET, POST, PATCH, DELETE } from "@/app/api/delivery-men/route"

function makeRequest(method: string, body?: unknown, path = ""): NextRequest {
  const url = new URL(`http://localhost:3000/api${path}`)
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      cookie: `session=${Buffer.from(JSON.stringify({ role: "admin", slug: "burger-house" })).toString("base64")}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe("POST /api/delivery/collect", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("marks order as collected", async () => {
    vi.mocked(markOrderAsCollected).mockResolvedValue({ success: true })

    const req = makeRequest("POST", { order_id: "123" })
    const res = await CollectPOST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("rejects missing order_id", async () => {
    const req = makeRequest("POST", {})
    const res = await CollectPOST(req)
    expect(res.status).toBe(400)
  })

  it("returns 429 when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit")
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 })

    const req = makeRequest("POST", { order_id: "123" })
    const res = await CollectPOST(req)
    expect(res.status).toBe(429)
  })
})

describe("GET /api/delivery/manage/[order_id]", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("returns order with delivery_man", async () => {
    const mockOrder = { id: "1", status: "preparing", delivery_men: { id: 1, name: "Ali", whatsapp_number: "0550000000" } }
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
        })),
      })),
    }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const req = makeRequest("GET", undefined, "/delivery/manage/1")
    const res = await ManageGET(req, { params: Promise.resolve({ order_id: "1" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe("preparing")
    expect(json.delivery_men.name).toBe("Ali")
  })

  it("returns 404 when order not found", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
        })),
      })),
    }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const req = makeRequest("GET", undefined, "/delivery/manage/999")
    const res = await ManageGET(req, { params: Promise.resolve({ order_id: "999" }) })
    expect(res.status).toBe(404)
  })
})

describe("PATCH /api/delivery/manage/[order_id]", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("updates driver location", async () => {
    const from = vi.fn((t: string) => {
      if (t === "orders") return {
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { delivery_man_id: null }, error: null }) })) })),
      }
      if (t === "delivery_men") return { update: vi.fn(() => ({ eq: vi.fn() })) }
      return { select: vi.fn(), update: vi.fn() }
    })
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const req = makeRequest("PATCH", { driver_lat: 36.7, driver_lng: 3.2 }, "/delivery/manage/1")
    const res = await ManagePATCH(req, { params: Promise.resolve({ order_id: "1" }) })
    expect(res.status).toBe(200)
  })

  it("marks order as completed and frees driver", async () => {
    const from = vi.fn((t: string) => {
      if (t === "orders") return {
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { delivery_man_id: 5 }, error: null }) })) })),
      }
      if (t === "delivery_men") return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }
      return { select: vi.fn(), update: vi.fn() }
    })
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const req = makeRequest("PATCH", { status: "completed" }, "/delivery/manage/1")
    const res = await ManagePATCH(req, { params: Promise.resolve({ order_id: "1" }) })
    expect(res.status).toBe(200)
  })

  it("returns 400 when no fields to update", async () => {
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from: vi.fn() } as never)

    const req = makeRequest("PATCH", {}, "/delivery/manage/1")
    const res = await ManagePATCH(req, { params: Promise.resolve({ order_id: "1" }) })
    expect(res.status).toBe(400)
  })

  it("handles missing column gracefully", async () => {
    const eqMock = vi.fn()
      .mockResolvedValueOnce({ error: { message: 'column "driver_lat" does not exist' } })
      .mockResolvedValue({ error: null })
    const from = vi.fn((t: string) => {
      if (t === "orders") return {
        update: vi.fn(() => ({ eq: eqMock })),
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { delivery_man_id: null }, error: null }) })) })),
      }
      return { select: vi.fn(), update: vi.fn() }
    })
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const req = makeRequest("PATCH", { driver_lat: 36.7 }, "/delivery/manage/1")
    const res = await ManagePATCH(req, { params: Promise.resolve({ order_id: "1" }) })
    expect(res.status).toBe(200)
  })
})

describe("GET /api/delivery-men", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("lists delivery men", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [{ id: 1, name: "Ali" }], error: null }) })),
    }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest("GET"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].name).toBe("Ali")
  })

  it("returns empty array when table missing", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: null, error: { message: "does not exist", code: "PGRST205" } }) })),
    }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest("GET"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual([])
  })
})

describe("POST /api/delivery-men", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("creates a delivery man", async () => {
    const from = vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 1, name: "Ali", whatsapp_number: "0550000000" }, error: null }) })) })),
    }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const req = makeRequest("POST", { name: "Ali", whatsapp_number: "0550000000" })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.name).toBe("Ali")
  })

  it("rejects missing fields", async () => {
    const req = makeRequest("POST", {})
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("rejects non-admin", async () => {
    vi.mocked(parseSession).mockReturnValueOnce({ role: "cashier", email: "c@t.com", slug: "bh" })

    const req = makeRequest("POST", { name: "Ali", whatsapp_number: "0550000000" })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

describe("PATCH /api/delivery-men", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("updates a delivery man", async () => {
    const from = vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 1, name: "Ali Updated" }, error: null }) })) })) })),
    }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const req = makeRequest("PATCH", { id: 1, name: "Ali Updated" })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe("Ali Updated")
  })

  it("rejects missing id", async () => {
    const req = makeRequest("PATCH", { name: "Ali" })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it("rejects non-admin", async () => {
    vi.mocked(parseSession).mockReturnValueOnce({ role: "cashier", email: "c@t.com", slug: "bh" })

    const req = makeRequest("PATCH", { id: 1, name: "Ali" })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/delivery-men", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("deletes a delivery man", async () => {
    const from = vi.fn(() => ({
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const req = makeRequest("DELETE", undefined, "/delivery-men?id=1")
    const res = await DELETE(req)
    expect(res.status).toBe(200)
  })

  it("rejects missing id", async () => {
    const req = makeRequest("DELETE")
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it("rejects non-admin", async () => {
    vi.mocked(parseSession).mockReturnValueOnce({ role: "cashier", email: "c@t.com", slug: "bh" })

    const req = makeRequest("DELETE", undefined, "/delivery-men?id=1")
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })
})
