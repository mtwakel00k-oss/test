import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequestAdmin, isTenantMismatch, parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import { recordAuditEvent, EVENT_TYPES } from "@/lib/audit-events"

export async function DELETE(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`orders:clear:${getClientIp(req)}`, { max: 10, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    const sb = await supabaseForRequestAdmin(req)

    const { error: ie } = await (sb.from("order_items")).delete().not("order_id", "is", null)
    if (ie) throw new Error(ie.message || JSON.stringify(ie))

    const { error: oe } = await (sb.from("orders")).delete().not("id", "is", null)
    if (oe) throw new Error(oe.message || JSON.stringify(oe))

    logger.info("All orders cleared")
    recordAuditEvent(req, { event_type: EVENT_TYPES.ORDERS_BULK_CLEARED, operation: "DELETE", table_name: "orders", metadata: { slug: session.slug || "unknown" } }).catch(() => {})
    return NextResponse.json({ success: true, message: "تم حذف جميع الطلبات التجريبية" })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Unknown"
    logger.error("clear orders error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
