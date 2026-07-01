import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

export async function PATCH(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie") || "")
  if (!session.email || !session.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { password } = await req.json()
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }
  if (!/[A-Z]/.test(password)) {
    return NextResponse.json({ error: "كلمة المرور تحتاج حرف كبير واحد" }, { status: 400 })
  }
  if (!/[0-9]/.test(password)) {
    return NextResponse.json({ error: "كلمة المرور تحتاج رقم واحد" }, { status: 400 })
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: "Server config error" }, { status: 500 })

  const client = createClient(url, key)

  // Use pagination to find user by email — listUsers() defaults to the first
  // page (max 1000 users per page, sufficient for all current deployments).
  const { data: users } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  const user = users?.users?.find((u: { email?: string }) => u.email === session.email)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { error: updateError } = await client.auth.admin.updateUserById(user.id, { password })
  if (updateError) {
    logger.error("Failed to update password", { error: updateError.message, email: session.email })
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  logger.info("Password changed", { email: session.email })
  return NextResponse.json({ success: true })
}
