-- ============================================================
--  Migration 00001: Master project schema
--  Target: Master Supabase project
--  Safe to re-run (all statements use IF NOT EXISTS)
-- ============================================================

-- 1) Missing columns on master tables
ALTER TABLE produits ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'dine_in';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INT;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','preparing','ready','out_for_delivery','completed','cancelled'));
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
DROP POLICY IF EXISTS "public_select_categories" ON categories;
CREATE POLICY "public_select_categories" ON categories FOR SELECT USING (true);

-- 2) Cron job support columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_service_key TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT TRUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_color TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_text_color TEXT;
