import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function POST(req: NextRequest) {
  try {
    const { webhook_url } = await req.json()
    const url = webhook_url || (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/whatsapp-webhook`
      : "http://localhost:3000/api/whatsapp-webhook")

    const evoUrl = process.env.EVOLUTION_API_URL
    const apikey = process.env.EVOLUTION_API_KEY
    const instance = process.env.EVOLUTION_INSTANCE || "burger-house"

    if (!evoUrl || !apikey) {
      return NextResponse.json({ error: "EVOLUTION_API_URL or EVOLUTION_API_KEY not set" }, { status: 400 })
    }

    const res = await fetch(`${evoUrl}/webhook/set/${instance}`, {
      method: "POST",
      headers: { apikey, "Content-Type": "application/json" },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url,
          events: ["MESSAGES_UPSERT"],
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      logger.error("Failed to set webhook", { status: res.status, error: err })
      return NextResponse.json({ error: `Evolution API error: ${err}` }, { status: 500 })
    }

    const result = await res.json()
    logger.info("Webhook set successfully", { webhookUrl: url, result })
    return NextResponse.json({ success: true, webhookUrl: url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("evo-set-webhook failed: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
