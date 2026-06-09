-- ============================================================
--  Migration v7: Telegram Driver Linking
--  Master DB only (not per-tenant)
-- ============================================================

-- 1) Dedicated drivers table for Telegram linking
CREATE TABLE IF NOT EXISTS drivers (
  id               UUID PRIMARY KEY,
  restaurant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  phone            TEXT,
  token            TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  telegram_chat_id TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_restaurant_id ON drivers(restaurant_id);

-- 2) RLS — users can only access drivers of restaurants they belong to
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_select_own_restaurant" ON drivers
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "drivers_insert_own_restaurant" ON drivers
  FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "drivers_update_own_restaurant" ON drivers
  FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "drivers_delete_own_restaurant" ON drivers
  FOR DELETE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()
    )
  );
