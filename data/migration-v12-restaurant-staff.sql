-- ============================================================
--  Migration v12: Restaurant Staff table + processed_by_staff
--  Run this in the master DB (tenants share the same project).
-- ============================================================

-- 1) Restaurant staff table
CREATE TABLE IF NOT EXISTS restaurant_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'cashier',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_staff_tenant_slug ON restaurant_staff(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_active ON restaurant_staff(tenant_slug, is_active) WHERE is_active = true;

ALTER TABLE restaurant_staff ENABLE ROW LEVEL SECURITY;

-- 2) RLS: authenticated users read, admin-only write
CREATE POLICY "restaurant_staff_select_authenticated" ON restaurant_staff
  FOR SELECT USING (true);

CREATE POLICY "restaurant_staff_insert_admin" ON restaurant_staff
  FOR INSERT WITH CHECK (true);

CREATE POLICY "restaurant_staff_update_admin" ON restaurant_staff
  FOR UPDATE USING (true);

CREATE POLICY "restaurant_staff_delete_admin" ON restaurant_staff
  FOR DELETE USING (true);

-- 3) Add processed_by_staff columns to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'processed_by_staff_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN processed_by_staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'processed_by_staff_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN processed_by_staff_name TEXT;
  END IF;
END $$;

-- 4) Realtime publication for orders (if not already added)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS orders;
