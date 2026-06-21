import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getTenantConfig, parseSession } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

const TENANT_MIGRATION = `
-- ============================================================
--  Tenant Migration V3 — Self-healing schema (idempotent)
--  Safe to re-run; all statements use IF NOT EXISTS / DROP IF
-- ============================================================

-- 1) Missing columns on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'dine_in';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INT;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','preparing','ready','out_for_delivery','completed','cancelled'));

-- 2) Missing columns on produits
ALTER TABLE produits ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
UPDATE produits SET is_available = TRUE WHERE is_available IS NULL;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3) Missing columns on ratings
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE;

-- 4) Missing columns on categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;

-- 5) Seed tailles if empty (S/M/L/XL/XXL)
INSERT INTO tailles (code, label)
SELECT * FROM (VALUES ('L', 'Large'), ('XL', 'Extra Large'), ('XXL', 'Double Extra Large'), ('M', 'Medium'), ('S', 'Small'))
AS v(code, label)
WHERE NOT EXISTS (SELECT 1 FROM tailles);

-- 6) Recreate v_products_flat with all columns
DROP VIEW IF EXISTS v_products_flat;
CREATE VIEW v_products_flat AS
WITH prix_agg AS (
  SELECT pr.produit_id, COALESCE(t.code, 'UNIQUE') AS taille_code,
    MIN(CASE WHEN bs.id = 1 THEN pr.prix END) AS sauce_tomate,
    MIN(CASE WHEN bs.id = 2 THEN pr.prix END) AS creme_fraiche,
    MIN(CASE WHEN bs.id IS NULL THEN pr.prix END) AS standard
  FROM prix pr
  LEFT JOIN tailles t ON t.id = pr.taille_id
  LEFT JOIN bases_sauce bs ON bs.id = pr.base_sauce_id
  WHERE pr.disponible
  GROUP BY pr.produit_id, t.code
)
SELECT p.id, p.nom AS name, p.description, p.image_url,
  c.nom AS category, p.est_speciale, p.is_available,
  EXISTS(SELECT 1 FROM prix pr JOIN bases_sauce bs ON bs.id = pr.base_sauce_id WHERE pr.produit_id = p.id AND bs.id = 2) AS has_white_sauce,
  COALESCE((SELECT jsonb_object_agg(taille_code, jsonb_build_object('sauce_tomate', sauce_tomate, 'creme_fraiche', creme_fraiche, 'standard', standard)) FROM prix_agg WHERE produit_id = p.id), '{}'::jsonb) AS prices
FROM produits p
JOIN categories c ON c.id = p.categorie_id
ORDER BY c.id, p.id;

-- 7) Storage bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, false, 5242880, '{image/png,image/jpeg,image/webp,image/gif}')
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
CREATE POLICY "product_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
CREATE POLICY "product_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
CREATE POLICY "product_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');

-- 8) RLS policies — allow admin writes, delete privileges
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prix ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_delete_admin" ON orders; CREATE POLICY "orders_delete_admin" ON orders FOR DELETE USING (true);
DROP POLICY IF EXISTS "order_items_delete_admin" ON order_items; CREATE POLICY "order_items_delete_admin" ON order_items FOR DELETE USING (true);
DROP POLICY IF EXISTS "ratings_delete_admin" ON ratings; CREATE POLICY "ratings_delete_admin" ON ratings FOR DELETE USING (true);
DROP POLICY IF EXISTS "categories_admin_all" ON categories; CREATE POLICY "categories_admin_all" ON categories FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "categories_public_select" ON categories; CREATE POLICY "categories_public_select" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "produits_admin_all" ON produits; CREATE POLICY "produits_admin_all" ON produits FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "produits_public_select" ON produits; CREATE POLICY "produits_public_select" ON produits FOR SELECT USING (true);
DROP POLICY IF EXISTS "prix_admin_all" ON prix; CREATE POLICY "prix_admin_all" ON prix FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tailles_admin_all" ON tailles; CREATE POLICY "tailles_admin_all" ON tailles FOR ALL USING (true) WITH CHECK (true);

-- 9) V9: Driver live location tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_lng DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_location_updated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_driver_location ON orders(driver_id, status) WHERE status = 'out_for_delivery';

-- 10) V10: Public order tracking RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select_public" ON orders;
CREATE POLICY "orders_select_public" ON orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "order_items_select_public" ON order_items;
CREATE POLICY "order_items_select_public" ON order_items FOR SELECT USING (true);

-- 11) V11: Delivery men table
CREATE TABLE IF NOT EXISTS delivery_men (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug     TEXT NOT NULL,
  name            TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  is_busy         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_men_tenant_slug ON delivery_men(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_delivery_men_available ON delivery_men(tenant_slug, is_busy) WHERE is_busy = false;
ALTER TABLE delivery_men ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_man_id') THEN
    ALTER TABLE orders ADD COLUMN delivery_man_id UUID REFERENCES delivery_men(id) ON DELETE SET NULL;
  END IF;
END $$;
DROP POLICY IF EXISTS "delivery_men_select_authenticated" ON delivery_men;
CREATE POLICY "delivery_men_select_authenticated" ON delivery_men FOR SELECT USING (true);
DROP POLICY IF EXISTS "delivery_men_insert_admin" ON delivery_men;
CREATE POLICY "delivery_men_insert_admin" ON delivery_men FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "delivery_men_update_admin" ON delivery_men;
CREATE POLICY "delivery_men_update_admin" ON delivery_men FOR UPDATE USING (true);
DROP POLICY IF EXISTS "delivery_men_delete_admin" ON delivery_men;
CREATE POLICY "delivery_men_delete_admin" ON delivery_men FOR DELETE USING (true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;

-- 12) Atomic daily order numbers
CREATE TABLE IF NOT EXISTS daily_order_counters (
  day DATE PRIMARY KEY,
  counter INT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_order_number()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  next_num INT;
BEGIN
  INSERT INTO daily_order_counters (day, counter)
  VALUES (today, 1)
  ON CONFLICT (day) DO UPDATE
  SET counter = daily_order_counters.counter + 1
  RETURNING counter INTO next_num;
  RETURN next_num;
END;
$$;
`

