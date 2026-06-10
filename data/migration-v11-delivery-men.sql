-- ============================================================
--  Migration v11: Delivery Men table + delivery_man_id on orders
--  Per-tenant tables (run in tenant's Supabase DB)
-- ============================================================

-- 1) Delivery men table
CREATE TABLE IF NOT EXISTS delivery_men (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug     TEXT NOT NULL,
  name            TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  is_busy         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_men_tenant_slug ON delivery_men(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_delivery_men_available  ON delivery_men(tenant_slug, is_busy) WHERE is_busy = false;

ALTER TABLE delivery_men ENABLE ROW LEVEL SECURITY;

-- 2) Add delivery_man_id FK to orders (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_man_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_man_id UUID REFERENCES delivery_men(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Ensure driver_lat / driver_lng exist (from v9)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'driver_lat'
  ) THEN
    ALTER TABLE orders ADD COLUMN driver_lat DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'driver_lng'
  ) THEN
    ALTER TABLE orders ADD COLUMN driver_lng DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'driver_location_updated_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN driver_location_updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4) RLS: delivery_men visible to authenticated users of the same tenant
--    (we use a per-tenant schema, so tenant_slug filtering is handled at the app level)
CREATE POLICY "delivery_men_select_authenticated" ON delivery_men
  FOR SELECT USING (true);

CREATE POLICY "delivery_men_insert_admin" ON delivery_men
  FOR INSERT WITH CHECK (true);

CREATE POLICY "delivery_men_update_admin" ON delivery_men
  FOR UPDATE USING (true);

CREATE POLICY "delivery_men_delete_admin" ON delivery_men
  FOR DELETE USING (true);

-- 5) Realtime: enable publication for delivery location updates
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS orders;
