export const PLAN_PRICES: Record<string, number> = {
  starter: 5000,
  pro: 10000,
  elite: 20000,
}

export const COMMISSION_RATE = 0.02

export function getPlanPrice(planType: string | null): number {
  return PLAN_PRICES[planType || ""] || 0
}

export function computeSubscriptionRevenue(tenants: { plan_type: string | null; is_active: boolean }[]): number {
  return tenants
    .filter((t) => t.is_active)
    .reduce((sum, t) => sum + getPlanPrice(t.plan_type), 0)
}
