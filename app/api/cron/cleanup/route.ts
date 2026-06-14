import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { constantTimeCompare } from "@/lib/session-crypto"
import { logger } from "@/lib/logger"

const MASTER_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const expected = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization")
  const querySecret = new URL(req.url).searchParams.get("secret")

  const authorized =
    !!expected &&
    (authHeader === `Bearer ${expected}` ||
      (!!querySecret && constantTimeCompare(querySecret, expected)))

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || !MASTER_URL) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 })
  }

  const masterSb = createClient(MASTER_URL, serviceKey)
  const { data: tenants } = await masterSb
    .from("tenants")
    .select("slug, supabase_url, supabase_anon_key, supabase_service_key")
    .eq("is_active", true)

  if (!tenants?.length) {
    return NextResponse.json({ results: [], note: "No active tenants" })
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const summary: { slug: string; deleted_orders: number; deleted_items: number; error?: string }[] = []

  for (const tenant of tenants) {
    try {
      // Use service_role key if available (own project), else fall back to anon key (same project as master)
      const tenantKey = tenant.supabase_service_key
        || (tenant.supabase_url === MASTER_URL ? serviceKey : null)
        || tenant.supabase_anon_key

      if (!tenantKey) {
        summary.push({ slug: tenant.slug, deleted_orders: 0, deleted_items: 0, error: "No privileged key" })
        continue
      }

      const tenantSb = createClient(tenant.supabase_url, tenantKey)

      // Get IDs of old cancelled orders
      const { data: oldOrders, error: fetchErr } = await tenantSb
        .from("orders")
        .select("id")
        .eq("status", "cancelled")
        .lt("created_at", thirtyDaysAgo)

      if (fetchErr) {
        summary.push({ slug: tenant.slug, deleted_orders: 0, deleted_items: 0, error: fetchErr.message })
        continue
      }

      if (!oldOrders?.length) {
        summary.push({ slug: tenant.slug, deleted_orders: 0, deleted_items: 0 })
        continue
      }

      const ids = oldOrders.map((o: { id: string }) => o.id)

      // Delete order_items first (FK constraint)
      const { error: itemsErr } = await tenantSb
        .from("order_items")
        .delete()
        .in("order_id", ids)

      if (itemsErr) {
        summary.push({ slug: tenant.slug, deleted_orders: 0, deleted_items: 0, error: `items: ${itemsErr.message}` })
        continue
      }

      // Delete orders
      const { error: ordersErr } = await tenantSb
        .from("orders")
        .delete()
        .in("id", ids)

      if (ordersErr) {
        summary.push({ slug: tenant.slug, deleted_orders: 0, deleted_items: ids.length, error: ordersErr.message })
      } else {
        logger.info(`[cron] Cleaned ${tenant.slug}: ${ids.length} orders`)
        summary.push({ slug: tenant.slug, deleted_orders: ids.length, deleted_items: ids.length })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown"
      logger.error(`[cron] Failed for ${tenant.slug}: ${msg}`)
      summary.push({ slug: tenant.slug, deleted_orders: 0, deleted_items: 0, error: msg })
    }
  }

  const elapsed = Date.now() - startTime
  logger.info(`[cron] Cleanup finished in ${elapsed}ms`)

  return NextResponse.json({ results: summary, elapsed_ms: elapsed })
}
