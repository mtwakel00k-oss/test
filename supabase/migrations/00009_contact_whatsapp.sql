-- Migration 00009: Add contact_whatsapp column to tenants table
-- This stores the admin's WhatsApp number for contact form notifications.

ALTER TABLE IF EXISTS tenants
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT DEFAULT '';
