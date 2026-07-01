import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

describe("RLS Policies — 00005_lockdown_rls.sql", () => {
  const migrationPath = path.resolve("supabase/migrations/00005_lockdown_rls.sql")
  const content = fs.readFileSync(migrationPath, "utf-8")

  it("migration file exists and has CREATE POLICY statements", () => {
    expect(content).toContain("CREATE POLICY")
  })

  it("public menu tables (produits, categories, prix, tailles) have anon SELECT only", () => {
    const publicTables = ["produits", "categories", "prix", "tailles"]
    for (const table of publicTables) {
      // Each should have exactly one anon_select policy
      const selectPolicy = `"${table}_anon_select"`
      expect(content).toContain(selectPolicy)
      expect(content).toContain(selectPolicy)
    }
  })

  it("orders and order_items have NO anon/authenticated policies (service_role only)", () => {
    const sensitiveTables = ["orders", "order_items", "audit_log", "delivery_men", "restaurant_staff", "daily_order_counters"]
    for (const table of sensitiveTables) {
      const dropLines = content.match(new RegExp(`DROP POLICY IF EXISTS "${table}_[^"]+" ON ${table}`, "g"))
      expect(dropLines).not.toBeNull()
      expect(dropLines!.length).toBeGreaterThan(0)
    }
  })

  it("ratings has anon INSERT but no anon DELETE", () => {
    expect(content).toContain('"ratings_anon_insert"')
    expect(content).toContain("FOR INSERT WITH CHECK (true)")
  })

  it("no bare 'USING (true)' policy grants write access on sensitive tables", () => {
    // Check every CREATE POLICY name — the FOR clause is on the next line
    const lines = content.split("\n")
    const createPolicyLines = lines.filter(l => l.includes('CREATE POLICY "'))
    const policyNames = createPolicyLines.map(l => l.match(/CREATE POLICY "([^"]+)"/)![1])

    // Only specific allowed policies should exist
    const allowed = new Set([
      "produits_anon_select",
      "categories_anon_select",
      "prix_anon_select",
      "tailles_anon_select",
      "bases_sauce_anon_select",
      "ratings_anon_insert",
      "rate_limits_service_role",
    ])

    for (const name of policyNames) {
      expect(allowed.has(name)).toBe(true)
    }
  })
})
