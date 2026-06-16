import { NextResponse } from "next/server"

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

const FIVE_MIN = 300_000

export interface RateLimitConfig {
  max: number
  windowMs: number
}

const DEFAULTS: RateLimitConfig = { max: 30, windowMs: FIVE_MIN }

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULTS,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs }
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count += 1
  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt }
}

export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": String(resetAt),
      },
    },
  )
}

export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown"
}
