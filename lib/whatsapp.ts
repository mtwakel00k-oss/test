import { createClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"

const MASTER_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "burger-house"

interface DriverRecord {
  id: string; name: string; phone: string; token: string; is_active: boolean
}

export async function sendDriverInteractive(
  to: string,
  bodyText: string,
  orderId: string,
  slug: string,
): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    logger.warn("Evolution API not configured — skipping interactive")
    return false
  }

  const number = to.replace(/[^0-9]/g, "")
  const buttonId = `collect|${orderId}|${slug}`

  try {
    const res = await fetch(
      `${EVOLUTION_API_URL}/message/sendInteractive/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          options: { delay: 0, presence: "composing" },
          interactive: {
            type: "button",
            body: { text: bodyText },
            action: {
              buttons: [
                { type: "reply", reply: { id: buttonId, title: "💰 قبضت" } },
              ],
            },
          },
        }),
      },
    )

    if (!res.ok) {
      const err = await res.text()
      logger.error("Evolution API interactive error", { status: res.status, error: err })
      return false
    }

    logger.info("Interactive WhatsApp sent to driver", { to })
    return true
  } catch (e) {
    logger.error("Failed to send interactive WhatsApp", e)
    return false
  }
}

export async function sendDriverWhatsApp(
  to: string,
  message: string,
): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    logger.warn("EVOLUTION_API_URL or EVOLUTION_API_KEY not set — skipping")
    return false
  }

  try {
    const number = to.replace(/[^0-9]/g, "")
    const res = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number,
          text: message,
          delay: 0,
        }),
      },
    )

    if (!res.ok) {
      const err = await res.text()
      logger.error("Evolution API error", { status: res.status, error: err })
      return false
    }

    logger.info("WhatsApp sent to driver via Evolution API", { to })
    return true
  } catch (e) {
    logger.error("Failed to send WhatsApp via Evolution API", e)
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
