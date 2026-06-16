-- ============================================================
-- Multi-Tenant: Master DB schema (reference only)
-- The `tenants` table already exists in the master project.
-- Run this ONLY if creating a fresh master project.
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read tenants"
  ON tenants FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert tenants"
  ON tenants FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update tenants"
  ON tenants FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can delete tenants"
  ON tenants FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================
-- Registered tenants (as of 2026-06-02)
-- ============================================================
-- INSERT INTO tenants (name, slug, supabase_url, supabase_anon_key)
-- VALUES
--   ('Burger House', 'burger-house', 'https://icefntwfwvtonkdyshde.supabase.co', 'sb_publishable_ncZRkGyTv7cDK1TGKARH3A_nuD2l6sZ'),
--   ('بيتزا بلازا', 'pizza-plaza', 'https://icefntwfwvtonkdyshde.supabase.co', 'sb_publishable_ncZRkGyTv7cDK1TGKARH3A_nuD2l6sZ'),
--   ('سوشي كينغ', 'sushi-king', 'https://icefntwfwvtonkdyshde.supabase.co', 'sb_publishable_ncZRkGyTv7cDK1TGKARH3A_nuD2l6sZ');
