import { logger } from "@/lib/logger"

export async function sendTelegramNotification(text: string): Promise<boolean> {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID

  const token = BOT_TOKEN || "TOKEN_REMOVED"
  const chat = CHAT_ID || "1816086542"

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: Number(chat),
        text,
        parse_mode: "HTML",
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      logger.error("Telegram send failed: " + body)
      return false
    }
    return true
  } catch (e) {
    logger.error("Telegram send error: " + (e instanceof Error ? e.message : String(e)))
    return false
  }
}
