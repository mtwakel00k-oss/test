import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/tenant", () => {
  return {
    supabaseForRequest: vi.fn(),
    isTenantMismatch: vi.fn(() => null),
    parseSession: vi.fn(() => ({ role: "admin", email: "admin@test.com", slug: "burger-house" })),
    getTenantConfig: vi.fn(() => Promise.resolve(null)),
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

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}))

vi.mock("@/lib/image-store", () => ({
  getAllImageUrls: vi.fn(() => ({})),
  setImageUrl: vi.fn(),
  deleteImageUrl: vi.fn(),
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
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}))

import { GET, POST, DELETE } from "@/app/api/products/route"
import { NextRequest } from "next/server"
import { supabaseForRequest, parseSession } from "@/lib/tenant"
import { getAllImageUrls } from "@/lib/image-store"

function makeRequest(method: string, body?: unknown, searchParams?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/products${searchParams ? `?${searchParams}` : ""}`)
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      cookie: `session=${Buffer.from(JSON.stringify({ role: "admin", slug: "burger-house" })).toString("base64")}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function makeNonAdminRequest(method: string, searchParams?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/products${searchParams ? `?${searchParams}` : ""}`)
  return new NextRequest(url, {
    method,
    headers: {
      cookie: `session=${Buffer.from(JSON.stringify({ role: "cashier", slug: "bh" })).toString("base64")}`,
    },
  })
}

describe("GET /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAllImageUrls).mockReturnValue({})
  })

  it("returns products from v_products_flat", async () => {
    const mockData = [
      { id: 1, name: "Pizza", category: "Pizzas", price: 500, image_url: null },
    ]
    const mockOrderId = vi.fn().mockResolvedValue({ data: mockData, error: null })
    const selectResult = { order: vi.fn(() => ({ order: mockOrderId })) }
    const from = vi.fn(() => ({ select: vi.fn(() => selectResult) }))
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest("GET"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
  })

  it("returns 500 on query error", async () => {
    const mockOrderId = vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } })
    const selectResult = { order: vi.fn(() => ({ order: mockOrderId })) }
    const from = vi.fn(() => ({ select: vi.fn(() => selectResult) }))
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest("GET"))
    expect(res.status).toBe(500)
  })
})

describe("POST /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAllImageUrls).mockReturnValue({})
  })

  it("rejects request without admin role", async () => {
    vi.mocked(parseSession).mockReturnValueOnce({ role: "cashier", slug: "bh" })
    const res = await POST(makeNonAdminRequest("POST"))
    expect(res.status).toBe(401)
  })

  it("creates a new product", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 42, nom: "New Pizza" }, error: null })
    const mockSelect = vi.fn(() => ({ single: mockSingle }))
    const mockInsert = vi.fn(() => ({ select: mockSelect }))
    const mockTailleSelect = vi.fn().mockResolvedValue({ data: [{ id: 1, code: "M" }] })
    const mockPrixInsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn((t: string) => {
      if (t === "produits") return { insert: mockInsert, select: mockSelect, update: vi.fn() }
      if (t === "tailles") return { select: mockTailleSelect, upsert: vi.fn(() => ({ select: vi.fn() })) }
      if (t === "prix") return { insert: mockPrixInsert, delete: vi.fn(() => ({ eq: vi.fn() })) }
      return { select: vi.fn(), insert: vi.fn(), delete: vi.fn(), update: vi.fn() }
    })
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const req = makeRequest("POST", {
      action: "create", nom: "New Pizza", categorie_id: 1, description: "Yummy",
      sizes: [{ code: "M", price: 500, price_tomate: null, price_creme: null }],
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe(42)
  })

  it("creates product without sizes", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 43, nom: "Simple" }, error: null })
    const mockSelect = vi.fn(() => ({ single: mockSingle }))
    const mockInsert = vi.fn(() => ({ select: mockSelect }))
    const from = vi.fn((t: string) => {
      if (t === "produits") return { insert: mockInsert, select: mockSelect }
      return { select: vi.fn(), insert: vi.fn() }
    })
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const req = makeRequest("POST", { action: "create", nom: "Simple", categorie_id: 1 })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it("updates an existing product", async () => {
    const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    const mockPrixDelete = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    const mockPrixInsert = vi.fn().mockResolvedValue({ error: null })
    const mockTailleSelect = vi.fn().mockResolvedValue({ data: [{ id: 1, code: "M" }, { id: 2, code: "L" }] })
    const from = vi.fn((t: string) => {
      if (t === "produits") return { update: mockUpdate, select: vi.fn(() => ({ single: vi.fn() })) }
      if (t === "tailles") return { select: mockTailleSelect, upsert: vi.fn(() => ({ select: vi.fn() })) }
      if (t === "prix") return { delete: mockPrixDelete, insert: mockPrixInsert }
      return { select: vi.fn(), insert: vi.fn(), delete: vi.fn(), update: vi.fn() }
    })
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const req = makeRequest("POST", {
      action: "update", id: 1, nom: "Updated Pizza", categorie_id: 1,
      sizes: [{ code: "M", price: 600, price_tomate: null, price_creme: null }],
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("toggles product availability", async () => {
    const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    const from = vi.fn(() => ({ update: mockUpdate, select: vi.fn() }))
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const req = makeRequest("POST", { id: 1, is_available: false })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})

describe("DELETE /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAllImageUrls).mockReturnValue({})
  })

  it("deletes a product", async () => {
    const mockSelectSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockEqDelete = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn(() => ({
      delete: vi.fn(() => ({ eq: mockEqDelete })),
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSelectSingle })) })),
      update: vi.fn(),
    })) as never
    vi.mocked(supabaseForRequest).mockResolvedValue({
      from,
      storage: { from: vi.fn(() => ({ remove: vi.fn() })) },
    } as never)

    const req = makeRequest("DELETE", undefined, "id=42")
    const res = await DELETE(req)
    expect(res.status).toBe(200)
  })

  it("returns 400 when id is missing", async () => {
    const req = makeRequest("DELETE")
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it("rejects unauthorized", async () => {
    vi.mocked(parseSession).mockReturnValueOnce({ role: "cashier", slug: "bh" })
    const req = makeNonAdminRequest("DELETE", "id=42")
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it("returns 409 on foreign key violation", async () => {
    const mockSelectSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockDeletePrix = vi.fn().mockResolvedValue({ error: null })
    const mockDeleteProduit = vi.fn().mockResolvedValue({ error: { code: "23503", message: "FK violation" } })
    const from = vi.fn((t: string) => {
      if (t === "produits") return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSelectSingle })) })),
        delete: vi.fn(() => ({ eq: mockDeleteProduit })),
        update: vi.fn(),
      }
      if (t === "prix") return { delete: vi.fn(() => ({ eq: mockDeletePrix })) }
      return { delete: vi.fn(), select: vi.fn(), update: vi.fn() }
    })
    vi.mocked(supabaseForRequest).mockResolvedValue({
      from,
      storage: { from: vi.fn(() => ({ remove: vi.fn() })) },
    } as never)

    const req = makeRequest("DELETE", undefined, "id=42")
    const res = await DELETE(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.code).toBe("FK_VIOLATION")
  })
})
