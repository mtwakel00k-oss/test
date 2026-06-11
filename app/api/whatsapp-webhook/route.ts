import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

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
        const [_, orderId, slug] = parts
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000"
        await fetch(`${baseUrl}/api/delivery/collect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId, slug }),
        }).catch((e) => logger.error("Webhook collect fetch failed", e))
        logger.info("Collected via webhook", { orderId, slug })
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
