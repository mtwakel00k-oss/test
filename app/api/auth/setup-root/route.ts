import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

const DEV_ROOT_PASSWORD = process.env.DEV_ROOT_PASSWORD

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not available" }, { status: 404 })
    }

    const setupSecret = process.env.SETUP_SECRET
    const authHeader = req.headers.get("authorization")
    if (setupSecret && authHeader !== `Bearer ${setupSecret}`) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const rl = await checkRateLimit(`setup-root:${getClientIp(req)}`, { max: 5, windowMs: 900_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const body = await req.json().catch(() => ({}))
    const username = body?.username || "root"
    const password = body?.password || DEV_ROOT_PASSWORD

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must be 8+ chars with uppercase and number" }, { status: 400 })
    }

    const email = `${username}@root.app`

    // Check if root admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existing = existingUsers?.users.find(u => u.email === email)

    let userId: string
    if (existing) {
      userId = existing.id
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        user_metadata: { username, role: "owner" },
      })
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, role: "owner" },
      })
      if (error || !data?.user) {
        return NextResponse.json({ error: error?.message || "Failed to create user" }, { status: 500 })
      }
      userId = data.user.id
    }

    // Upsert profile
    await supabaseAdmin.from("profiles").upsert({ id: userId, username, role: "owner" })

    return NextResponse.json({
      success: true,
      email,
      username,
      role: "owner",
      status: existing ? "updated" : "created",
      note: "Login at /login with any slug (or no slug) using email: " + email,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Setup failed" }, { status: 500 })
  }
}
