import { describe, it, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  vi.resetModules()
})

describe("env", () => {
  it("reads NEXT_PUBLIC_SUPABASE_URL from process.env", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
    const { env } = await import("@/lib/env")
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co")
  })

  it("defaults to empty string when env var is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    const { env } = await import("@/lib/env")
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("")
  })

  it("all NODE_ENV values are accessible", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { env } = await import("@/lib/env")
    expect(env.NODE_ENV).toBe("production")
  })
})
