import { createClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"

const EVOLUTION_URL      = (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "")
const EVOLUTION_KEY      = process.env.EVOLUTION_API_KEY  || ""
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "burger-house"

interface DriverRecord {
  id: string
  name: string
  phone: string
  token: string
  is_active: boolean
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("213")) return digits
  if (digits.startsWith("0"))   return "213" + digits.slice(1)
  return digits
}

export async function sendDriverWhatsApp(to: string, message: string): Promise<boolean> {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    logger.warn("EVOLUTION_API_URL or EVOLUTION_API_KEY not set — skipping WhatsApp")
    return false
  }

  const number = formatPhone(to)
  const url    = `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`

  logger.info("Evolution API → request", { url, number })

  try {
    const res  = await fetch(url, {
      method:  "POST",
      headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
      body:    JSON.stringify({ number, text: message }),
    })

    const body = await res.text()
    logger.info("Evolution API ← response", { status: res.status, body })

    if (!res.ok) {
      logger.error("Evolution API error", { status: res.status, body })
      return false
    }

    logger.info("WhatsApp sent", { to: number })
    return true
  } catch (e) {
    logger.error("Evolution API fetch failed", e)
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
    if (!slug) { logger.warn("notifyDriverAssigned: no slug"); return }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) { logger.warn("notifyDriverAssigned: missing env vars"); return }

    const masterSb = createClient(url, key)

    const { data: tenant, error } = await masterSb
      .from("tenants")
      .select("supabase_url, supabase_anon_key, drivers")
      .eq("slug", slug)
      .single()

    if (error || !tenant) {
      logger.warn("notifyDriverAssigned: tenant not found", { slug, error })
      return
    }

    // Try tenant's drivers table first (delivery_men source)
    let driver: DriverRecord | null = null
    if (tenant.supabase_url && tenant.supabase_anon_key) {
      const tenantSb = createClient(tenant.supabase_url, tenant.supabase_anon_key)
      const { data: tableDriver, error: driverError } = await tenantSb
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .maybeSingle()
      if (!driverError && tableDriver?.is_active) {
        driver = tableDriver as DriverRecord
      }
    }

    // Fallback: look up from master DB tenants.drivers JSONB (tenant source)
    if (!driver && tenant.drivers) {
      const arr = Array.isArray(tenant.drivers) ? (tenant.drivers as DriverRecord[]) : []
      driver = arr.find((d) => d.id === driverId && d.is_active) ?? null
    }

    if (!driver) {
      logger.warn("notifyDriverAssigned: driver not found in tenant table or master JSONB", { slug, driverId })
      return
    }

    const link = `${origin}/${slug}/driver/${driver.token || driverId}`
    const message = [
      `🛵 *${driver.name}*`,
      ``,
      `تم تعيينك لتوصيل الطلب رقم #${orderNumber}`,
      `المبلغ: ${total} د.ج`,
      ``,
      `رابط طلباتك:`,
      link,
    ].join("\n")

    await sendDriverWhatsApp(driver.phone, message)
  } catch (e) {
    logger.error("notifyDriverAssigned failed", e)
  }
}
