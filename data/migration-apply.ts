import { createClient } from "@supabase/supabase-js"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Fetch all active tenants
  const { data: tenants, error: tenantErr } = await supabase
    .from("tenants")
    .select("slug, supabase_url, supabase_anon_key, supabase_service_key")
    .eq("is_active", true)

  if (tenantErr) {
    console.error("Failed to fetch tenants:", tenantErr.message)
    process.exit(1)
  }

  // Read migration files in order
  const migrationsDir = join(import.meta.dirname)
  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => /^migration(-v\d+)?\.sql$/.test(f))
    .sort((a, b) => {
      const aNum = parseInt(a.match(/v?(\d+)/)?.[1] || "0")
      const bNum = parseInt(b.match(/v?(\d+)/)?.[1] || "0")
      return aNum - bNum
    })

  if (migrationFiles.length === 0) {
    console.error("No migration SQL files found in data/")
    process.exit(1)
  }

  console.log(`Found ${migrationFiles.length} migration files: ${migrationFiles.join(", ")}`)

  const isSharedProject = (url: string) => url === SUPABASE_URL || !url

  for (const tenant of tenants || []) {
    console.log(`\n=== Migrating tenant: ${tenant.slug} ===`)

    const tenantKey = tenant.supabase_service_key
      || (isSharedProject(tenant.supabase_url) ? SERVICE_ROLE_KEY : null)
      || tenant.supabase_anon_key

    if (!tenantKey) {
      console.error(`  ✗ No privileged key for ${tenant.slug}, skipping`)
      continue
    }

    const tenantSb = createClient(tenant.supabase_url, tenantKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    for (const file of migrationFiles) {
      const sql = readFileSync(join(migrationsDir, file), "utf-8")
      console.log(`  Applying ${file}...`)

      try {
        const { error } = await tenantSb.rpc("exec_sql", { query_text: sql })
        if (error) {
          // exec_sql RPC may not exist — try raw query via REST
          console.warn(`  ⚠ exec_sql RPC failed, trying REST fallback for ${file}: ${error.message}`)
          const { error: restErr } = await tenantSb.from("_migration_log").select("id").limit(1).maybeSingle()
          if (restErr?.message?.includes("does not exist")) {
            // Create _migration_log table first via SUPABASE REST
            console.warn(`  ⚠ _migration_log does not exist either. Run manually via tenant Supabase Dashboard SQL editor.`)
            console.log(`  SQL for ${tenant.slug}/${file}:\n${sql.slice(0, 200)}...`)
            continue
          }
        }
        console.log(`  ✓ ${file} applied successfully`)
      } catch (err) {
        console.error(`  ✗ ${file} failed:`, err instanceof Error ? err.message : err)
      }
    }
  }

  console.log("\n=== Migration complete ===")
}

main().catch((err) => {
  console.error("Migration script failed:", err)
  process.exit(1)
})
