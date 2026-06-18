import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

const TELEGRAM_TOKEN = env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_CHAT = env.TELEGRAM_CHAT_ID

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export async function POST(req: NextRequest) {
  try {
    if (!TELEGRAM_CHAT) {
      logger.warn("TELEGRAM_CHAT_ID not set")
      return NextResponse.json({ success: true, warn: "no_chat_id" })
    }

    const rl = await checkRateLimit(`contact:${getClientIp(req)}`, { max: 5, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { name, phone } = await req.json()
    if (!phone || typeof phone !== "string" || phone.trim().length < 3) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 })
    }

    const safeName = escapeHtml(name?.trim() || "بدون الاسم")
    const msg =
      `📩 <b>طلب تواصل جديد</b>\n` +
      `━━━━━━━━━━━━━\n` +
      `👤 ${safeName}\n` +
      `📞 ${phone.trim()}\n` +
      `🕐 ${new Date().toLocaleString("ar-SA")}`

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: Number(TELEGRAM_CHAT),
        text: msg,
        parse_mode: "HTML",
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      logger.error("Telegram send failed: " + err)
      return NextResponse.json({ success: true, warn: "telegram_failed" })
    }

    logger.info(`Contact from ${name || "unknown"}: ${phone}`)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    logger.error("Contact API error: " + msg)
    return NextResponse.json({ error: "فشل إرسال الطلب" }, { status: 500 })
  }
}
