import { NextRequest, NextResponse } from "next/server"
import { markOrderAsCollected } from "@/lib/collect"
import { requireStaff, resolveTenantSlug, isErrorResponse } from "@/lib/api-auth"
import { supabaseForRequestAdmin } from "@/lib/tenant"
import { logAudit } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`delivery:collect:${getClientIp(req)}`, { max: 30, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireStaff(req)
    if (isErrorResponse(session)) return session

    const body = await req.json()
    const { order_id, slug: bodySlug } = body
    const slug = resolveTenantSlug(req, session, bodySlug)
    if (!slug) {
      return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 })
    }
    if (!order_id) {
      return NextResponse.json({ error: "order_id required" }, { status: 400 })
    }

    const result = await markOrderAsCollected(order_id, slug)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed" }, { status: 500 })
    }

    const sb = await supabaseForRequestAdmin(req)
    logAudit(sb, req, { table_name: "orders", record_id: order_id, operation: "UPDATE", new_data: { status: "completed", action: "driver_collected" } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("collect POST failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
