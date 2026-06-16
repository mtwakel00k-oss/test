import { createClient } from "@supabase/supabase-js";

const MASTER_URL = "https://icefntwfwvtonkdyshde.supabase.co";
const MASTER_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "set-me";
const BURGER_TENANT_URL = "https://zordvqqjnlmxgtbkrspp.supabase.co";

const SQL = `
UPDATE orders SET status = 'out_for_delivery' WHERE status = 'on_the_way';
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','preparing','ready','out_for_delivery','completed','cancelled'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('dine_in','takeaway','delivery'));
UPDATE orders SET order_type = 'dine_in' WHERE order_type NOT IN ('dine_in','takeaway','delivery');
CREATE INDEX IF NOT EXISTS idx_orders_type_status ON orders(order_type, status) WHERE status NOT IN ('completed','cancelled');
`;

async function main() {
  const master = createClient(MASTER_URL, MASTER_SVC_KEY);
  
  // Get the burger-house tenant config from master
  const { data: tenant, error: tErr } = await master
    .from("tenants")
    .select("slug, supabase_url, supabase_anon_key")
    .eq("slug", "burger-house")
    .maybeSingle();

  if (tErr || !tenant) {
    console.error("Failed to get tenant:", tErr?.message || "not found");
    process.exit(1);
  }

  console.log(`Tenant: ${tenant.slug} -> ${tenant.supabase_url}`);
  const isSameProject = tenant.supabase_url === MASTER_URL;
  console.log(`Same project as master: ${isSameProject}`);

  if (!isSameProject) {
    console.log("\n=== SEPARATE SUPABASE PROJECT ===");
    console.log(`This tenant is on a different Supabase project: ${tenant.supabase_url}`);
    console.log("Cannot run DDL via REST API.");
    console.log("\nYou can also use the anon key to try data operations:");
    console.log(`Anon key: ${tenant.supabase_anon_key.substring(0, 20)}...`);

    // Try to see if exec_sql exists on tenant
    const tenantClient = createClient(tenant.supabase_url, tenant.supabase_anon_key);
    const { error: rpcErr } = await tenantClient.rpc("exec_sql", { query_text: "SELECT 1" });
    if (rpcErr) {
      console.log(`exec_sql RPC on tenant: NOT available (${rpcErr.message})`);
    } else {
      console.log("exec_sql RPC on tenant: available!");
      // Run the full migration
      const { error: runErr } = await tenantClient.rpc("exec_sql", { query_text: SQL });
      if (runErr) {
        console.log(`Migration execution failed: ${runErr.message}`);
      } else {
        console.log("✅ Migration executed successfully!");
        return;
      }
    }
  } else {
    console.log("\n=== SAME PROJECT AS MASTER ===");
    // Check if exec_sql exists on master
    const { error: checkErr } = await master.rpc("exec_sql", { query_text: "SELECT 1" });
    if (checkErr) {
      console.log(`exec_sql RPC on master: NOT available (${checkErr.message})`);
      // Try creating it via the Supabase Management API
      console.log("Trying Supabase Management API directly...");
      try {
        const resp = await fetch(`https://api.supabase.com/v1/projects/icefntwfwvtonkdyshde/sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${MASTER_SVC_KEY}`,
          },
          body: JSON.stringify({ query: SQL }),
        });
        const text = await resp.text();
        console.log(`Management API: ${resp.status} ${text.substring(0, 500)}`);
        if (resp.ok) {
          console.log("✅ Migration via Management API succeeded!");
          return;
        }
      } catch (e) {
        console.log(`Management API error: ${e.message}`);
      }
    } else {
      console.log("exec_sql RPC exists on master! Running migration...");
      const { error: runErr } = await master.rpc("exec_sql", { query_text: SQL });
      if (runErr) {
        console.log(`Migration failed: ${runErr.message}`);
      } else {
        console.log("✅ Migration executed!");
        return;
      }
    }
  }

  // Fallback
  console.log("\n" + "=".repeat(60));
  console.log("❌ MANUAL MIGRATION REQUIRED");
  console.log("=".repeat(60));
  console.log("\nGo to: https://supabase.com/dashboard/project/zordvqqjnlmxgtbkrspp/sql/new");
  console.log("\nAnd run the SQL from: data/migration-v4-delivery.sql");
  console.log("\nThe SQL to execute:");
  console.log("-".repeat(60));
  console.log(SQL);
}

main().catch(console.error);
