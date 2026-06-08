import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { cache } from "react"
import { logger } from "@/lib/logger"

export interface TenantConfig {
  id: string
  slug: string
  name: string
  supabase_url: string
  supabase_anon_key: string
  is_active: boolean
  created_at: string
  logo_url: string | null
  plan_type?: string | null
}

export class TenantMismatchError extends Error {
  constructor(sessionSlug: string, requestSlug: string) {
    super(`Tenant mismatch: session="${sessionSlug}" request="${requestSlug}"`)
    this.name = "TenantMismatchError"
  }
}

const MASTER_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MASTER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FALLBACK_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (typeof window === "undefined" && !MASTER_KEY) {
  logger.warn("SUPABASE_SERVICE_ROLE_KEY not set — master client will use anon key (RLS-restricted)")
}

const _masterClient: SupabaseClient = createClient(
  MASTER_URL,
  MASTER_KEY || FALLBACK_KEY!
)

const configCache = new Map<string, { data: TenantConfig; expiry: number }>()
const CACHE_TTL = 10_000

export function invalidateTenantConfig(slug: string): void {
  configCache.delete(slug)
}

export async function getTenantConfig(slug: string): Promise<TenantConfig | null> {
  const cached = configCache.get(slug)
  if (cached && cached.expiry > Date.now()) return cached.data

  const { data, error } = await (_masterClient.from("tenants"))
    .select("id, slug, name, supabase_url, supabase_anon_key, is_active, created_at, logo_url, plan_type")
    .eq("slug", slug)
    .maybeSingle()

  if (error || !data) {
    configCache.set(slug, { data: null as unknown as TenantConfig, expiry: Date.now() + 10_000 })
    if (error) logger.error("getTenantConfig query failed", error)
    return null
  }

  configCache.set(slug, { data, expiry: Date.now() + CACHE_TTL })
  return data
}

export const getTenantConfigRSC = cache(getTenantConfig)

export function createTenantClient(config: TenantConfig): SupabaseClient {
  return createClient(config.supabase_url, config.supabase_anon_key)
}

export async function supabaseForSlug(slug: string): Promise<SupabaseClient> {
  const config = await getTenantConfig(slug)
  if (!config) throw new Error(`Tenant not found: ${slug}`)
  return createTenantClient(config)
}

export const supabaseForSlugRSC = cache(async (slug: string) => {
  return supabaseForSlug(slug)
})

function getSlugFromHeaderOrReferer(req: Request): string {
  const header = req.headers.get("x-tenant-slug") || ""
  if (header) return header
  const referer = req.headers.get("referer") || ""
  const m = referer.match(/\/([^/]+)\/(?:admin|menu|pos|kitchen|order|login)\b/)
  if (m) {
    const slug = m[1]
    const knownPages = new Set(["admin", "menu", "pos", "kitchen", "order", "login"])
    return knownPages.has(slug) ? "" : slug
  }
  return ""
}

export async function supabaseForRequest(req: Request): Promise<SupabaseClient> {
  const session = parseSession(req.headers.get("cookie") || "")
  const requestSlug = getSlugFromHeaderOrReferer(req)

  if (session.slug && requestSlug && session.slug !== requestSlug) {
    throw new TenantMismatchError(session.slug, requestSlug)
  }

  const slug = session.slug || requestSlug
  if (slug) {
    const config = await getTenantConfig(slug)
    if (config) {
      return createTenantClient(config)
    }
  }

  return createClient(MASTER_URL, MASTER_KEY || FALLBACK_KEY!)
}

let _browserMasterClient: SupabaseClient | null = null
let _browserTenantClient: SupabaseClient | null = null
let _browserTenantKey = ""

function readTenantConfigFromDOM(): { url: string; key: string; slug?: string } | null {
  if (typeof window === "undefined") return null
  const el = document.getElementById("tenant-config")
  if (!el?.textContent) return null
  try { return JSON.parse(el.textContent) } catch { return null }
}

export function browserSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    return createClient(MASTER_URL, MASTER_KEY || FALLBACK_KEY!)
  }

  const injected = readTenantConfigFromDOM()
  if (injected?.url && injected?.key && !injected.key.startsWith("sb_secret_")) {
    const cacheKey = `${injected.url}:${injected.key}`
    if (!_browserTenantClient || _browserTenantKey !== cacheKey) {
      _browserTenantClient = createBrowserClient(injected.url, injected.key)
      _browserTenantKey = cacheKey
    }
    return _browserTenantClient
  }

  if (!_browserMasterClient) {
    _browserMasterClient = createBrowserClient(
      MASTER_URL,
      FALLBACK_KEY!
    )
  }
  return _browserMasterClient
}

async function lookupTenantByEmail(email: string): Promise<TenantConfig | null> {
  const domainMap: Record<string, string> = {
    "burgerhouse.app": "burger-house",
  }
  const domain = email.split("@")[1]?.toLowerCase()
  const slug = domainMap[domain] || domain?.split(".")[0]
  if (!slug) return null

  const { data, error } = await (_masterClient.from("tenants"))
    .select("id, slug, name, supabase_url, supabase_anon_key, is_active, created_at, logo_url")
    .eq("slug", slug)
    .maybeSingle()
  if (error || !data) {
    if (error) logger.error("lookupTenantByEmail query failed", error)
    return null
  }
  configCache.set(data.slug, { data, expiry: Date.now() + CACHE_TTL })
  return data
}
export { lookupTenantByEmail }

export async function getAllSlugs(): Promise<string[]> {
  try {
    const { data, error } = await (_masterClient.from("tenants")).select("slug")
    if (error) {
      logger.error("getAllSlugs query failed", error)
      return []
    }
    return (data || []).map((r: { slug: string }) => r.slug)
  } catch (e) {
    logger.error("getAllSlugs unexpected error", e)
    return []
  }
}

export const supabase = browserSupabase

export function resetTenantClient() {
  _browserMasterClient = null
  _browserTenantClient = null
  _browserTenantKey = ""
}

export function parseSession(cookieHeader: string): {
  role?: string
  slug?: string
} {
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]*)/)
  if (!match) return {}
  try {
    return JSON.parse(decodeURIComponent(match[1]))
  } catch (e) {
    logger.error("Failed to parse session from cookie header", e)
    return {}
  }
}

function getSlugFromClientURL(): string {
  if (typeof window === "undefined") return ""
  const parts = window.location.pathname.split("/").filter(Boolean)
  const knownPages = new Set(["admin", "menu", "pos", "kitchen", "order", "login"])
  if (parts.length >= 2 && !knownPages.has(parts[0]) && !parts[0].includes(".")) {
    return parts[0]
  }
  return ""
}

export function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  if (typeof window === "undefined") return fetch(path, init)

  let slug = getSlugFromClientURL()
  if (!slug) {
    slug = readTenantConfigFromDOM()?.slug || ""
  }
  if (!slug || path.startsWith("/api/auth/")) return fetch(path, init)

  const headers = new Headers(init?.headers)
  headers.set("x-tenant-slug", slug)
  return fetch(path, { ...init, headers })
}

export function isTenantMismatch(e: unknown): NextResponse | null {
  if (e instanceof TenantMismatchError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return null
}
