import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer | null {
  const raw = process.env.SESSION_ENCRYPTION_KEY
  if (!raw) return null
  // Accept both hex (64 chars) and base64 (44 chars) formats
  let key: Buffer
  if (raw.length === 64 && /^[0-9a-f]+$/i.test(raw)) {
    key = Buffer.from(raw, "hex")
  } else {
    // base64 format
    key = Buffer.from(raw, "base64")
  }
  if (key.length !== 32) return null
  return key
}

export interface SessionData {
  email?: string
  role?: string
  slug?: string
}

export function encryptSession(data: SessionData): string {
  const key = getKey()
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_ENCRYPTION_KEY is required in production")
    }
    return JSON.stringify(data)
  }
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const plain = Buffer.from(JSON.stringify(data), "utf-8")
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv:tag:encrypted (all base64)
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64")
  ].join(":")
}

export function decryptSession(token: string): SessionData | null {
  const key = getKey()
  if (!key) return null
  try {
    // Support both formats: new (iv:tag:encrypted) and old (base64url concatenated)
    let iv: Buffer, tag: Buffer, encrypted: Buffer
    if (token.includes(":")) {
      // New format: iv:tag:encrypted
      const [ivB64, tagB64, encryptedB64] = token.split(":")
      iv = Buffer.from(ivB64, "base64")
      tag = Buffer.from(tagB64, "base64")
      encrypted = Buffer.from(encryptedB64, "base64")
    } else {
      // Old format: base64url concatenated [iv][tag][encrypted]
      const raw = Buffer.from(token, "base64url")
      iv = raw.subarray(0, IV_LENGTH)
      tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
      encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH)
    }
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
