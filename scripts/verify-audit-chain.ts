/**
 * Hash-chain verification script for audit_events.
 *
 * Verifies the integrity of the audit hash chain per tenant:
 *   1. Fetches all audit_events rows for a given tenant (in seq order)
 *   2. Recomputes each row_hash from prev_hash + row content
 *   3. Reports any row where the computed hash ≠ stored row_hash
 *
 * Usage:
 *   npx tsx scripts/verify-audit-chain.ts <tenant_slug> [--fix]
 *
 * The --fix flag writes the correct hash back (only useful during debugging —
 * in production a hash mismatch means tampering was detected).
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local.
 */

import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const tenantSlug = process.argv[2]
if (!tenantSlug) {
  console.error("Usage: npx tsx scripts/verify-audit-chain.ts <tenant_slug> [--fix]")
  process.exit(1)
}

const shouldFix = process.argv.includes("--fix")

function computeHash(row: {
  prev_hash: string | null
  tenant_slug: string
  event_type: string
  record_id: string | null
  operation: string
  outcome: string
  old_data: unknown
  new_data: unknown
  actor_email: string
  created_at: string
}): string {
  const input =
    (row.prev_hash || "") +
    row.tenant_slug +
    row.event_type +
    (row.record_id || "") +
    row.operation +
    row.outcome +
    (row.old_data ? JSON.stringify(row.old_data) : "") +
    (row.new_data ? JSON.stringify(row.new_data) : "") +
    row.actor_email +
    row.created_at
  return createHash("sha256").update(input, "utf-8").digest("hex")
}

async function main() {
  const sb = createClient(url!, key!)
  console.log(`\nVerifying audit chain for tenant: ${tenantSlug}\n`)

  const { data: rows, error } = await sb
    .from("audit_events")
    .select("*")
    .eq("tenant_slug", tenantSlug)
    .order("seq", { ascending: true })

  if (error) {
    console.error("Query failed:", error.message)
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log("No audit events found for this tenant.")
    return
  }

  console.log(`Found ${rows.length} events.\n`)

  let tampered = 0
  let lastExpectedHash = ""

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown>
    const expectedHash = computeHash({
      prev_hash: i === 0 ? "" : lastExpectedHash,
      tenant_slug: row.tenant_slug as string,
      event_type: row.event_type as string,
      record_id: row.record_id as string | null,
      operation: row.operation as string,
      outcome: (row.outcome as string) || "success",
      old_data: row.old_data,
      new_data: row.new_data,
      actor_email: row.actor_email as string,
      created_at: row.created_at as string,
    })

    const storedHash = row.row_hash as string
    const prevOk = i === 0 || (row.prev_hash as string) === lastExpectedHash

    if (expectedHash !== storedHash) {
      console.error(
        `✗ ROW ${i + 1} (seq=${row.seq}, id=${row.id?.toString().slice(0, 8)}…): ` +
          `hash MISMATCH (stored=${storedHash.slice(0, 16)}… expected=${expectedHash.slice(0, 16)}…, prev_chain=${prevOk ? "OK" : "BROKEN"})`,
      )
      tampered++

      if (shouldFix) {
        const { error: updateError } = await sb
          .from("audit_events")
          .update({ row_hash: expectedHash, prev_hash: lastExpectedHash })
          .eq("id", row.id as string)

        if (updateError) {
          console.error(`  → Fix FAILED: ${updateError.message}`)
        } else {
          console.log(`  → Fixed ✓`)
        }
      }
    } else if (!prevOk) {
      console.error(
        `✗ ROW ${i + 1} (seq=${row.seq}): prev_hash CHAIN BREAK — stored=${(row.prev_hash as string)?.slice(0, 16)}… expected=${lastExpectedHash.slice(0, 16)}…`,
      )
      tampered++
    }

    lastExpectedHash = expectedHash
  }

  if (tampered === 0) {
    console.log("✓ Chain integrity verified — all hashes match.")
  } else {
    console.error(`\n⚠ ${tampered} row(s) tampered or corrupted.`)
    if (!shouldFix) {
      console.log("Re-run with --fix to correct (only use in controlled recovery).")
    }
    process.exit(tampered > 0 ? 1 : 0)
  }
}

main().catch(console.error)
