import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"

function masterSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function getSlug(req: NextRequest): string | null {
  const header = req.headers.get("x-tenant-slug")
  if (header) return header
  const session = parseSession(req.headers.get("cookie") || "")
  return session.slug ?? null
}

export async function GET(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.role !== "admin" && session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const slug = getSlug(req)
  if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  const { data: tenant } = await masterSb().from("tenants").select("id").eq("slug", slug).single()
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 })

  const { data: users } = await masterSb().from("restaurant_users")
    .select("user_id, role, profiles!inner(id, username)")
    .eq("restaurant_id", tenant.id)
    .eq("role", "cashier")

  const list = (users || []).map((u: unknown) => {
    const row = u as { user_id: string; role: string; profiles: { id: string; username: string } | { id: string; username: string }[] }
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return { id: row.user_id, username: profile?.username || row.user_id, role: row.role }
  })
  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.role !== "admin" && session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const slug = getSlug(req)
  if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: "Missing username or password" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const { data: tenant } = await masterSb().from("tenants").select("id").eq("slug", slug).single()
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 })

  const domain = `${slug}.app`
  const email = `${username}@${domain}`

  let userId: string
  const { data: createData, error: createError } = await masterSb().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, role: "cashier" },
  })
  if (createData?.user) {
    userId = createData.user.id
  } else if (createError?.message?.includes("already exists")) {
    const { data: listData } = await masterSb().auth.admin.listUsers()
    const found = listData?.users?.find((u: { email?: string }) => u.email === email)
    if (!found) return NextResponse.json({ error: "User exists but could not be found" }, { status: 500 })
    userId = found.id
    await masterSb().auth.admin.updateUserById(userId, { password }).catch(() => {})
  } else {
    return NextResponse.json({ error: createError?.message || "Failed to create user" }, { status: 500 })
  }

  await masterSb().from("profiles").upsert({ id: userId, username, role: "cashier" })

  const { data: existingLink } = await masterSb().from("restaurant_users")
    .select("id").eq("user_id", userId).eq("restaurant_id", tenant.id).maybeSingle()
  if (!existingLink) {
    await masterSb().from("restaurant_users").insert({ user_id: userId, restaurant_id: tenant.id, role: "cashier" })
  }

  await masterSb().from("restaurant_staff").upsert({
    tenant_slug: slug,
    name: username,
    role: "cashier",
    is_active: true,
  }).catch((err: Error) => {
    logger.warn("Failed to sync to restaurant_staff (table may not exist)", { error: err.message })
  })

  logger.info("Cashier created", { username, slug })
  return NextResponse.json({ id: userId, username, role: "cashier" })
}

export async function DELETE(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (session.role !== "admin" && session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const slug = getSlug(req)
  if (!slug) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("user_id")
  if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 })

  const { data: tenant } = await masterSb().from("tenants").select("id").eq("slug", slug).single()
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 })

  await masterSb().from("restaurant_users").delete().eq("user_id", userId).eq("restaurant_id", tenant.id)

  const { data: profile } = await masterSb().from("profiles").select("username").eq("id", userId).maybeSingle()
  if (profile?.username) {
    await masterSb().from("restaurant_staff").update({ is_active: false })
      .eq("tenant_slug", slug).eq("name", profile.username).catch(() => {})
  }

  logger.info("Cashier removed", { userId, slug })
  return NextResponse.json({ success: true })
}
