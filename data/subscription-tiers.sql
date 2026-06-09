-- ============================================================
--  Subscription Tier & Feature Gating Schema
-- ============================================================

CREATE TYPE subscription_tier AS ENUM ('Starter', 'Pro', 'Elite');

CREATE TABLE IF NOT EXISTS restaurant_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tier          subscription_tier NOT NULL DEFAULT 'Starter',
  status        text NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_subscriptions_select_own"
  ON restaurant_subscriptions
  FOR SELECT
  USING (restaurant_id = get_current_restaurant_id());
