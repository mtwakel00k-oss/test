import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/tenant", () => ({
  supabaseForRequest: vi.fn(),
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

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}))

import { GET, POST, DELETE } from "@/app/api/categories/route"
import { NextRequest } from "next/server"
import { supabaseForRequest } from "@/lib/tenant"

function makeRequest(method: string, body?: unknown, searchParams?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/categories${searchParams ? `?${searchParams}` : ""}`)
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      cookie: `session=${Buffer.from(JSON.stringify({ role: "admin", slug: "burger-house" })).toString("base64")}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function mockFrom() {
  return vi.fn((table: string) => {
    if (table === "categories") return {
      select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [{ id: 1, nom: "Pizzas", description: null }], error: null }) })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 5, nom: "New Cat" }, error: null }) })) })),
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      update: vi.fn(() => ({ eq: vi.fn() })),
    }
    if (table === "v_products_flat") return {
      select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [] }) })),
    }
    if (table === "produits") return {
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    }
    return { select: vi.fn(), insert: vi.fn(), delete: vi.fn(), update: vi.fn() }
  })
}

describe("GET /api/categories", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("returns categories from DB", async () => {
    vi.mocked(supabaseForRequest).mockResolvedValue({ from: mockFrom() } as never)

    const res = await GET(makeRequest("GET"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].nom).toBe("Pizzas")
  })

  it("falls back to v_products_flat when categories table fails", async () => {
    const from = vi.fn((table: string) => {
      if (table === "categories") return {
        select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: null, error: { message: "does not exist" } }) })),
        insert: vi.fn(),
        delete: vi.fn(),
      }
      if (table === "v_products_flat") return {
        select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [{ category: "Burgers" }, { category: "Drinks" }] }) })),
      }
      return { select: vi.fn(), insert: vi.fn(), delete: vi.fn() }
    })
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest("GET"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.length).toBeGreaterThanOrEqual(2)
  })
})

describe("POST /api/categories", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("creates a new category", async () => {
    const from = vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 10, nom: "Desserts" }, error: null }),
        })),
      })),
      select: vi.fn(),
      delete: vi.fn(),
    }))
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const req = makeRequest("POST", { nom: "Desserts" })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.nom).toBe("Desserts")
  })

  it("rejects empty name", async () => {
    const req = makeRequest("POST", { nom: "" })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("rejects unauthorized", async () => {
    const { parseSession } = await import("@/lib/tenant")
    vi.mocked(parseSession).mockReturnValueOnce({ role: "cashier", email: "c@t.com", slug: "bh" })

    const req = makeRequest("POST", { nom: "Test" })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/categories", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("deletes a category", async () => {
    vi.mocked(supabaseForRequest).mockResolvedValue({ from: mockFrom() } as never)

    const req = makeRequest("DELETE", undefined, "id=5")
    const res = await DELETE(req)
    expect(res.status).toBe(200)
  })

  it("returns 400 when id missing", async () => {
    const req = makeRequest("DELETE")
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it("rejects unauthorized", async () => {
    const { parseSession } = await import("@/lib/tenant")
    vi.mocked(parseSession).mockReturnValueOnce({ role: "cashier", email: "c@t.com", slug: "bh" })

    const req = makeRequest("DELETE", undefined, "id=5")
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it("returns 409 on FK violation", async () => {
    const from = vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: { code: "23503", message: "FK violation" } }),
      })),
      update: vi.fn(() => ({ eq: vi.fn() })),
      select: vi.fn(),
    }))
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const req = makeRequest("DELETE", undefined, "id=5")
    const res = await DELETE(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.code).toBe("FK_VIOLATION")
  })
})
