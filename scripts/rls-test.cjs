const { createClient } = require("@supabase/supabase-js");
const a = createClient(
  "https://zordvqqjnlmxgtbkrspp.supabase.co",
  "sb_publishable_KGyEeE-KjVyff5Qv8n0BlQ_rJkh8JAr"
);

async function t() {
  const { data: ins, error: ie } = await a
    .from("orders")
    .insert({ status: "pending", total: 0, customer_name: "test-rls" })
    .select("id")
    .single();
  console.log("INSERT:", ie?.message || "OK id=" + (ins?.id || "").slice(0, 8));

  const { data: sel, error: se } = await a
    .from("orders")
    .select("id,customer_name")
    .limit(3);
  console.log("SELECT:", (sel?.length + " rows") || se?.message);
  if (sel && sel.length > 0) {
    console.log("  rows:", sel.map((r) => r.customer_name).join(", "));
  }
}

t().catch(console.error);
