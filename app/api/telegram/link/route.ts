import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"

const MASTER_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

interface LinkBody {
  driverId: string
  restaurantId: string
  telegramChatId: string
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const { driverId, restaurantId, telegramChatId } = body as LinkBody

    if (!driverId || !restaurantId || !telegramChatId) {
      return NextResponse.json(
        { error: "driverId, restaurantId, and telegramChatId are required" },
        { status: 400 },
      )
    }

    if (!MASTER_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const masterSb = createClient(MASTER_URL, SERVICE_KEY)

    // Verify the driver exists in the JSONB (source of truth for driver records)
    const { data: tenant, error: tenantErr } = await masterSb
      .from("tenants")
      .select("id, drivers")
      .eq("id", restaurantId)
      .maybeSingle()

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 })
    }

    const drivers = (tenant as { drivers: Array<Record<string, unknown>> }).drivers ?? []
    const existingDriver = drivers.find(
      (d) => d.id === driverId && d.is_active === true,
    )

    if (!existingDriver) {
      return NextResponse.json({ error: "Driver not found in this restaurant" }, { status: 404 })
    }

    const d = existingDriver as { name: string; phone?: string; token: string; is_active: boolean; created_at: string }

    // Upsert into the new drivers table
    const { error: upsertErr } = await masterSb.from("drivers").upsert(
      {
        id: driverId,
        restaurant_id: restaurantId,
        name: d.name,
        phone: d.phone ?? null,
        token: d.token,
        is_active: d.is_active,
        telegram_chat_id: String(telegramChatId),
      },
      { onConflict: "id" },
    )

    if (upsertErr) {
      logger.error("Failed to save Telegram link", upsertErr)
      return NextResponse.json({ error: "Failed to save Telegram link" }, { status: 500 })
    }

    logger.info("Driver Telegram linked", { driverId, restaurantId })
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    logger.error("Telegram link route error", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
