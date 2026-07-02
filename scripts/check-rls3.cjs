const { createClient } = require("@supabase/supabase-js");

async function main() {
  const anon = createClient(
    "https://zordvqqjnlmxgtbkrspp.supabase.co",
    "sb_publishable_KGyEeE-KjVyff5Qv8n0BlQ_rJkh8JAr"
  );

  // Try UPDATE on orders (should fail if RLS is on with no policies)
  const { data: upd, error: ue } = await anon
    .from("orders")
    .update({ customer_name: "hacker" })
    .eq("id", "00000000-0000-0000-0000-000000000000");
  console.log("orders UPDATE (nonexistent ID):");
  console.log("  data:", upd ? JSON.stringify(upd).slice(0, 100) : "null");
  console.log("  error:", ue?.message || "none");

  // Try DELETE on orders
  const { error: de } = await anon
    .from("orders")
    .delete()
    .eq("id", "00000000-0000-0000-0000-000000000000");
  console.log("orders DELETE:");
  console.log("  error:", de?.message || "none");

  // Try SELECT from rate_limits (if table exists)
  const { data: rl, error: re } = await anon.from("rate_limits").select("key").limit(1);
  console.log("rate_limits SELECT:");
  console.log("  data:", rl ? rl.length : "null");
  console.log("  error:", re?.message || "none");

  // Try to check audit_log (old table) anon access
  const { data: al, error: ale } = await anon.from("audit_log").select("id").limit(1);
  console.log("audit_log SELECT:");
  console.log("  data:", al ? al.length : "null");
  console.log("  error:", ale?.message || "none");
}

main().catch(console.error);
