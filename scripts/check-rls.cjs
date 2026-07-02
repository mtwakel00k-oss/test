const { createClient } = require("@supabase/supabase-js");

async function main() {
  const anon = createClient(
    "https://zordvqqjnlmxgtbkrspp.supabase.co",
    "sb_publishable_KGyEeE-KjVyff5Qv8n0BlQ_rJkh8JAr"
  );

  const checks = [
    ["orders", "orders"],
    ["order_items", "order_items"],
    ["audit_events", "audit_events"],
    ["audit_write_failures", "audit_write_failures"],
    ["produits", "produits"],
    ["categories", "categories"],
  ];

  for (const [label, table] of checks) {
    const { data, error } = await anon.from(table).select("id").limit(1);
    const status = error
      ? `ERROR: ${error.message}`
      : data.length === 0
        ? "OK (empty — RLS blocks anon)"
        : `DATA FOUND (${data.length} rows)`;
    console.log(`${label.padEnd(25)} ${status}`);
  }
}

main().catch(console.error);
