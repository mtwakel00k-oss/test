import { createClient } from "@supabase/supabase-js"
import { getTenantConfig, createTenantSupabaseClient } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

const MASTER_URL = env.NEXT_PUBLIC_SUPABASE_URL!
const MASTER_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Generate the correct tracking URL for a customer order.
 * Always includes the restaurant slug.
 *
 * Example: getOrderTrackingUrl("burger-house", "uuid-123") → "/burger-house/order/uuid-123"
 */
export function getOrderTrackingUrl(slug: string, orderId: string): string {
  return `/${slug}/order/${orderId}`
}

/**
 * Attempt to find an order across all active tenants.
 *
 * Iterates tenant DBs until the order is found, then returns
 * the order data together with the tenant slug.
 *
 * Use case: a customer opens /order/:id from WhatsApp; we don't
 * know which restaurant the order belongs to yet.
 */
export async function findOrderAcrossTenants(orderId: string): Promise<{
  order: Record<string, unknown>
  slug: string
} | null> {
  const masterClient = createClient(MASTER_URL, MASTER_KEY)

  const { data: tenants, error } = await masterClient
    .from("tenants")
    .select("slug")
    .eq("is_active", true)

  if (error) {
    logger.error("[findOrderAcrossTenants] Failed to fetch tenant list", error)
    return null
  }

  if (!tenants || tenants.length === 0) {
    logger.warn("[findOrderAcrossTenants] No active tenants found")
    return null
  }

  for (const { slug } of tenants) {
    try {
      const config = await getTenantConfig(slug)
      if (!config) continue

      const tenantClient = createTenantSupabaseClient(config.supabase_url, config.supabase_anon_key)
      const { data: order, error: queryError } = await tenantClient
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("id", orderId)
        .maybeSingle()

      if (queryError) {
        logger.warn(`[findOrderAcrossTenants] Query failed for tenant "${slug}"`, {
          error: queryError.message,
          orderId,
        })
        continue
      }

      if (order) {
        logger.info(`[findOrderAcrossTenants] Found order ${orderId} in tenant "${slug}"`)
        return { order, slug }
      }
    } catch (e) {
      logger.warn(`[findOrderAcrossTenants] Error for tenant "${slug}"`, {
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  logger.warn(`[findOrderAcrossTenants] Order ${orderId} not found in any tenant`)
  return null
}
