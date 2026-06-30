import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 60, resetAt: Date.now() + 60000 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitResponse: vi.fn(() => new Response("Rate limited", { status: 429 })),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}))

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://master.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "mock-service-key",
    SETUP_SECRET: "setup-secret",
    SESSION_ENCRYPTION_KEY: "",
    NODE_ENV: "test",
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

import { NextRequest } from "next/server"

function makePost(urlStr: string, body: unknown, cookie?: string): NextRequest {
  const url = new URL(urlStr)
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

describe("Auth API", () => {
  describe("POST /api/auth/setup-root", () => {
    it("requires SETUP_SECRET returning 403", async () => {
      const handler = (await import("@/app/api/auth/setup-root/route")).POST
      const req = makePost("http://localhost:3000/api/auth/setup-root", {})
      const res = await handler(req)
      expect(res.status).toBe(403)
    })
  })
})
