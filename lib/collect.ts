import { createClient } from "@supabase/supabase-js"
import { supabaseForSlug } from "@/lib/tenant"
import { logger } from "@/lib/logger"

export async function markOrderAsCollected(orderId: string, slug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sb = await supabaseForSlug(slug)

    const { data: order, error: orderErr } = await sb.from("orders")
      .select("id, delivery_man_id, status")
      .eq("id", orderId)
      .maybeSingle()

    if (orderErr) {
      logger.error("markOrderAsCollected: select error", { orderId, slug, error: orderErr.message })
      return { success: false, error: "Query error: " + orderErr.message }
    }

    if (!order) return { success: false, error: "Order not found" }
    if (order.status === "completed") return { success: true }

    const { error: updateErr } = await sb.from("orders").update({ status: "completed" }).eq("id", orderId)
    if (updateErr) {
      logger.error("markOrderAsCollected: update error", { orderId, slug, error: updateErr.message })
      return { success: false, error: "Update error: " + updateErr.message }
    }

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
