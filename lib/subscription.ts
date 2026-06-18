import { createClient } from "@supabase/supabase-js"
import { TIER_FEATURES, type SubscriptionTier, type TierFeatures } from "@/types/subscriptions"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

const MASTER_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

let _serviceClient: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!_serviceClient) {
    if (!MASTER_URL || !SERVICE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")
    }
    _serviceClient = createClient(MASTER_URL, SERVICE_KEY)
  }
  return _serviceClient
}

export async function getRestaurantTier(restaurantId: string): Promise<SubscriptionTier> {
  try {
    const result = await getClient()
      .from("restaurant_subscriptions")
      .select("tier")
      .eq("restaurant_id", restaurantId)
      .maybeSingle()

    interface TierRow { tier: string }

    if (result.error || !result.data) {
      return "Starter"
    }

    const row = result.data as unknown as TierRow
    const tier: SubscriptionTier = row.tier as SubscriptionTier
    if (!(tier in TIER_FEATURES)) {
      return "Starter"
    }

    return tier
  } catch (e) {
    logger.error("getRestaurantTier failed", e)
    return "Starter"
  }
}

export async function checkFeatureAccess(
  restaurantId: string,
  featureName: keyof TierFeatures,
): Promise<boolean> {
  try {
    const tier = await getRestaurantTier(restaurantId)
    return TIER_FEATURES[tier][featureName] === true
  } catch {
    return false
  }
}
