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
  hasLiveTracking: boolean
  hasRatings: boolean
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
    hasLiveTracking: false,
    hasRatings: true,
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
    hasLiveTracking: false,
    hasRatings: true,
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
    hasLiveTracking: true,
    hasRatings: true,
    maxBranches: 999,
  },
}
