import { NextRequest, NextResponse } from "next/server"
import { requireRootOwner, isErrorResponse } from "@/lib/api-auth"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`evo-set-webhook:${getClientIp(req)}`, { max: 10, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireRootOwner(req)
    if (isErrorResponse(session)) return session

    const { webhook_url } = await req.json()
    const url = webhook_url || (env.VERCEL_URL
      ? `https://${env.VERCEL_URL}/api/whatsapp-webhook`
      : "http://localhost:3000/api/whatsapp-webhook")

    const evoUrl = env.EVOLUTION_API_URL
    const apikey = env.EVOLUTION_API_KEY
    const instance = env.EVOLUTION_INSTANCE || "burger-house"

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
