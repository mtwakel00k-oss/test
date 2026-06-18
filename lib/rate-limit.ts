import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

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

const UPSTASH_URL = env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = env.UPSTASH_REDIS_REST_TOKEN

const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let _sbClient: ReturnType<typeof createClient> | null = null
function getSbClient() {
  if (!_sbClient && SB_URL && SB_KEY) {
    _sbClient = createClient(SB_URL, SB_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _sbClient
}

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

async function checkRateLimitSupabase(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult | null> {
  const sb = getSbClient()
  if (!sb) return null

  const now = Date.now()
  const resetAt = Math.ceil(now / config.windowMs) * config.windowMs + config.windowMs

  try {
    // Try to insert a new row — if key exists, increment count
    const { data: existing } = await sb
      .from("rate_limits")
      .select("count, window_start")
      .eq("key", key)
      .maybeSingle<{ count: number; window_start: string }>()

    if (!existing || new Date(existing.window_start).getTime() < now - config.windowMs) {
      // No row or window expired — upsert with fresh count
      const { error } = await sb
        .from("rate_limits")
        .upsert({ key, count: 1, window_start: new Date(now).toISOString() } as never, { onConflict: "key" })
      if (error) {
        logger.warn("Supabase rate limit upsert failed", error)
        return null
      }
      return { allowed: true, remaining: config.max - 1, resetAt }
    }

    if (existing.count >= config.max) {
      return { allowed: false, remaining: 0, resetAt }
    }

    // Increment count
    const { error: updErr } = await sb
      .from("rate_limits")
      .update({ count: existing.count + 1 } as never)
      .eq("key", key)
    if (updErr) {
      logger.warn("Supabase rate limit update failed", updErr)
      return null
    }

    return { allowed: true, remaining: config.max - (existing.count + 1), resetAt }
  } catch (e) {
    logger.warn("Supabase rate limit error", e)
    return null
  }
}

/** Distributed rate limit — uses Upstash Redis first, then Supabase table fallback. */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULTS,
): Promise<RateLimitResult> {
  const redis = await checkRateLimitRedis(key, config)
  if (redis) return redis
  const supabase = await checkRateLimitSupabase(key, config)
  if (supabase) return supabase
  return { allowed: true, remaining: config.max, resetAt: Date.now() + config.windowMs }
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
