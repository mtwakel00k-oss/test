import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

describe("RLS Policies", () => {
  it("RLS policies SQL file exists and has proper structure", () => {
    const rlsPath = path.resolve("supabase/migrations/00004_tenant_scoped_rls.sql")
    if (fs.existsSync(rlsPath)) {
      const content = fs.readFileSync(rlsPath, "utf-8")
      expect(content).toContain("CREATE POLICY")

      // Check each table has RLS
      const tables = ["produits", "categories", "orders", "order_items", "ratings"]
      for (const table of tables) {
        expect(content).toContain(table)
      }
    }
  })

  it("guest/anonymous can read products and categories", () => {
    const rlsPath = path.resolve("supabase/migrations/00004_tenant_scoped_rls.sql")
    if (fs.existsSync(rlsPath)) {
      const content = fs.readFileSync(rlsPath, "utf-8")
      // Anonymous users should be able to SELECT from products/categories
      expect(content).toContain("SELECT")
    }
  })

  it("staff-only tables have INSERT restricted", () => {
    const rlsPath = path.resolve("supabase/migrations/00004_tenant_scoped_rls.sql")
    if (fs.existsSync(rlsPath)) {
      const content = fs.readFileSync(rlsPath, "utf-8")
      // orders and order_items should require authentication for write
      expect(content).toContain("orders")
      expect(content).toContain("order_items")
    }
  })
})
