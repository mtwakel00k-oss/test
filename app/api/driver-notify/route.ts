import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { formatPhone } from "@/lib/phone"
import { requireStaff, isErrorResponse } from "@/lib/api-auth"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

const EVOLUTION_API_URL = env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = env.EVOLUTION_API_KEY

function masterSb() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`driver-notify:${getClientIp(req)}`, { max: 30, windowMs: 60000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = requireStaff(req)
    if (isErrorResponse(session)) return session

    const { restaurantId, driverPhone, orderDetails } = await req.json()

    if (!restaurantId || !driverPhone || !orderDetails) {
      return NextResponse.json(
        { success: false, message: "restaurantId, driverPhone, and orderDetails are required" },
        { status: 400 },
      )
    }

    const { data: tenant, error } = await masterSb()
      .from("tenants")
      .select("slug, evolution_instance")
      .eq("slug", restaurantId)
      .maybeSingle()

    if (error || !tenant) {
      logger.warn("Tenant not found for WhatsApp instance lookup", { restaurantId, error })
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 },
      )
    }

    const instanceName = tenant.evolution_instance || restaurantId

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      logger.warn("EVOLUTION_API_URL or EVOLUTION_API_KEY not set")
      return NextResponse.json(
        { success: false, message: "WhatsApp service not configured" },
        { status: 500 },
      )
    }

    const number = formatPhone(driverPhone)
    const message = `🛵 *طلب جديد جاهز للتوصيل!*\n\n${orderDetails}\n\nالرجاء التوجه للمطعم فوراً.`

    const res = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({ number, text: message, delay: 0 }),
      },
    )

    if (!res.ok) {
      const err = await res.text()
      logger.error("Evolution API request failed", { status: res.status, error: err })
      return NextResponse.json(
        { success: false, message: "Failed to send WhatsApp notification" },
        { status: 502 },
      )
    }

    logger.info("Driver notified via WhatsApp", { restaurantId, driverPhone })
    return NextResponse.json({ success: true, message: "Notification sent to driver" })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("driver-notify POST error", e)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
