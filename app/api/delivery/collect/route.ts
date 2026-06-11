import { NextRequest, NextResponse } from "next/server"
import { markOrderAsCollected } from "@/lib/collect"
import { logger } from "@/lib/logger"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { order_id, slug } = body
    if (!order_id || !slug) {
      return NextResponse.json({ error: "order_id and slug required" }, { status: 400 })
    }

    const result = await markOrderAsCollected(order_id, slug)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("collect POST failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
