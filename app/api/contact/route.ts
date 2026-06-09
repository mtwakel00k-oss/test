import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID || "1816086542"

export async function POST(req: NextRequest) {
  try {
    const { name, phone } = await req.json()
    if (!phone || typeof phone !== "string" || phone.trim().length < 3) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 })
    }

    const msg =
      `📩 <b>طلب تواصل جديد</b>\n` +
      `━━━━━━━━━━━━━\n` +
      `👤 ${name?.trim() || "بدون اسم"}\n` +
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
