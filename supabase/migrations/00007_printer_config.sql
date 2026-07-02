-- ============================================================
--  Migration 00007: Printer configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS printer_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug       TEXT NOT NULL,
  name              TEXT NOT NULL DEFAULT 'Default',
  connection_type   TEXT NOT NULL DEFAULT 'network'
                    CHECK (connection_type IN ('network','usb','bluetooth','browser')),
  ip_address        TEXT NOT NULL DEFAULT '',
  port              INTEGER NOT NULL DEFAULT 9100,
  paper_width       INTEGER NOT NULL DEFAULT 80,
  charset_per_line  INTEGER NOT NULL DEFAULT 42,
  receipt_lang      TEXT NOT NULL DEFAULT 'ar',
  header_text       TEXT NOT NULL DEFAULT '',
  footer_text       TEXT NOT NULL DEFAULT '',
  primary_color     TEXT NOT NULL DEFAULT '#000000',
  show_logo         BOOLEAN NOT NULL DEFAULT true,
  print_receipt     BOOLEAN NOT NULL DEFAULT true,
  print_kitchen     BOOLEAN NOT NULL DEFAULT false,
  copies_receipt    INTEGER NOT NULL DEFAULT 1,
  copies_kitchen    INTEGER NOT NULL DEFAULT 1,
  auto_cut          BOOLEAN NOT NULL DEFAULT true,
  is_default        BOOLEAN NOT NULL DEFAULT false,
  enabled           BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE printer_config ENABLE ROW LEVEL SECURITY;
-- No policies — service_role only (same as orders, order_items, etc.)
