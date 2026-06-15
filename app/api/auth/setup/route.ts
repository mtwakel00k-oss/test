import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseSession } from "@/lib/tenant"
import { createHash } from "crypto"

const USERS = [
  { username: "admin",   role: "admin" },
  { username: "cashier", role: "cashier" },
  { username: "chef",    role: "chef" },
]

function generatePassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let pwd = ""
  for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  return pwd + "A1"
}

function getDevPassword(username: string, slug: string): string {
  const hash = process.env.DEV_PASSWORD_HASH
  if (!hash) return generatePassword()
  // Use hash as seed for deterministic password per username+slug
  const seed = createHash("sha256").update(`${username}:${slug}:${hash}`).digest("hex")
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let pwd = ""
  for (let i = 0; i < 12; i++) {
    const idx = parseInt(seed.slice(i * 2, i * 2 + 2), 16) % chars.length
    pwd += chars.charAt(idx)
  }
  return pwd + "A1"
}

export async function POST(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const slug: string = body?.slug
    if (!slug) {
      return NextResponse.json({ error: "Missing slug in request body" }, { status: 400 })
    }
    const passwordsInput = body?.passwords as Record<string, string> | undefined

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local" }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Look up tenant
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, slug")
      .eq("slug", slug)
      .single()
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    const domain = `${slug}.app`
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingByEmail = new Map((existingUsers?.users || []).map((u) => [u.email, u.id]))

    const results = await Promise.all(
      USERS.map(async (u) => {
        const email = `${u.username}@${domain}`
        const password = passwordsInput?.[u.username] || getDevPassword(u.username, slug)
        const existingId = existingByEmail.get(email)

        let userId: string
        if (existingId) {
          userId = existingId
          const { error } = await supabaseAdmin.auth.admin.updateUserById(existingId, { password })
          if (error) return { username: u.username, status: "error", error: error.message }
        } else {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { username: u.username, role: u.role },
          })
          if (error || !data?.user) {
            return { username: u.username, status: "error", error: error?.message || "No user returned" }
          }
          userId = data.user.id
        }

        // Update profile
        await supabaseAdmin.from("profiles").upsert({ id: userId, username: u.username, role: u.role })

        // Link to tenant
        const { data: existingLink } = await supabaseAdmin
          .from("restaurant_users")
          .select("id")
          .eq("user_id", userId)
          .eq("restaurant_id", tenant.id)
          .maybeSingle()

        if (!existingLink) {
          await supabaseAdmin.from("restaurant_users").insert({
            user_id: userId,
            restaurant_id: tenant.id,
            role: u.role,
          })
        }

        return { username: u.username, email, password: u.username === "admin" ? password : undefined, status: existingId ? "updated" : "created" }
      }),
    )

    return NextResponse.json({ slug, results })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Setup failed" }, { status: 500 })
  }
}
