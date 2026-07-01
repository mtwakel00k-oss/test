import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequestAdmin, parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (!session.role || !["admin", "owner", "cashier", "chef"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rl = await checkRateLimit(`customer-location:${getClientIp(req)}`, { max: 30, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { id } = await params
    const { lat, lng } = await req.json()

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat and lng must be numbers" }, { status: 400 })
    }

    const sb = await supabaseForRequestAdmin(req)
    const { error } = await sb.from("orders").update({ delivery_lat: lat, delivery_lng: lng }).eq("id", id)

    if (error) {
      logger.error("Failed to update customer location", { id, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("customer-location PATCH failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
