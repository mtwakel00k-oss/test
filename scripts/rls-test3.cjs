const { createClient } = require("@supabase/supabase-js");
const a = createClient(
  "https://zordvqqjnlmxgtbkrspp.supabase.co",
  "sb_publishable_KGyEeE-KjVyff5Qv8n0BlQ_rJkh8JAr"
);

async function t() {
  // Query information_schema via the REST API
  const { data: tbl, error: te } = await a
    .from("information_schema.tables")
    .select("table_schema, table_name")
    .in("table_name", ["orders", "order_items", "audit_events"]);

  console.log("tables query error:", te?.message || "none");
  if (tbl) console.log("tables:", JSON.stringify(tbl));

  // Check if RLS is enabled: query information_schema for table RLS status
  // Actually, RLS status is in pg_tables, not information_schema.
  // But we can check via a different approach.

  // Check rpc function list
  const { data: rpcs, error: re } = await a.rpc("verify_rls_lockdown");
  console.log("verify_rls_lockdown error:", re?.message || "ok");
}

t().catch(console.error);
