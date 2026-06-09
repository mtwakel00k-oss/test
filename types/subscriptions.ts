export type SubscriptionTier = "Starter" | "Pro" | "Elite"

export interface TierFeatures {
  hasKDS: boolean
  hasDelivery: boolean
  hasCustomTheme: boolean
  maxBranches: number
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  Starter: { hasKDS: false, hasDelivery: false, hasCustomTheme: false, maxBranches: 1 },
  Pro:     { hasKDS: true,  hasDelivery: true,  hasCustomTheme: false, maxBranches: 1 },
  Elite:   { hasKDS: true,  hasDelivery: true,  hasCustomTheme: true,  maxBranches: 999 },
}
