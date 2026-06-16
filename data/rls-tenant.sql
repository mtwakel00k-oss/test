-- ============================================================
-- RLS Policies for Tenant Databases
-- Run this in EACH tenant's Supabase SQL Editor.
-- Ensures only authenticated users can write to business tables.
-- ============================================================

-- Enable RLS on tenant tables (idempotent)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prix ENABLE ROW LEVEL SECURITY;

-- Orders: authenticated users can read all, only authenticated can write
DROP POLICY IF EXISTS "orders_select_all" ON orders;
CREATE POLICY "orders_select_all" ON orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "orders_insert_auth" ON orders;
CREATE POLICY "orders_insert_auth" ON orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "orders_update_auth" ON orders;
CREATE POLICY "orders_update_auth" ON orders
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "orders_delete_auth" ON orders;
CREATE POLICY "orders_delete_auth" ON orders
  FOR DELETE USING (auth.role() = 'authenticated');

-- Order items: authenticated users can read all, only authenticated can write
DROP POLICY IF EXISTS "order_items_select_all" ON order_items;
CREATE POLICY "order_items_select_all" ON order_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "order_items_insert_auth" ON order_items;
CREATE POLICY "order_items_insert_auth" ON order_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "order_items_update_auth" ON order_items;
CREATE POLICY "order_items_update_auth" ON order_items
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "order_items_delete_auth" ON order_items;
CREATE POLICY "order_items_delete_auth" ON order_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- Products (produits): public read, authenticated write
DROP POLICY IF EXISTS "produits_select_all" ON produits;
CREATE POLICY "produits_select_all" ON produits
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "produits_insert_auth" ON produits;
CREATE POLICY "produits_insert_auth" ON produits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "produits_update_auth" ON produits;
CREATE POLICY "produits_update_auth" ON produits
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "produits_delete_auth" ON produits;
CREATE POLICY "produits_delete_auth" ON produits
  FOR DELETE USING (auth.role() = 'authenticated');

-- Categories: public read, authenticated write
DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all" ON categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_insert_auth" ON categories;
CREATE POLICY "categories_insert_auth" ON categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "categories_update_auth" ON categories;
CREATE POLICY "categories_update_auth" ON categories
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "categories_delete_auth" ON categories;
CREATE POLICY "categories_delete_auth" ON categories
  FOR DELETE USING (auth.role() = 'authenticated');

-- Prices (prix): public read, authenticated write
DROP POLICY IF EXISTS "prix_select_all" ON prix;
CREATE POLICY "prix_select_all" ON prix
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "prix_insert_auth" ON prix;
CREATE POLICY "prix_insert_auth" ON prix
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "prix_update_auth" ON prix;
CREATE POLICY "prix_update_auth" ON prix
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "prix_delete_auth" ON prix;
CREATE POLICY "prix_delete_auth" ON prix
  FOR DELETE USING (auth.role() = 'authenticated');
