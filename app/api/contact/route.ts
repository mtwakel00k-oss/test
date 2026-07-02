import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { sendDriverWhatsApp } from "@/lib/whatsapp"

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
    const rl = await checkRateLimit(`contact:${getClientIp(req)}`, { max: 5, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { slug, name, phone } = await req.json()
    if (!phone || typeof phone !== "string" || phone.trim().length < 3) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 })
    }
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "معرف المطعم مطلوب" }, { status: 400 })
    }

    // Look up tenant's contact WhatsApp number
    const masterSb = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: tenant } = await masterSb
      .from("tenants")
      .select("contact_whatsapp, name")
      .eq("slug", slug)
      .single<{ contact_whatsapp: string | null; name: string | null }>()

    const adminPhone = tenant?.contact_whatsapp
    if (!adminPhone) {
      logger.warn("Contact: no whatsapp number configured for tenant", { slug })
      return NextResponse.json({ success: true, warn: "no_whatsapp_config" })
    }

    const safeName = escapeHtml(name?.trim() || "بدون الاسم")
    const msg =
      `📩 *طلب تواصل جديد*\n` +
      `━━━━━━━━━━━━━\n` +
      `👤 ${safeName}\n` +
      `📞 ${phone.trim()}\n` +
      `🏪 ${tenant?.name || slug}\n` +
      `🕐 ${new Date().toLocaleString("ar-SA")}`

    const sent = await sendDriverWhatsApp(adminPhone, msg)

    if (!sent) {
      logger.warn("WhatsApp send failed for contact", { slug })
      return NextResponse.json({ success: true, warn: "whatsapp_failed" })
    }

    logger.info(`Contact from ${name || "unknown"}: ${phone} (${slug})`)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    logger.error("Contact API error: " + msg)
    return NextResponse.json({ error: "فشل إرسال الطلب" }, { status: 500 })
  }
}
