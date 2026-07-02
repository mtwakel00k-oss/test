const { createClient } = require("@supabase/supabase-js");
const a = createClient(
  "https://zordvqqjnlmxgtbkrspp.supabase.co",
  "sb_publishable_KGyEeE-KjVyff5Qv8n0BlQ_rJkh8JAr"
);

async function t() {
  // Try calling verify_rls_lockdown()
  const { data: v, error: ve } = await a.rpc("verify_rls_lockdown");
  console.log("verify_rls_lockdown:");
  console.log("  error:", ve?.message || "none");
  if (v) console.log("  data:", JSON.stringify(v, null, 2));

  // List tables accessible by anon via TRYING to get schema info
  const { data: s, error: se } = await a.from("orders").select("*").limit(1);
  console.log("\norders COUNT:", s?.length, "error:", se?.message || "none");

  // Try inserting a known value to see if we can confirm RLS
  const { data: ins2, error: ie2 } = await a
    .from("orders")
    .insert({ status: "pending", total: 999999, customer_name: "RLS-TEST-SHOULD-FAIL" })
    .select("id")
    .single();
  console.log("INSERT 999999:", ie2?.message || "SUCCEEDED! id=" + (ins2?.id || "").slice(0, 8));
}

t().catch(console.error);
