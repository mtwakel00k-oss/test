import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClientForRouteHandler } from "@/lib/supabase-server"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import { encryptSession } from "@/lib/session-crypto"
import { loginSchema, validationError } from "@/lib/validations"
import { parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { recordAuditEvent, EVENT_TYPES } from "@/lib/audit-events"
import { env } from "@/lib/env"

const VALID_ROLES = ["cashier", "chef", "admin", "owner"]

const SECURE = process.env.NODE_ENV === "production"

export async function GET(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.role && VALID_ROLES.includes(session.role)) {
    return NextResponse.json({
      authed: true,
      role: session.role,
      email: session.email,
      slug: session.slug,
    })
  }

  const sessionCookie = req.cookies.get("session")
  if (sessionCookie) {
    return NextResponse.json({ authed: false }, { status: 401 })
  }

  const supabase = createClientForRouteHandler(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ authed: false }, { status: 401 })
  const role = user.user_metadata?.role as string
  if (!role || !VALID_ROLES.includes(role)) return NextResponse.json({ authed: false }, { status: 401 })
  return NextResponse.json({ authed: true, role })
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkRateLimit(`login:${ip}`, { max: 20, windowMs: 900_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)
    const { username, password, slug } = parsed.data
    logger.debug("[login] POST received", { username: username.replace(/./g, "*"), slug, hasPassword: !!password })

    // Per-email rate-limit (5 attempts / 15 min per email)
    const emailRl = await checkRateLimit(`login:email:${username.toLowerCase().trim()}`, { max: 5, windowMs: 900_000 })
    if (!emailRl.allowed) return rateLimitResponse(emailRl.resetAt)
    if (!env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Server config error" }, { status: 500 })

    const masterSb = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY)

    // ── Root admin (owner) ──────────────────────────────────────
    if (username.endsWith("@root.app") || slug === "__root__") {
      const email = username.includes("@") ? username.toLowerCase().trim() : `${username}@root.app`
      const rawSb = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL!,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data, error: authError } = await rawSb.auth.signInWithPassword({ email, password })
      if (authError) {
        recordAuditEvent(req, { event_type: EVENT_TYPES.AUTH_LOGIN_FAILED, operation: "LOGIN", outcome: "failure", metadata: { username: username.replace(/./g, "*"), slug: "__root__" } }).catch(() => {})
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
      }

      const userId = data.user?.id
      if (!userId) {
        recordAuditEvent(req, { event_type: EVENT_TYPES.AUTH_LOGIN_FAILED, operation: "LOGIN", outcome: "failure", metadata: { username: username.replace(/./g, "*"), slug: "__root__" } }).catch(() => {})
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
      }

      const role = data.user?.user_metadata?.role
      if (role !== "owner") {
        recordAuditEvent(req, { event_type: EVENT_TYPES.AUTH_LOGIN_FAILED, operation: "LOGIN", outcome: "failure", metadata: { username: username.replace(/./g, "*"), slug: "__root__" } }).catch(() => {})
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
      }

      const res = NextResponse.json({ ok: true, slug: "" })
      res.cookies.set("session", encryptSession({ email, role: "owner", slug: "" }), {
        httpOnly: true, secure: SECURE, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/",
      })
      logger.debug("[login] Owner login successful")
      recordAuditEvent(req, { event_type: EVENT_TYPES.AUTH_LOGIN_SUCCESS, operation: "LOGIN", outcome: "success", metadata: { slug: "__root__" } }).catch(() => {})
      return res
    }

    const tenantSlug = slug
    let tenantId: string | null = null

    // ── Determine tenant ────────────────────────────────────────
    if (tenantSlug) {
      logger.debug("[login] Looking up tenant by slug:", tenantSlug)
      const { data: tenant, error: tenantError } = await masterSb
        .from("tenants")
        .select("id, slug, name, supabase_url, supabase_anon_key")
        .eq("slug", tenantSlug)
        .single()

      if (tenantError || !tenant) {
        logger.debug("[login] Tenant not found by slug:", tenantSlug)
        recordAuditEvent(req, { event_type: EVENT_TYPES.AUTH_LOGIN_FAILED, operation: "LOGIN", outcome: "failure", metadata: { slug: tenantSlug, username: username.replace(/./g, "*") } }).catch(() => {})
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
      }
      tenantId = tenant.id
      logger.debug("[login] Found tenant by slug:", { id: tenantId })
    } else {
      return NextResponse.json({ error: "Provide a restaurant slug" }, { status: 400 })
    }

    const isEmail = username.includes("@")
    const email = isEmail
      ? username.toLowerCase().trim()
      : `${username}@${tenantSlug}.app`

    logger.debug("[login] Attempting signInWithPassword")

    // Use a fresh client (no SSR middleware) to avoid existing session cookie conflicts
    const rawSb = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error: authError } = await rawSb.auth.signInWithPassword({ email, password })
    if (authError) {
      logger.debug("[login] signInWithPassword failed")
      recordAuditEvent(req, { event_type: EVENT_TYPES.AUTH_LOGIN_FAILED, operation: "LOGIN", outcome: "failure", metadata: { slug: tenantSlug, username: username.replace(/./g, "*") } }).catch(() => {})
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const userId = data.user?.id
    if (!userId) {
      logger.debug("[login] No user ID after successful signIn")
      recordAuditEvent(req, { event_type: EVENT_TYPES.AUTH_LOGIN_FAILED, operation: "LOGIN", outcome: "failure", metadata: { slug: tenantSlug, username: username.replace(/./g, "*") } }).catch(() => {})
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    logger.debug("[login] signInWithPassword succeeded:", { userId })

    // Verify user is linked to this tenant
    const { data: membership } = await masterSb
      .from("restaurant_users")
      .select("role")
      .eq("user_id", userId)
      .eq("restaurant_id", tenantId)
      .maybeSingle()

    if (!membership || !VALID_ROLES.includes(membership.role)) {
      logger.debug("[login] Membership verification failed:", { userId, tenantId })
      recordAuditEvent(req, { event_type: EVENT_TYPES.AUTH_LOGIN_FAILED, operation: "LOGIN", outcome: "failure", metadata: { slug: tenantSlug, username: username.replace(/./g, "*") } }).catch(() => {})
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    logger.debug("[login] Membership verified:", { role: membership.role })

    // ── Set session cookie (encrypted) ────────────────────────
    const res = NextResponse.json({ ok: true, slug: tenantSlug })
    res.cookies.set("session", encryptSession({
      email: data.user?.email,
      role: membership.role,
      slug: tenantSlug,
    }), {
      httpOnly: true,
      secure: SECURE,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    logger.debug("[login] Login successful, cookies set")
    recordAuditEvent(req, { event_type: EVENT_TYPES.AUTH_LOGIN_SUCCESS, operation: "LOGIN", outcome: "success" }).catch(() => {})
    return res
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const name = e instanceof Error ? e.name : "Unknown"
    logger.debug("[login] Unexpected error:", { name })
    logger.error("Login error", e)
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ error: message, name }, { status: 500 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
