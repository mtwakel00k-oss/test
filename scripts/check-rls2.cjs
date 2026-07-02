const { createClient } = require("@supabase/supabase-js");

async function main() {
  const anon = createClient(
    "https://zordvqqjnlmxgtbkrspp.supabase.co",
    "sb_publishable_KGyEeE-KjVyff5Qv8n0BlQ_rJkh8JAr"
  );

  // Check if anon can INSERT into orders
  const { data: insertResult, error: insertError } = await anon
    .from("orders")
    .insert({ status: "pending", total: 0, customer_name: "test-anon" })
    .select("id")
    .single();

  console.log("anon INSERT into orders:");
  console.log("  data:", insertResult ? JSON.stringify(insertResult) : "null");
  console.log("  error:", insertError?.message || "none");

  // Check current policies via an RPC call if available
  const { data: policies, error: pe } = await anon.rpc("verify_rls_lockdown");
  console.log("\nverify_rls_lockdown RPC:");
  console.log("  data:", policies ? JSON.stringify(policies, null, 2) : "null");
  console.log("  error:", pe?.message || "none");
}

main().catch(console.error);
