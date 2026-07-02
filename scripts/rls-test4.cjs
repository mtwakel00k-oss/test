const { createClient } = require("@supabase/supabase-js");
const a = createClient(
  "https://zordvqqjnlmxgtbkrspp.supabase.co",
  "sb_publishable_KGyEeE-KjVyff5Qv8n0BlQ_rJkh8JAr"
);

async function t() {
  // Try pg_catalog via REST
  for (const tbl of ["pg_class", "pg_policies"]) {
    const { data, error } = await a.from(tbl).select("*").limit(1);
    console.log(tbl + ":", error?.message.slice(0, 80) || "OK rows=" + data?.length);
  }

  // Try Supabase's own rpc to check RLS status
  const { data: rpcs, error: re } = await a.from("pg_proc").select("proname").limit(3);
  console.log("pg_proc:", re?.message.slice(0, 80) || "OK");

  // Let's also check the policies on orders if possible
  const { data: pols, error: pe } = await a
    .from("pg_policies")
    .select("policyname, permissive")
    .eq("tablename", "orders");
  console.log("policies on orders:", pe?.message.slice(0, 80) || JSON.stringify(pols));
}

t().catch(console.error);
