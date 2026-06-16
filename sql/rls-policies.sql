-- ============================================================
-- RLS Policies for Tenant Database
-- Run this in each tenant's Supabase project SQL editor
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- ── produits ──────────────────────────────────────────────────
-- Public read (menu display)
DROP POLICY IF EXISTS "produits_select_public" ON produits;
CREATE POLICY "produits_select_public" ON produits
  FOR SELECT USING (true);

-- Admin write (product management)
DROP POLICY IF EXISTS "produits_insert_admin" ON produits;
CREATE POLICY "produits_insert_admin" ON produits
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "produits_update_admin" ON produits;
CREATE POLICY "produits_update_admin" ON produits
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "produits_delete_admin" ON produits;
CREATE POLICY "produits_delete_admin" ON produits
  FOR DELETE USING (true);

-- ── categories ────────────────────────────────────────────────
DROP POLICY IF EXISTS "categories_select_public" ON categories;
CREATE POLICY "categories_select_public" ON categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
CREATE POLICY "categories_insert_admin" ON categories
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
CREATE POLICY "categories_delete_admin" ON categories
  FOR DELETE USING (true);

-- ── orders ────────────────────────────────────────────────────
-- Public insert (customer places order)
DROP POLICY IF EXISTS "orders_insert_public" ON orders;
CREATE POLICY "orders_insert_public" ON orders
  FOR INSERT WITH CHECK (true);

-- Public read own (by session order id — currently all read)
DROP POLICY IF EXISTS "orders_select_public" ON orders;
CREATE POLICY "orders_select_public" ON orders
  FOR SELECT USING (true);

-- Staff update (kitchen/pos status changes)
DROP POLICY IF EXISTS "orders_update_staff" ON orders;
CREATE POLICY "orders_update_staff" ON orders
  FOR UPDATE USING (true) WITH CHECK (true);

-- Admin delete (clear test data)
DROP POLICY IF EXISTS "orders_delete_admin" ON orders;
CREATE POLICY "orders_delete_admin" ON orders
  FOR DELETE USING (true);

-- ── order_items ───────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_insert_public" ON order_items;
CREATE POLICY "order_items_insert_public" ON order_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_select_public" ON order_items;
CREATE POLICY "order_items_select_public" ON order_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "order_items_update_staff" ON order_items;
CREATE POLICY "order_items_update_staff" ON order_items
  FOR UPDATE USING (true) WITH CHECK (true);

-- Admin delete (clear test data)
DROP POLICY IF EXISTS "order_items_delete_admin" ON order_items;
CREATE POLICY "order_items_delete_admin" ON order_items
  FOR DELETE USING (true);

-- ── ratings ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "ratings_insert_public" ON ratings;
CREATE POLICY "ratings_insert_public" ON ratings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "ratings_select_public" ON ratings;
CREATE POLICY "ratings_select_public" ON ratings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "ratings_delete_admin" ON ratings;
CREATE POLICY "ratings_delete_admin" ON ratings
  FOR DELETE USING (true);
