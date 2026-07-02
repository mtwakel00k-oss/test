const { createClient } = require("@supabase/supabase-js");

async function t() {
  // Use service_role key via master DB to check tenant's orders table
  const svc = createClient(
    "https://icefntwfwvtonkdyshde.supabase.co",
    "REDACTED_SERVICE_ROLE_KEY"
  );

  // Try to query the tenant's RLS status through master
  // Actually, we can't - they're separate projects.

  // Let's instead verify behaviorally
  const anon = createClient(
    "https://zordvqqjnlmxgtbkrspp.supabase.co",
    "sb_publishable_KGyEeE-KjVyff5Qv8n0BlQ_rJkh8JAr"
  );

  // Check if anon can DELETE from orders
  const { error: de } = await anon
    .from("orders")
    .delete()
    .eq("customer_name", "RLS-TEST-SHOULD-FAIL");
  console.log("DELETE (RLS-TEST):", de?.message || "OK (no error)");

  // Check if anon can UPDATE orders
  const { error: ue } = await anon
    .from("orders")
    .update({ customer_name: "hacked-by-anon" })
    .eq("customer_name", "test-rls");
  console.log("UPDATE (test-rls):", ue?.message || "OK (no error)");

  // Clean up test data using the anon key (which shouldn't work if RLS is on)
  const { data: allRows } = await anon.from("orders").select("id,customer_name").limit(10);
  console.log("\nAll orders:");
  if (allRows) allRows.forEach((r) => console.log("  " + r.id.slice(0, 8) + " " + r.customer_name));
}

t().catch(console.error);
