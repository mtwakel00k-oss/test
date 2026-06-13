import { getTenantConfig } from "@/lib/tenant"
import { TIER_FEATURES, type SubscriptionTier, type TierFeatures } from "@/types/subscriptions"

/**
 * Check whether a tenant's current subscription plan includes a given feature.
 * Resolves the tenant's plan_type from the master DB, maps it to a TierFeatures key.
 */
export async function checkFeature(tenantSlug: string, featureName: keyof TierFeatures): Promise<boolean> {
  const config = await getTenantConfig(tenantSlug)
  if (!config) return false

  const plan = config.plan_type as SubscriptionTier | null | undefined
  const tier = plan ? (capitalize(plan) as SubscriptionTier) : "Starter"
  const features = TIER_FEATURES[tier]
  if (!features) return false

  return features[featureName] === true
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
