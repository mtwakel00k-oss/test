import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import { recordAuditEvent, EVENT_TYPES } from "@/lib/audit-events"

export async function GET(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (!session.role || session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await supabase.from("app_config").select("*").maybeSingle()
    return NextResponse.json(data || { maintenance_mode: false, master_webhook_url: "" })
  } catch (e) {
    logger.error("Settings GET failed", e)
    return NextResponse.json({ maintenance_mode: false, master_webhook_url: "" })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`admin:settings:${getClientIp(req)}`, { max: 20, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { error } = await supabase.from("app_config").upsert({
      id: 1,
      maintenance_mode: body.maintenance_mode ?? false,
      master_webhook_url: body.master_webhook_url ?? "",
      updated_at: new Date().toISOString(),
    })

    if (error) {
      logger.error("Settings PATCH failed", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    recordAuditEvent(req, { event_type: EVENT_TYPES.SETTINGS_UPDATED, operation: "UPDATE", table_name: "app_config", new_data: body, old_data: undefined }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
