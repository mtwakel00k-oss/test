import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { markOrderAsCollected } from "@/lib/collect"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    logger.info("Webhook received", { type: body.event || "unknown" })

    const msgData = body.data || body
    const message = msgData.message || {}
    const btnResponse = message.buttonsResponseMessage
    if (btnResponse?.selectedButtonId) {
      const parts = btnResponse.selectedButtonId.split("|")
      if (parts[0] === "collect" && parts[1] && parts[2]) {
        const [_action, orderId, slug] = parts
        const result = await markOrderAsCollected(orderId, slug)
        if (result.success) {
          logger.info("Collected via webhook", { orderId, slug })
        } else {
          logger.warn("Webhook collect failed", { orderId, slug, error: result.error })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    logger.error("Webhook error", e)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
