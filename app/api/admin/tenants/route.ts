import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireRootOwner, isErrorResponse } from "@/lib/api-auth"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

function generatePassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let pwd = ""
  for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  return pwd + "A1"
}

const MASTER_URL = env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY


export async function DELETE(req: NextRequest) {
  try {
    const session = requireRootOwner(req)
    if (isErrorResponse(session)) return session

    const { slug } = await req.json()
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 })
    }

    const supabaseAdmin = createClient(MASTER_URL, SERVICE_KEY || "", {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await supabaseAdmin.from("tenants").delete().eq("slug", slug)
    if (error) {
      logger.error("Failed to delete tenant", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logger.info(`Tenant ${slug} deleted`)
    return NextResponse.json({ success: true, slug })
  } catch (e) {
    logger.error("Unexpected error deleting tenant", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`admin:tenants:${getClientIp(req)}`, { max: 20, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireRootOwner(req)
    if (isErrorResponse(session)) return session

    const body = await req.json()
    const { name, slug, plan_type: planType } = body

    if (!name || !slug) {
      return NextResponse.json({ error: "Missing required fields: name, slug" }, { status: 400 })
    }

    if (!SERVICE_KEY) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 })
    }

    const supabaseAdmin = createClient(MASTER_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const validPlan = ["starter", "pro", "elite"].includes(planType) ? planType : "starter"

    const { data: tenant, error: insertError } = await supabaseAdmin
      .from("tenants")
      .insert({
        slug,
        name,
        supabase_url: MASTER_URL,
        supabase_anon_key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        plan_type: validPlan,
        is_active: true,
      })
      .select("id, slug, name, plan_type")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
      }
      logger.error("Failed to create tenant", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const USERS = [
      { username: "admin",   role: "admin",   password: generatePassword() },
      { username: "cashier", role: "cashier", password: generatePassword() },
      { username: "chef",    role: "chef",    password: generatePassword() },
    ]

    const domain = `${slug}.app`
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingByEmail = new Map((existingUsers?.users || []).map((u) => [u.email, u.id]))

    const userResults = await Promise.all(
      USERS.map(async (u) => {
        const email = `${u.username}@${domain}`
        const existingId = existingByEmail.get(email)
        let userId: string

        if (existingId) {
          userId = existingId
          await supabaseAdmin.auth.admin.updateUserById(existingId, { password: u.password })
        } else {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: u.password,
            email_confirm: true,
            user_metadata: { username: u.username, role: u.role },
          })
          if (error || !data?.user) {
            return { username: u.username, status: "error", error: error?.message || "No user" }
          }
          userId = data.user.id
        }

        await supabaseAdmin.from("profiles").upsert({ id: userId, username: u.username, role: u.role })

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

        return { username: u.username, email, status: existingId ? "updated" : "created" }
      }),
    )

    return NextResponse.json({
      tenant,
      users: userResults,
      adminEmail: `admin@${domain}`,
    })
  } catch (e) {
    logger.error("Unexpected error creating tenant", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
