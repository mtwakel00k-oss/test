import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseForRequestAdmin, parseSession, getTenantConfig } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { recordAuditEvent, EVENT_TYPES } from "@/lib/audit-events"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

const CLEAR_CONFIRMATION = "محو جميع البيانات"
const RLS_HELP =
  "RLS blocks DELETE. Fix by running this SQL in Supabase Dashboard SQL Editor:\n\n" +
  "DROP POLICY IF EXISTS \"orders_delete_authenticated\" ON orders;\n" +
  "CREATE POLICY \"orders_delete_authenticated\" ON orders FOR DELETE USING (auth.role() = 'authenticated');\n\n" +
  "DROP POLICY IF EXISTS \"order_items_delete_authenticated\" ON order_items;\n" +
  "CREATE POLICY \"order_items_delete_authenticated\" ON order_items FOR DELETE USING (auth.role() = 'authenticated');\n\n" +
  "DROP POLICY IF EXISTS \"ratings_delete_authenticated\" ON ratings;\n" +
  "CREATE POLICY \"ratings_delete_authenticated\" ON ratings FOR DELETE USING (auth.role() = 'authenticated');"

function getMasterServiceClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function getTenantServiceClient(slug: string) {
  const config = await getTenantConfig(slug)
  if (!config?.supabase_url) return null
  const masterSb = getMasterServiceClient()
  let svcKey: string | undefined
  try {
    const { data: tRow } = await masterSb.from("tenants").select("supabase_service_key").eq("slug", slug).maybeSingle()
    if (tRow?.supabase_service_key) svcKey = tRow.supabase_service_key
  } catch (e) { logger.warn("Failed to get tenant service key from master DB", e) }
  if (svcKey) return createClient(config.supabase_url, svcKey)
  const isSameProject = config.supabase_url === env.NEXT_PUBLIC_SUPABASE_URL
  return isSameProject ? createClient(config.supabase_url, env.SUPABASE_SERVICE_ROLE_KEY!) : null
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`admin:clear-data:${getClientIp(req)}`, { max: 5, windowMs: 300000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    if (body.confirmation !== CLEAR_CONFIRMATION) {
      return NextResponse.json({ error: "يجب كتابة تأكيد مسح البيانات للمتابعة" }, { status: 400 })
    }

    const slug = session.slug || req.headers.get("x-tenant-slug") || ""

    // Try service client first (bypasses RLS)
    if (slug) {
      const svc = await getTenantServiceClient(slug)
      if (svc) {
        const { error: ie } = await svc.from("order_items").delete().not("order_id", "is", null)
        if (ie) throw new Error(ie.message)

        const { error: oe } = await svc.from("orders").delete().not("id", "is", null)
        if (oe) throw new Error(oe.message)

        const { error: re } = await svc.from("ratings").delete().not("id", "is", null)
        if (re) throw new Error(re.message)

        logger.info("All data cleared via service client (slug=" + slug + ")")
        return NextResponse.json({ success: true })
      }
    }

    // Fallback: log audit before deleting via anon client

    // Fallback to anon client (may be blocked by RLS)
    const sb = await supabaseForRequestAdmin(req)
    const tables = ["order_items", "orders", "ratings"] as const
    for (const table of tables) {
      const { error } = table === "order_items"
        ? await sb.from("order_items").delete().not("order_id", "is", null)
        : table === "orders"
          ? await sb.from("orders").delete().not("id", "is", null)
          : await sb.from("ratings").delete().not("id", "is", null)
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes("policy") || msg.includes("permission denied")) {
          return NextResponse.json({ error: RLS_HELP }, { status: 403 })
        }
        throw new Error(error.message)
      }
    }

    recordAuditEvent(req, { event_type: EVENT_TYPES.ORDERS_BULK_CLEARED, operation: "DELETE", table_name: "orders", record_id: slug || "all", new_data: { action: "clear_all_data" } }).catch(() => {})

    logger.info("All data cleared via anon client (role=" + session.role + ")")
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error("ClearData error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}