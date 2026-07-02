import { describe, it, expect, vi, beforeEach } from "vitest"

const mockInsert = vi.fn()
const mockDeadLetterInsert = vi.fn()
let callCount = 0
const mockFrom = vi.fn(() => {
  callCount++
  if (callCount === 1) return { insert: mockInsert }
  return { insert: mockDeadLetterInsert }
})

vi.mock("@/lib/tenant", () => ({
  supabaseForRequestAdmin: vi.fn(() => Promise.resolve({ from: mockFrom })),
  parseSession: vi.fn(() => ({ role: "admin", email: "admin@test.com", slug: "burger-house" })),
}))

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn((req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { recordAuditEvent } from "@/lib/audit-events"

describe("recordAuditEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    callCount = 0
  })

  it("redacts sensitive fields in new_data", async () => {
    mockInsert.mockResolvedValue({ error: null })

    const req = new Request("http://localhost:3000/api/test", {
      headers: { "x-request-id": "test-request-123" },
    })

    await recordAuditEvent(req as never, {
      event_type: "staff.created" as never,
      operation: "CREATE",
      new_data: { username: "testuser", password: "supersecret", role: "cashier" },
      old_data: null,
    })

    expect(mockInsert).toHaveBeenCalledTimes(1)
    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted.new_data).toEqual({
      username: "testuser",
      password: "[REDACTED]",
      role: "cashier",
    })
  })

  it("redacts tokens in old_data", async () => {
    mockInsert.mockResolvedValue({ error: null })

    const req = new Request("http://localhost:3000/api/test")

    await recordAuditEvent(req as never, {
      event_type: "driver.token_regenerated" as never,
      operation: "UPDATE",
      old_data: { name: "Old Driver", token: "old-secret-token" },
      new_data: { name: "New Driver" },
    })

    expect(mockInsert).toHaveBeenCalledTimes(1)
    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted.old_data).toEqual({
      name: "Old Driver",
      token: "[REDACTED]",
    })
  })

  it("resolves actor from session", async () => {
    mockInsert.mockResolvedValue({ error: null })

    const req = new Request("http://localhost:3000/api/test", {
      headers: { cookie: "session=valid-cookie" },
    })

    await recordAuditEvent(req as never, {
      event_type: "product.updated" as never,
      operation: "UPDATE",
      new_data: { name: "Burger" },
    })

    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted.actor_email).toBe("admin@test.com")
    expect(inserted.actor_role).toBe("admin")
  })

  it("writes to dead-letter table on insert failure", async () => {
    mockInsert.mockResolvedValue({ error: { message: "Database write failed" } })
    mockDeadLetterInsert.mockResolvedValue({ error: null })

    const req = new Request("http://localhost:3000/api/test")

    await recordAuditEvent(req as never, {
      event_type: "product.updated" as never,
      operation: "UPDATE",
      new_data: { name: "Test" },
    })

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockDeadLetterInsert).toHaveBeenCalledTimes(1)
    const dlPayload = mockDeadLetterInsert.mock.calls[0][0]
    expect(dlPayload.error_message).toBe("Database write failed")
  })

  it("resolves ip and user-agent from request", async () => {
    mockInsert.mockResolvedValue({ error: null })

    const req = new Request("http://localhost:3000/api/test", {
      headers: {
        "x-forwarded-for": "192.168.1.1",
        "user-agent": "TestAgent/1.0",
        "x-request-id": "req-456",
      },
    })

    await recordAuditEvent(req as never, {
      event_type: "order.created" as never,
      operation: "CREATE",
    })

    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted.ip_address).toBe("192.168.1.1")
    expect(inserted.user_agent).toBe("TestAgent/1.0")
    expect(inserted.request_id).toBe("req-456")
  })
})
