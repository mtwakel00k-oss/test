import { describe, it, expect, vi, beforeEach } from "vitest"

let mockUpdateResult = { error: null }
const mockSupabaseFrom = vi.fn()

vi.mock("@/lib/tenant", () => ({
  invalidateTenantConfig: vi.fn(),
}))

vi.mock("@/lib/api-auth", async () => {
  const { NextResponse } = await import("next/server")
  return {
    requireRootOwner: vi.fn((req: Request) => {
      const cookie = req.headers.get("cookie") || ""
      try {
        const session = JSON.parse(Buffer.from(cookie.split("session=")[1], "base64").toString())
        if (session.role === "owner" && !session.slug) return undefined
      } catch {}
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }),
    isErrorResponse: vi.fn((v: unknown) => v instanceof Response || v instanceof NextResponse),
  }
})

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 60, resetAt: Date.now() + 60000 })),
  rateLimitResponse: vi.fn(() => new Response("Rate limited", { status: 429 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_SUPABASE_URL: "https://master.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "svc-key" },
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockSupabaseFrom })),
}))

import { GET, PATCH } from "@/app/api/admin/plans/route"
import { NextRequest } from "next/server"

function ownerRequest(method: string, body?: unknown): NextRequest {
  const url = new URL("http://localhost:3000/api/admin/plans")
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      cookie: `session=${Buffer.from(JSON.stringify({ role: "owner", email: "owner@test.com", slug: "" })).toString("base64")}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function nonOwnerRequest(method: string): NextRequest {
  const url = new URL("http://localhost:3000/api/admin/plans")
  return new NextRequest(url, {
    method,
    headers: {
      cookie: `session=${Buffer.from(JSON.stringify({ role: "admin", slug: "burger-house" })).toString("base64")}`,
    },
  })
}

describe("GET /api/admin/plans", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("lists all tenants", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({
          data: [{ id: "1", slug: "burger-house", name: "Burger House", plan_type: "pro", is_active: true, created_at: "2025-01-01" }],
          error: null,
        }),
      })),
    })

    const res = await GET(ownerRequest("GET"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.tenants).toHaveLength(1)
  })

  it("rejects non-owner", async () => {
    const res = await GET(nonOwnerRequest("GET"))
    expect(res.status).toBe(403)
  })
})

describe("PATCH /api/admin/plans", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateResult = { error: null }
  })

  it("updates plan_type", async () => {
    mockSupabaseFrom.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue(mockUpdateResult),
      })),
    })

    const res = await PATCH(ownerRequest("PATCH", { slug: "burger-house", plan_type: "elite" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("toggles is_active", async () => {
    mockSupabaseFrom.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue(mockUpdateResult),
      })),
    })

    const res = await PATCH(ownerRequest("PATCH", { slug: "burger-house", is_active: false }))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it("rejects invalid plan", async () => {
    const res = await PATCH(ownerRequest("PATCH", { slug: "burger-house", plan_type: "ultra" }))
    expect(res.status).toBe(400)
  })

  it("rejects missing slug", async () => {
    const res = await PATCH(ownerRequest("PATCH", { plan_type: "pro" }))
    expect(res.status).toBe(400)
  })

  it("rejects non-owner", async () => {
    const res = await PATCH(nonOwnerRequest("PATCH"))
    expect(res.status).toBe(403)
  })

  it("returns 500 on DB error", async () => {
    mockSupabaseFrom.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: { message: "DB down" } }),
      })),
    })

    const res = await PATCH(ownerRequest("PATCH", { slug: "burger-house", plan_type: "starter" }))
    expect(res.status).toBe(500)
  })
})
