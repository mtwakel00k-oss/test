import { createClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"

const MASTER_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FALLBACK_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export interface TelegramOrderItem {
  product_name: string
  size: string
  quantity: number
  unit_price: number
}

export interface TelegramOrderData {
  id: string
  order_number: number | null
  customer_name: string
  customer_phone: string | null
  delivery_address: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  total: number
  items: TelegramOrderItem[]
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  botToken: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: Number(chatId),
          text,
          parse_mode: "HTML",
        }),
      },
    )

    if (!res.ok) {
      const err = await res.text()
      logger.error("Telegram API error", { status: res.status, error: err })
      return false
    }

    return true
  } catch (e) {
    logger.error("Telegram send error", e)
    return false
  }
}

export function formatOrderMessage(order: TelegramOrderData): string {
  const lines: string[] = [
    "🛵 <b>طلب توصيل جديد</b>",
    "━".repeat(21),
    `<b>👤 العميل:</b> ${order.customer_name}`,
  ]

  if (order.customer_phone) {
    lines.push(`<b>📞 الهاتف:</b> ${order.customer_phone}`)
  }

  if (order.delivery_address) {
    lines.push(`<b>📍 العنوان:</b> ${order.delivery_address}`)
  }

  if (order.delivery_lat && order.delivery_lng) {
    lines.push(`<b>🗺️ الخريطة:</b> https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`)
  }

  lines.push("━".repeat(21))
  lines.push("<b>🛒 الطلب:</b>")

  for (const item of order.items) {
    const sizeInfo = item.size ? ` (${item.size})` : ""
    const subtotal = (item.unit_price * item.quantity).toFixed(2)
    lines.push(`  • ${item.product_name}${sizeInfo} × ${item.quantity} = ${subtotal} د.ل`)
  }

  lines.push("━".repeat(21))
  lines.push(`<b>💵 الإجمالي:</b> ${order.total.toFixed(2)} د.ل`)

  if (order.order_number) {
    lines.push(`<b>🔢 رقم الطلب:</b> #${order.order_number}`)
  }

  return lines.join("\n")
}

export async function sendOrderToDriver(
  restaurantId: string,
  driverId: string,
  orderData: TelegramOrderData,
): Promise<boolean> {
  try {
    if (!MASTER_URL || !SERVICE_KEY) {
      logger.warn("sendOrderToDriver: missing master DB env vars")
      return false
    }

    const masterSb = createClient(MASTER_URL, SERVICE_KEY)

    const { data: driver, error } = await masterSb
      .from("drivers")
      .select("telegram_chat_id, restaurant_id, name")
      .eq("id", driverId)
      .maybeSingle()

    if (error || !driver) {
      logger.warn("sendOrderToDriver: driver not found in drivers table", { driverId, error })
      return false
    }

    if (driver.restaurant_id !== restaurantId) {
      logger.error("sendOrderToDriver: restaurant_id mismatch", {
        driverId,
        expected: restaurantId,
        actual: driver.restaurant_id,
      })
      return false
    }

    if (!driver.telegram_chat_id) {
      logger.warn("sendOrderToDriver: driver has no telegram_chat_id", { driverId, name: driver.name })
      return false
    }

    // Look up the restaurant's own bot token (isolated per restaurant)
    const { data: tenant } = await masterSb
      .from("tenants")
      .select("telegram_bot_token")
      .eq("id", restaurantId)
      .maybeSingle()

    const t = tenant as { telegram_bot_token?: string } | null
    const botToken = t?.telegram_bot_token || FALLBACK_BOT_TOKEN

    if (!botToken) {
      logger.warn("sendOrderToDriver: no Telegram bot token for restaurant", { restaurantId })
      return false
    }

    const message = formatOrderMessage(orderData)
    return await sendTelegramMessage(driver.telegram_chat_id, message, botToken)
  } catch (e) {
    logger.error("sendOrderToDriver failed", e)
    return false
  }
}
