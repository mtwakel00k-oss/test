import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { supabaseForRequest, parseSession, getTenantConfig } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit"

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
  } catch {}
  if (svcKey) return createClient(config.supabase_url, svcKey)
  const isSameProject = config.supabase_url === env.NEXT_PUBLIC_SUPABASE_URL
  return isSameProject ? createClient(config.supabase_url, env.SUPABASE_SERVICE_ROLE_KEY!) : null
}

const RLS_HELP =
  "RLS блокирует удаление. Чтобы исправить, запусти этот SQL в Supabase Dashboard SQL Editor:\n\n" +
  "DROP POLICY IF EXISTS \"orders_delete_admin\" ON orders;\n" +
  "CREATE POLICY \"orders_delete_admin\" ON orders FOR DELETE USING (true);\n\n" +
  "DROP POLICY IF EXISTS \"order_items_delete_admin\" ON order_items;\n" +
  "CREATE POLICY \"order_items_delete_admin\" ON order_items FOR DELETE USING (true);\n\n" +
  "DROP POLICY IF EXISTS \"ratings_delete_admin\" ON ratings;\n" +
  "CREATE POLICY \"ratings_delete_admin\" ON ratings FOR DELETE USING (true);"

async function clearAll(sb: SupabaseClient) {
  const { error: ie } = await sb.from("order_items").delete().not("order_id", "is", null)
  if (ie) throw new Error(ie.message)

  const { error: oe } = await sb.from("orders").delete().not("id", "is", null)
  if (oe) throw new Error(oe.message)

  const { error: re } = await sb.from("ratings").delete().not("id", "is", null)
  if (re) throw new Error(re.message)
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`admin:clear-data:${getClientIp(req)}`, { max: 5, windowMs: 300000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Try service client first (bypasses RLS)
    const svcSlug = session.slug || req.headers.get("x-tenant-slug") || ""
    if (svcSlug) {
      const svc = await getTenantServiceClient(svcSlug)
      if (svc) {
        await clearAll(svc)
        logger.info("All data cleared via service client (slug=" + svcSlug + ")")
        return NextResponse.json({ success: true })
      }
    }

    // Fallback to anon client (may be blocked by RLS)
    const sb = await supabaseForRequest(req)
    try {
      await clearAll(sb)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes("policy") || msg.includes("permission denied")) {
        return NextResponse.json({ error: RLS_HELP }, { status: 403 })
      }
      throw e
    }

    logger.info("All data cleared (role=" + session.role + ")")
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error("ClearData error: " + msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
