import { describe, it, expect } from "vitest"
import { formatPhone } from "@/lib/phone"

describe("formatPhone()", () => {
  it("formats Algerian mobile number", () => {
    expect(formatPhone("0550123456")).toBe("213550123456")
  })

  it("handles already-international number", () => {
    expect(formatPhone("213550123456")).toBe("213550123456")
  })

  it("strips non-digit characters, keeping embedded zeros", () => {
    expect(formatPhone("+213 (0) 550 123 456")).toBe("2130550123456")
  })

  it("strips 00 prefix", () => {
    expect(formatPhone("00213550123456")).toBe("213550123456")
  })

  it("formats French number", () => {
    expect(formatPhone("0612345678", "fr")).toBe("33612345678")
  })

  it("formats US number", () => {
    expect(formatPhone("2125550100", "us")).toBe("12125550100")
  })

  it("formats UK number", () => {
    expect(formatPhone("07123456789", "gb")).toBe("447123456789")
  })

  it("handles empty string", () => {
    expect(formatPhone("")).toBe("213")
  })

  it("falls back to Algeria for unknown country", () => {
    const result = formatPhone("0550123456", "unknown" as never)
    expect(result).toBe("213550123456")
  })
})
