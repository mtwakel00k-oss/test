-- Migration v15: Add is_open column to tenants table (master DB)
-- Run this in your master Supabase project SQL Editor.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT TRUE;

-- All existing tenants default to open
UPDATE tenants SET is_open = TRUE WHERE is_open IS NULL;
