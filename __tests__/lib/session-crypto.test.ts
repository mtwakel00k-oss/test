import { describe, it, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  vi.resetModules()
})

describe("session-crypto", () => {
  describe("without encryption key (dev fallback)", () => {
    beforeEach(() => {
      vi.stubEnv("SESSION_ENCRYPTION_KEY", "")
    })

    it("encryptSession returns JSON string when no key", async () => {
      const { encryptSession } = await import("@/lib/session-crypto")
      const result = encryptSession({ email: "test@test.com", role: "admin" })
      expect(result).toBe('{"email":"test@test.com","role":"admin"}')
    })

    it("decryptSession returns null when no key", async () => {
      const { decryptSession } = await import("@/lib/session-crypto")
      expect(decryptSession("anything")).toBeNull()
    })
  })

  describe("with encryption key", () => {
    beforeEach(() => {
      vi.stubEnv("SESSION_ENCRYPTION_KEY", Buffer.from("a".repeat(32), "utf-8").toString("base64"))
    })

    it("encrypts and decrypts session data", async () => {
      const { encryptSession, decryptSession } = await import("@/lib/session-crypto")
      const data = { email: "admin@test.com", role: "admin", slug: "burger-house" }
      const token = encryptSession(data)
      expect(token).toContain(":")
      const decrypted = decryptSession(token)
      expect(decrypted).toEqual(data)
    })

    it("returns null for tampered token", async () => {
      const { encryptSession, decryptSession } = await import("@/lib/session-crypto")
      const token = encryptSession({ email: "test@test.com" })
      const tampered = token.split(":").slice(0, 2).join(":") + ":badciphertext"
      const result = decryptSession(tampered)
      expect(result).toBeNull()
    })
  })

  describe("constantTimeCompare()", () => {
    it("returns true for matching strings", async () => {
      const { constantTimeCompare } = await import("@/lib/session-crypto")
      expect(constantTimeCompare("hello", "hello")).toBe(true)
    })

    it("returns false for different strings", async () => {
      const { constantTimeCompare } = await import("@/lib/session-crypto")
      expect(constantTimeCompare("hello", "world")).toBe(false)
    })
  })
})
