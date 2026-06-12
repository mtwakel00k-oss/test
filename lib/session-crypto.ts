import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer {
  const raw = process.env.SESSION_ENCRYPTION_KEY
  if (!raw) throw new Error("SESSION_ENCRYPTION_KEY env var not set")
  const key = Buffer.from(raw, "hex")
  if (key.length !== 32) throw new Error("SESSION_ENCRYPTION_KEY must be 32 bytes (64 hex chars)")
  return key
}

export interface SessionData {
  email?: string
  role?: string
  slug?: string
}

export function encryptSession(data: SessionData): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const plain = Buffer.from(JSON.stringify(data), "utf-8")
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString("base64url")
}

export function decryptSession(token: string): SessionData | null {
  try {
    const key = getKey()
    const raw = Buffer.from(token, "base64url")
    const iv = raw.subarray(0, IV_LENGTH)
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH)
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return JSON.parse(decrypted.toString("utf-8")) as SessionData
  } catch {
    return null
  }
}

export function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf-8")
    const bufB = Buffer.from(b, "utf-8")
    if (bufA.length !== bufB.length) {
      const fake = Buffer.alloc(bufA.length)
      timingSafeEqual(bufA, fake)
      return false
    }
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}
