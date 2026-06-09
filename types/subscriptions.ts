export type SubscriptionTier = "Starter" | "Pro" | "Elite"

export interface TierFeatures {
  hasPOS: boolean
  hasQROrdering: boolean
  hasOrderTracking: boolean
  hasRoleManagement: boolean
  hasReports: boolean
  hasKDS: boolean
  hasDelivery: boolean
  hasCustomTheme: boolean
  maxBranches: number
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  Starter: {
    hasPOS: true,
    hasQROrdering: true,
    hasOrderTracking: true,
    hasRoleManagement: true,
    hasReports: true,
    hasKDS: false,
    hasDelivery: false,
    hasCustomTheme: false,
    maxBranches: 1,
  },
  Pro: {
    hasPOS: true,
    hasQROrdering: true,
    hasOrderTracking: true,
    hasRoleManagement: true,
    hasReports: true,
    hasKDS: true,
    hasDelivery: true,
    hasCustomTheme: false,
    maxBranches: 1,
  },
  Elite: {
    hasPOS: true,
    hasQROrdering: true,
    hasOrderTracking: true,
    hasRoleManagement: true,
    hasReports: true,
    hasKDS: true,
    hasDelivery: true,
    hasCustomTheme: true,
    maxBranches: 999,
  },
}
