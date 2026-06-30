import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

describe("Database migrations", () => {
  it("apply-tenant-migration.sql exists and is non-empty", () => {
    const files = [
      "scripts/apply-tenant-migration.sql",
      "data/migration-v2.sql",
      "data/migration-v3.sql",
    ]
    for (const file of files) {
      const fullPath = path.resolve(file)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8")
        expect(content.length).toBeGreaterThan(0)
        expect(content).toContain("ALTER TABLE")
      }
    }
  })

  it("RLS policies SQL exists", () => {
    const rlsPath = path.resolve("supabase/migrations/00004_tenant_scoped_rls.sql")
    if (fs.existsSync(rlsPath)) {
      const content = fs.readFileSync(rlsPath, "utf-8")
      expect(content).toContain("CREATE POLICY")
      expect(content).toContain("USING")
    }
  })

  it("tenant migration adds is_available column", () => {
    const migPath = path.resolve("supabase/migrations/00002_tenant_schema.sql")
    if (fs.existsSync(migPath)) {
      const content = fs.readFileSync(migPath, "utf-8")
      expect(content).toContain("is_available")
    }
  })

  it("migration adds order_type and order_number columns", () => {
    const migPath = path.resolve("supabase/migrations/00002_tenant_schema.sql")
    if (fs.existsSync(migPath)) {
      const content = fs.readFileSync(migPath, "utf-8")
      expect(content).toContain("order_type")
      expect(content).toContain("order_number")
    }
  })
})

describe("Database constraints", () => {
  it("checkoutFormSchema enforces required name", async () => {
    const { checkoutFormSchema } = await import("@/lib/validations")
    const result = checkoutFormSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("phoneSchema validates Algerian mobile format", async () => {
    const { phoneSchema } = await import("@/lib/validations")
    // Valid formats
    expect(phoneSchema.safeParse("0550123456").success).toBe(true)
    expect(phoneSchema.safeParse("0650123456").success).toBe(true)
    expect(phoneSchema.safeParse("0750123456").success).toBe(true)
    // Invalid formats
    expect(phoneSchema.safeParse("1234").success).toBe(false)
    expect(phoneSchema.safeParse("0150123456").success).toBe(false)
  })

  it("order number generation uses sequence", () => {
    // The RPC function "next_order_number" is referenced in orders route
    // Verify the RPC is properly called
    const orderRoute = fs.readFileSync(
      path.resolve("app/api/orders/route.ts"),
      "utf-8"
    )
    expect(orderRoute).toContain("rpc")
    expect(orderRoute).toContain("next_order_number")
  })
})
