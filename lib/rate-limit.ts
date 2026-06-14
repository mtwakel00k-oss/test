import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

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

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

const DEFAULTS: RateLimitConfig = { max: 30, windowMs: FIVE_MIN }

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function upstashCommand<T = unknown>(command: (string | number)[]): Promise<T | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null
  try {
    const res = await fetch(UPSTASH_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      body: JSON.stringify(command),
    })
    if (!res.ok) {
      logger.warn("Upstash rate limit request failed", { status: res.status })
      return null
    }
    const data = await res.json() as { result?: T }
    return data.result ?? null
  } catch (e) {
    logger.warn("Upstash rate limit error", e)
    return null
  }
}

async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult | null> {
  const windowId = Math.floor(Date.now() / config.windowMs)
  const redisKey = `rl:${key}:${windowId}`
  const resetAt = (windowId + 1) * config.windowMs

  const count = await upstashCommand<number>(["INCR", redisKey])
  if (count == null) return null

  if (count === 1) {
    await upstashCommand(["PEXPIRE", redisKey, config.windowMs])
  }

  if (count > config.max) {
    return { allowed: false, remaining: 0, resetAt }
  }
  return { allowed: true, remaining: config.max - count, resetAt }
}

function checkRateLimitMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()

  if (store.size > 10_000) {
    for (const [k, v] of store) {
      if (now >= v.resetAt) store.delete(k)
    }
  }

  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: config.max - 1, resetAt }
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count += 1
  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt }
}

/** Distributed rate limit — uses Upstash Redis when configured, else in-memory. */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULTS,
): Promise<RateLimitResult> {
  const redis = await checkRateLimitRedis(key, config)
  if (redis) return redis
  return checkRateLimitMemory(key, config)
}

export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(retryAfter, 1)),
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
