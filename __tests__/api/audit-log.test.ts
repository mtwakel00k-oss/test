import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/tenant", () => ({
  supabaseForRequest: vi.fn(),
  isTenantMismatch: vi.fn(() => null),
  parseSession: vi.fn(() => ({ role: "admin", email: "admin@test.com", slug: "burger-house" })),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { GET } from "@/app/api/admin/audit-log/route"
import { NextRequest } from "next/server"
import { supabaseForRequest } from "@/lib/tenant"

function makeRequest(searchParams?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/admin/audit-log${searchParams ? `?${searchParams}` : ""}`)
  return new NextRequest(url, {
    headers: {
      cookie: `session=${Buffer.from(JSON.stringify({ role: "admin", slug: "burger-house" })).toString("base64")}`,
    },
  })
}

function makeRangeReturns(data: unknown[], count: number, error: unknown = null) {
  return { returns: vi.fn().mockResolvedValue({ data, error, count }) }
}

describe("GET /api/admin/audit-log", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("returns audit log entries", async () => {
    const mockData = [
      { id: "1", table_name: "produits", record_id: "42", operation: "UPDATE", old_data: null, new_data: { nom: "Pizza" }, changed_by: "admin", changed_by_role: "admin", ip_address: "127.0.0.1", created_at: "2025-06-01T00:00:00Z" },
    ]
    const rangeResult = makeRangeReturns(mockData, 1)
    const orderResult = { range: vi.fn(() => rangeResult) }
    const selectResult = { order: vi.fn(() => orderResult) }
    const from = vi.fn(() => ({ select: vi.fn(() => selectResult) }))
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.count).toBe(1)
    expect(json.data).toHaveLength(1)
  })

  it("returns empty array when table does not exist", async () => {
    const rangeResult = makeRangeReturns([], 0, { message: "relation audit_log does not exist" })
    const orderResult = { range: vi.fn(() => rangeResult) }
    const selectResult = { order: vi.fn(() => orderResult) }
    const from = vi.fn(() => ({ select: vi.fn(() => selectResult) }))
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual([])
    expect(json.count).toBe(0)
  })

  it("supports limit and offset params", async () => {
    const rangeResult = makeRangeReturns([], 0)
    const orderResult = { range: vi.fn(() => rangeResult) }
    const selectResult = { order: vi.fn(() => orderResult) }
    const from = vi.fn(() => ({ select: vi.fn(() => selectResult) }))
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest("limit=50&offset=10"))
    expect(res.status).toBe(200)
  })

  it("rejects unauthorized", async () => {
    const { parseSession } = await import("@/lib/tenant")
    vi.mocked(parseSession).mockReturnValueOnce({ role: "cashier", email: "c@t.com", slug: "bh" })

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it("filters by table", async () => {
    const mockReturns = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
    const afterEq = { returns: mockReturns }
    const afterRange = { eq: vi.fn(() => afterEq), returns: mockReturns }
    const afterOrder = { range: vi.fn(() => afterRange) }
    const afterSelect = { order: vi.fn(() => afterOrder) }
    const from = vi.fn(() => ({ select: vi.fn(() => afterSelect) }))
    vi.mocked(supabaseForRequest).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest("table=orders"))
    expect(res.status).toBe(200)
  })
})
