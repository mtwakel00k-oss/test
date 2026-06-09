import { createClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"

const MASTER_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PHONE_ID = process.env.WHATSAPP_PHONE_ID
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

interface DriverRecord {
  id: string; name: string; phone: string; token: string; is_active: boolean
}

export async function sendDriverWhatsApp(
  to: string,
  message: string,
): Promise<boolean> {
  if (!PHONE_ID || !ACCESS_TOKEN) {
    logger.warn("WHATSAPP_PHONE_ID or WHATSAPP_ACCESS_TOKEN not set — skipping")
    return false
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/^\+/, ""),
          type: "text",
          text: { preview_url: true, body: message },
        }),
      },
    )

    if (!res.ok) {
      const err = await res.text()
      logger.error("WhatsApp API error", { status: res.status, error: err })
      return false
    }

    logger.info("WhatsApp sent to driver", { to })
    return true
  } catch (e) {
    logger.error("Failed to send WhatsApp", e)
    return false
  }
}

export async function notifyDriverAssigned(
  slug: string,
  driverId: string,
  orderNumber: string | number,
  total: number,
  origin: string,
): Promise<void> {
  try {
    if (!MASTER_URL || !SERVICE_KEY) return

    const masterSb = createClient(MASTER_URL, SERVICE_KEY)
    const { data: tenant, error } = await masterSb
      .from("tenants")
      .select("drivers, name")
      .eq("slug", slug)
      .maybeSingle()

    if (error || !tenant) {
      logger.warn("notifyDriverAssigned: tenant not found", { slug, error })
      return
    }

    const t = tenant as { drivers: DriverRecord[]; name: string }
    const drivers: DriverRecord[] = t.drivers ?? []
    const driver = drivers.find((d) => d.id === driverId && d.is_active)
    if (!driver) {
      logger.warn("notifyDriverAssigned: driver not found", { slug, driverId })
      return
    }

    const link = `${origin}/${slug}/driver/${driver.token}`
    const message = [
      `🛵 *${driver.name}*`,
      ``,
      `تم تعيينك لتوصيل الطلب رقم #${orderNumber}`,
      `المبلغ: ${total} د.ل`,
      ``,
      `رابط الطلبات الخاص بك:`,
      link,
      ``,
      t.name,
    ].join("\n")

    await sendDriverWhatsApp(driver.phone, message)
  } catch (e) {
    logger.error("notifyDriverAssigned failed", e)
  }
}
