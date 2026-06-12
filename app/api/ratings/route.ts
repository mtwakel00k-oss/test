import { NextRequest, NextResponse } from "next/server"
import { supabaseForRequest, isTenantMismatch, parseSession } from "@/lib/tenant"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import { checkFeature } from "@/lib/check-feature"
import { logger } from "@/lib/logger"

async function featureGate(req: NextRequest): Promise<NextResponse | null> {
  const session = parseSession(req.headers.get("cookie") || "")
  const slug = session.slug || ""
  if (!slug) return null
  const hasFeature = await checkFeature(slug, "hasRatings")
  if (!hasFeature) {
    return NextResponse.json({ error: "This feature is not available on your current plan" }, { status: 403 })
  }
  return null
}

function isAdmin(req: NextRequest): boolean {
  const sessionCookie = req.cookies.get("session")
  if (!sessionCookie) return false
  try {
    const session = JSON.parse(sessionCookie.value)
    return session.role === "admin" || session.role === "owner"
  } catch {
    return false
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    const sb = await supabaseForRequest(req)
    const { error } = await (sb.from("ratings")).delete().not("id", "is", null)
    if (error) throw error
    logger.info("All ratings deleted")
    return NextResponse.json({ success: true })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    const msg = e instanceof Error ? e.message : "Delete failed"
    logger.error("Failed to delete ratings: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const gate = await featureGate(req)
    if (gate) return gate

    const body = await req.json()
    const { product_id, rating, comment } = body
    let { order_id } = body
    if (!product_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid product_id or rating" }, { status: 400 })
    }
    if (comment && comment.length > 1000) {
      return NextResponse.json({ error: "Comment too long" }, { status: 400 })
    }

    const rl = checkRateLimit(`ratings:${getClientIp(req)}`, { max: 10, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const sb2 = await supabaseForRequest(req)

    // Validate product_id exists (FK safety)
    const { data: prod } = await (sb2.from("produits")).select("id").eq("id", product_id).maybeSingle()
    if (!prod) {
      return NextResponse.json({ error: "Product no longer exists" }, { status: 400 })
    }
    if (order_id) {
      const { data: ord } = await (sb2.from("orders")).select("id").eq("id", order_id).maybeSingle()
      if (!ord) {
        logger.warn("Rating submitted with non-existent order_id, dropping it", { order_id, product_id })
        order_id = undefined
      }
    }

    const payload: Record<string, unknown> = { product_id, rating, comment: comment?.slice(0, 1000) || null }
    if (order_id) payload.order_id = order_id
    const { error } = await (sb2.from("ratings")).insert(payload)
    if (error) throw error

    logger.info("Rating submitted", { product_id, order_id, rating })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const mismatch = isTenantMismatch(e)
    if (mismatch) return mismatch
    logger.error("Rating submission failed", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
