import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClientForRouteHandlerWithResponse, createClientForRouteHandler } from "@/lib/supabase-server"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

const VALID_ROLES = ["cashier", "chef", "admin", "owner"]

const SECURE = process.env.NODE_ENV === "production"

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters"
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter"
  if (!/[0-9]/.test(password)) return "Password must contain at least one number"
  return null
}

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value)
      if (session.role && VALID_ROLES.includes(session.role)) {
        return NextResponse.json({ authed: true, role: session.role, email: session.email, slug: session.slug })
      }
    } catch {}
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
    const rl = checkRateLimit(`login:${ip}`, { max: 20, windowMs: 900_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { username, password, slug: reqSlug } = await req.json()
    console.log("[login] POST received", { username, slug: reqSlug, hasPassword: !!password })

    if (!username || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Server config error" }, { status: 500 })

    const masterSb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // ── Root admin (owner) ──────────────────────────────────────
    if (username.endsWith("@root.app") || reqSlug === "__root__") {
      const email = username.includes("@") ? username.toLowerCase().trim() : `${username}@root.app`
      const res = NextResponse.json({ ok: true, slug: "" })
      const supabase = createClientForRouteHandlerWithResponse(req, res)
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

      const userId = data.user?.id
      if (!userId) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

      const role = data.user?.user_metadata?.role
      if (role !== "owner") return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

      res.cookies.set("session", JSON.stringify({ email, role: "owner", slug: "" }), {
        httpOnly: true, secure: SECURE, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/",
      })
      console.log("[login] Owner login successful:", { email })
      return res
    }

    let tenantSlug = reqSlug
    let tenantId: string | null = null

    // ── Determine tenant ────────────────────────────────────────
    if (tenantSlug) {
      console.log("[login] Looking up tenant by slug:", tenantSlug)
      const { data: tenant, error: tenantError } = await masterSb
        .from("tenants")
        .select("id, slug, name, supabase_url, supabase_anon_key")
        .eq("slug", tenantSlug)
        .single()

      if (tenantError || !tenant) {
        console.log("[login] Tenant not found by slug:", tenantSlug)
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
      }
      tenantId = tenant.id
      console.log("[login] Found tenant by slug:", { id: tenantId, slug: tenant.slug })
    } else {
      // No slug provided — try to find tenant from email address
      if (!username.includes("@")) {
        console.log("[login] No slug and username is not an email — cannot resolve tenant")
        return NextResponse.json({ error: "Provide a restaurant slug or use your email" }, { status: 400 })
      }

      const email = username.toLowerCase().trim()
      console.log("[login] No slug provided; looking up tenant by email:", email)

      await masterSb
        .from("restaurant_users")
        .select("restaurant_id, role")
        .eq("user_id", email)
        .maybeSingle()

      // restaurant_users is usually keyed by UUID, so fall back to searching auth.users
      let resolvedUserId: string | null = null
      const { data: authUsers, error: authListError } = await masterSb.auth.admin.listUsers()
      if (!authListError && authUsers) {
        const foundUser = authUsers.users.find(u => u.email === email)
        if (foundUser) {
          resolvedUserId = foundUser.id
          console.log("[login] Found auth user by email:", { id: resolvedUserId })
        }
      }

      if (!resolvedUserId) {
        console.log("[login] No auth user found with email:", email)
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
      }

      const { data: membership } = await masterSb
        .from("restaurant_users")
        .select("restaurant_id, role")
        .eq("user_id", resolvedUserId)
        .maybeSingle()

      if (!membership) {
        console.log("[login] User not linked to any tenant:", resolvedUserId)
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
      }

      tenantId = membership.restaurant_id
      console.log("[login] Found tenant ID from membership:", tenantId)

      // Now get the slug
      const { data: tenant } = await masterSb
        .from("tenants")
        .select("slug")
        .eq("id", tenantId)
        .single()

      if (!tenant) {
        console.log("[login] Tenant not found by ID:", tenantId)
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
      }
      tenantSlug = tenant.slug
      console.log("[login] Resolved tenant slug:", tenantSlug)
    }

    const pwdError = validatePassword(password)
    if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 })

    const isEmail = username.includes("@")
    const normalizedSlug = tenantSlug!.replace(/-/g, "")
    const email = isEmail
      ? username.toLowerCase().trim()
      : `${username}@${normalizedSlug}.app`

    console.log("[login] Attempting signInWithPassword:", { email })

    const res = NextResponse.json({ ok: true, slug: tenantSlug })
    const supabase = createClientForRouteHandlerWithResponse(req, res)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      console.log("[login] signInWithPassword failed:", authError.message)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const userId = data.user?.id
    if (!userId) {
      console.log("[login] No user ID after successful signIn")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[login] signInWithPassword succeeded:", { userId, email: data.user?.email })

    // Verify user is linked to this tenant
    const { data: membership } = await masterSb
      .from("restaurant_users")
      .select("role")
      .eq("user_id", userId)
      .eq("restaurant_id", tenantId)
      .maybeSingle()

    if (!membership || !VALID_ROLES.includes(membership.role)) {
      console.log("[login] Membership verification failed:", { userId, tenantId })
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[login] Membership verified:", { role: membership.role })

    // ── Set session cookie ─────────────────────────────────────
    res.cookies.set("session", JSON.stringify({
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

    console.log("[login] Login successful, cookies set")
    return res
  } catch (e) {
    console.log("[login] Unexpected error:", e)
    logger.error("Login error", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
