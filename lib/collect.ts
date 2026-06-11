import { createClient } from "@supabase/supabase-js"
import { getTenantConfig } from "@/lib/tenant"
import { logger } from "@/lib/logger"

export async function markOrderAsCollected(orderId: string, slug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tenant = await getTenantConfig(slug)
    if (!tenant?.supabase_url) {
      return { success: false, error: "Tenant not found" }
    }

    const isShared = tenant.supabase_url === process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = isShared
      ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      : tenant.supabase_anon_key

    const sb = createClient(tenant.supabase_url, key)

    const { data: order } = await sb.from("orders")
      .select("id, delivery_man_id, status")
      .eq("id", orderId)
      .single()

    if (!order) return { success: false, error: "Order not found" }
    if (order.status === "completed") return { success: true }

    await sb.from("orders").update({ status: "completed" }).eq("id", orderId)
    if (order.delivery_man_id) {
      await sb.from("delivery_men").update({ is_busy: false }).eq("id", order.delivery_man_id)
    }

    logger.info("Order marked as collected", { orderId, slug })
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    logger.error("markOrderAsCollected failed", { orderId, slug, error: msg })
    return { success: false, error: msg }
  }
}
