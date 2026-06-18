-- ============================================================
--  SIMPLOO SAAS — Tenant Migration for burger-house
--  Target: zordvqqjnlmxgtbkrspp.supabase.co
--  Purpose: Add missing columns & objects to French schema
--  Safe to re-run (idempotent)
-- ============================================================

-- ── 1. Add missing columns to tables ──────────────────────────

ALTER TABLE produits ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS ordre INT DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'takeaway';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_id INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processed_by_staff_id INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processed_by_staff_name TEXT;

ALTER TABLE ratings ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- ── 2. v_products_flat view (French → English mapping) ────────

DROP VIEW IF EXISTS v_products_flat;
CREATE VIEW v_products_flat AS
WITH prix_agg AS (
  SELECT
    pr.produit_id,
    COALESCE(t.code, 'UNIQUE') AS taille_code,
    MIN(CASE WHEN bs.id = 1 THEN pr.prix END) AS sauce_tomate,
    MIN(CASE WHEN bs.id = 2 THEN pr.prix END) AS creme_fraiche,
    MIN(CASE WHEN bs.id IS NULL THEN pr.prix END) AS standard
  FROM prix pr
  LEFT JOIN tailles t ON t.id = pr.taille_id
  LEFT JOIN bases_sauce bs ON bs.id = pr.base_sauce_id
  WHERE pr.disponible
  GROUP BY pr.produit_id, t.code
)
SELECT
  p.id,
  p.nom AS name,
  p.description,
  p.image_url,
  c.nom AS category,
  c.id AS category_id,
  p.est_speciale,
  p.is_available,
  EXISTS(SELECT 1 FROM prix pr JOIN bases_sauce bs ON bs.id = pr.base_sauce_id WHERE pr.produit_id = p.id AND bs.id = 2) AS has_white_sauce,
  COALESCE(
    (SELECT jsonb_object_agg(taille_code, jsonb_build_object('sauce_tomate', sauce_tomate, 'creme_fraiche', creme_fraiche, 'standard', standard))
     FROM prix_agg WHERE produit_id = p.id),
    '{}'::jsonb
  ) AS prices
FROM produits p
JOIN categories c ON c.id = p.categorie_id
ORDER BY c.id, p.id;

-- ── 3. RLS policies ──────────────────────────────────────────

ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prix ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_admin_all" ON categories;
CREATE POLICY "categories_admin_all" ON categories FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "categories_public_select" ON categories;
CREATE POLICY "categories_public_select" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "produits_admin_all" ON produits;
CREATE POLICY "produits_admin_all" ON produits FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "produits_public_select" ON produits;
CREATE POLICY "produits_public_select" ON produits FOR SELECT USING (true);
DROP POLICY IF EXISTS "prix_admin_all" ON prix;
CREATE POLICY "prix_admin_all" ON prix FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tailles_admin_all" ON tailles;
CREATE POLICY "tailles_admin_all" ON tailles FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "orders_delete_admin" ON orders;
CREATE POLICY "orders_delete_admin" ON orders FOR DELETE USING (true);
DROP POLICY IF EXISTS "order_items_delete_admin" ON order_items;
CREATE POLICY "order_items_delete_admin" ON order_items FOR DELETE USING (true);
DROP POLICY IF EXISTS "ratings_delete_admin" ON ratings;
CREATE POLICY "ratings_delete_admin" ON ratings FOR DELETE USING (true);

-- ── 4. Audit log table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  tenant_slug TEXT,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  user_id TEXT,
  user_name TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log (tenant_slug);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);

-- ── 5. RPC: next_order_number ─────────────────────────────────

CREATE OR REPLACE FUNCTION next_order_number()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO next_num FROM orders;
  RETURN next_num;
END;
$$;

-- ── 6. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_ratings_order ON ratings (order_id);