interface TableSchema {
  name: string
  existing_columns: string[]
  missing_columns: string[]
  status: "ok" | "missing" | "error"
}

const EXPECTED_COLUMNS: Record<string, string[]> = {
  produits: ["id", "nom", "description", "categorie_id", "est_speciale", "is_available", "image_url"],
  orders: ["id", "customer_name", "customer_phone", "table_number", "status", "total", "created_at", "payment_status", "order_type", "order_number", "delivery_address", "delivery_lat", "delivery_lng", "driver_id", "driver_lat", "driver_lng", "driver_location_updated_at", "delivery_man_id", "restaurant_id"],
  order_items: ["id", "order_id", "product_id", "product_name", "size", "sauce", "quantity", "unit_price", "subtotal"],
  ratings: ["id", "order_id", "rating", "comment", "created_at"],
  categories: ["id", "nom", "description"],
}

async function detectColumns(
  client: ReturnType<typeof createClient>,
  tableName: string,
  expected: string[]
): Promise<{ existing: string[]; missing: string[] }> {
  const { error: bulkError } = await client.from(tableName).select(expected.join(",")).limit(1)
  if (!bulkError) {
    return { existing: expected, missing: [] }
  }

  const results = await Promise.all(
    expected.map(async (col) => {
      const { error } = await client.from(tableName).select(col).limit(1)
      return { col, exists: !error }
    })
  )

  return {
    existing: results.filter((r) => r.exists).map((r) => r.col),
    missing: results.filter((r) => !r.exists).map((r) => r.col),
  }
}

async function checkTable(client: ReturnType<typeof createClient>, tableName: string, expected: string[]): Promise<TableSchema> {
  try {
    const { existing, missing } = await detectColumns(client, tableName, expected)

    return {
      name: tableName,
      existing_columns: existing,
      missing_columns: missing,
      status: missing.length === 0 ? "ok" : "missing",
    }
  } catch (e) {
    logger.error(`checkTable failed for ${tableName}`, e)
    return { name: tableName, existing_columns: [], missing_columns: expected, status: "error" }
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = parseSession(req.headers.get("cookie") || "")
    if (session.role !== "admin" && session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const slug = url.searchParams.get("slug") || ""

    let client: ReturnType<typeof createClient>

    if (slug) {
      const tenant = await getTenantConfig(slug)
      if (!tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
      }
      client = createClient(tenant.supabase_url, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    } else {
      client = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL!,
        env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
    }

    const tableNames = Object.keys(EXPECTED_COLUMNS)
    const results = await Promise.all(
      tableNames.map((name) => checkTable(client, name, EXPECTED_COLUMNS[name]))
    )

    const allOk = results.every((t) => t.status === "ok")

    return NextResponse.json({
      slug: slug || "(master)",
      tables: results,
      migration_sql: allOk ? null : TENANT_MIGRATION,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error"
    logger.error("db-schema health check failed", e)
    return NextResponse.json({ error: "Internal Server Error", details: msg }, { status: 500 })
  }
}
