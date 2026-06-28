import { describe, it, expect } from "vitest"
import { phoneSchema, checkoutFormSchema, phoneRegex } from "@/lib/validations"

describe("validations", () => {
  describe("phoneRegex", () => {
    it("matches valid Algerian mobile", () => {
      expect(phoneRegex.test("0550123456")).toBe(true)
      expect(phoneRegex.test("0650123456")).toBe(true)
      expect(phoneRegex.test("0750123456")).toBe(true)
    })

    it("rejects invalid numbers", () => {
      expect(phoneRegex.test("")).toBe(false)
      expect(phoneRegex.test("1234")).toBe(false)
      expect(phoneRegex.test("0150123456")).toBe(false)
      expect(phoneRegex.test("055012345")).toBe(false)
    })
  })

  describe("phoneSchema", () => {
    it("accepts valid phone", () => {
      const result = phoneSchema.safeParse("0550123456")
      expect(result.success).toBe(true)
    })

    it("rejects invalid phone", () => {
      const result = phoneSchema.safeParse("1234")
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("غير صحيح")
      }
    })
  })

  describe("checkoutFormSchema", () => {
    it("accepts minimal valid data", () => {
      const result = checkoutFormSchema.safeParse({ name: "Ahmed" })
      expect(result.success).toBe(true)
    })

    it("rejects empty name", () => {
      const result = checkoutFormSchema.safeParse({ name: "" })
      expect(result.success).toBe(false)
    })

    it("accepts optional fields", () => {
      const result = checkoutFormSchema.safeParse({
        name: "Ahmed",
        phone: "0550123456",
        table: "5",
        deliveryAddress: "Algiers",
      })
      expect(result.success).toBe(true)
    })
  })
})
