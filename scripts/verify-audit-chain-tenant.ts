/**
 * Hash-chain verification for tenant audit_events.
 * Usage: npx tsx scripts/verify-audit-chain-tenant.ts <slug>
 */
import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"

const tenantSlug = process.argv[2]
if (!tenantSlug) { console.error("Usage: ... <slug>"); process.exit(1) }

// Tenant project URL and anon key
const TENANT_CONFIGS: Record<string, { url: string; key: string }> = {
  "burger-house": {
    url: "https://zordvqqjnlmxgtbkrspp.supabase.co",
    key: "sb_publishable_KGyEeE-KjVyff5Qv8n0BlQ_rJkh8JAr",
  },
}

const cfg = TENANT_CONFIGS[tenantSlug]
if (!cfg) { console.error("Unknown tenant slug:", tenantSlug); process.exit(1) }

const sb = createClient(cfg.url, cfg.key)

function computeHash(row: Record<string, unknown>, prevHash: string): string {
  const input =
    prevHash +
    (row.tenant_slug as string) +
    (row.event_type as string) +
    (row.record_id as string || "") +
    (row.operation as string) +
    ((row.outcome as string) || "success") +
    (row.old_data ? JSON.stringify(row.old_data) : "") +
    (row.new_data ? JSON.stringify(row.new_data) : "") +
    (row.actor_email as string) +
    (row.created_at as string)
  return createHash("sha256").update(input, "utf-8").digest("hex")
}

async function main() {
  console.log(`\nVerifying audit chain for: ${tenantSlug}\n`)

  const { data: rows, error } = await sb
    .from("audit_events")
    .select("*")
    .eq("tenant_slug", tenantSlug)
    .order("seq", { ascending: true })

  if (error) { console.error("Query failed:", error.message); process.exit(1) }
  if (!rows || rows.length === 0) { console.log("No audit events found."); return }

  console.log(`Found ${rows.length} events.\n`)

  let tampered = 0
  let lastExpectedHash = ""

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const expectedHash = computeHash(row, lastExpectedHash)
    const storedHash = row.row_hash as string
    const prevOk = i === 0 || (row.prev_hash as string) === lastExpectedHash

    if (expectedHash !== storedHash) {
      console.error(
        `✗ Row ${i+1} (seq=${row.seq}): hash MISMATCH` +
        ` (stored=${storedHash.slice(0,16)}… expected=${expectedHash.slice(0,16)}…` +
        ` prev_chain=${prevOk ? "OK" : "BROKEN"})`
      )
      tampered++
    } else if (!prevOk) {
      console.error(`✗ Row ${i+1} (seq=${row.seq}): prev_hash CHAIN BREAK`)
      tampered++
    }

    lastExpectedHash = expectedHash
  }

  if (tampered === 0) {
    console.log("✓ Chain integrity verified — all hashes match.")
  } else {
    console.error(`\n⚠ ${tampered} row(s) tampered or corrupted.`)
  }
}

main().catch(console.error)
