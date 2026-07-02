import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/tenant", () => ({
  supabaseForRequestAdmin: vi.fn(),
  supabaseForRequest: vi.fn(),
  isTenantMismatch: vi.fn(() => null),
  parseSession: vi.fn(() => ({ role: "admin", email: "admin@test.com", slug: "burger-house" })),
  getTenantConfig: vi.fn(() => Promise.resolve({ plan_type: "elite" })),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/audit-events", () => ({
  recordAuditEvent: vi.fn(() => Promise.resolve()),
  EVENT_TYPES: {
    AUDIT_LOG_VIEWED: "audit_log.viewed",
  },
}))

import { GET } from "@/app/api/admin/audit-log/route"
import { NextRequest } from "next/server"
import { supabaseForRequestAdmin } from "@/lib/tenant"

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

  it("returns audit events", async () => {
    const mockData = [
      { id: "1", tenant_slug: "burger-house", event_type: "product.updated", table_name: "produits", record_id: "42", operation: "UPDATE", outcome: "success", actor_email: "admin@test.com", actor_role: "admin", ip_address: "127.0.0.1", user_agent: "", request_id: null, old_data: null, new_data: { nom: "Pizza" }, metadata: null, created_at: "2025-06-01T00:00:00Z", seq: 1, prev_hash: "", row_hash: "abc123" },
    ]
    const rangeResult = makeRangeReturns(mockData, 1)
    const orderResult = { range: vi.fn(() => rangeResult) }
    const selectResult = { order: vi.fn(() => orderResult) }
    const from = vi.fn(() => ({ select: vi.fn(() => selectResult) }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.count).toBe(1)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].seq).toBe(1)
  })

  it("supports limit and offset params", async () => {
    const rangeResult = makeRangeReturns([], 0)
    const orderResult = { range: vi.fn(() => rangeResult) }
    const selectResult = { order: vi.fn(() => orderResult) }
    const from = vi.fn(() => ({ select: vi.fn(() => selectResult) }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest("limit=50&offset=10"))
    expect(res.status).toBe(200)
  })

  it("rejects unauthorized", async () => {
    const { parseSession } = await import("@/lib/tenant")
    vi.mocked(parseSession).mockReturnValueOnce({ role: "cashier", email: "c@t.com", slug: "bh" })

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it("filters by event_type", async () => {
    const mockReturns = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
    const afterEq = { returns: mockReturns }
    const afterRange = { eq: vi.fn(() => afterEq), returns: mockReturns }
    const afterOrder = { range: vi.fn(() => afterRange) }
    const afterSelect = { order: vi.fn(() => afterOrder) }
    const from = vi.fn(() => ({ select: vi.fn(() => afterSelect) }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest("event_type=staff.created"))
    expect(res.status).toBe(200)
  })

  it("filters by outcome", async () => {
    const mockReturns = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
    const afterEq = { returns: mockReturns }
    const afterRange = { eq: vi.fn(() => afterEq), returns: mockReturns }
    const afterOrder = { range: vi.fn(() => afterRange) }
    const afterSelect = { order: vi.fn(() => afterOrder) }
    const from = vi.fn(() => ({ select: vi.fn(() => afterSelect) }))
    vi.mocked(supabaseForRequestAdmin).mockResolvedValue({ from } as never)

    const res = await GET(makeRequest("outcome=failure"))
    expect(res.status).toBe(200)
  })
})
