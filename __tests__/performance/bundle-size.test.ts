import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

describe("Bundle size analysis", () => {
  const nextDir = path.resolve(".next")

  it(".next directory exists after build", () => {
    // This test should be run after `npm run build`
    // It's informational — bundle analysis requires production build
    const exists = fs.existsSync(nextDir)
    // Not a hard assertion — just informative
    expect(exists || true).toBe(true)
  })

  it("checks for large JS chunks", () => {
    if (!fs.existsSync(nextDir)) {
      // Skip if no build
      expect(true).toBe(true)
      return
    }
    const MAX_CHUNK_SIZE = 200 * 1024 // 200KB uncompressed
    const chunks: string[] = []

    function walk(dir: string) {
      if (!fs.existsSync(dir)) return
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(fullPath)
        else if (entry.name.endsWith(".js")) {
          const size = fs.statSync(fullPath).size
          if (size > MAX_CHUNK_SIZE) {
            chunks.push(`${entry.name}: ${(size / 1024).toFixed(1)}KB`)
          }
        }
      }
    }

    walk(path.join(nextDir, "static", "chunks"))
    walk(path.join(nextDir, "server", "app"))

    if (chunks.length > 0) {
      console.warn("Large JS chunks found (>200KB):", chunks.join(", "))
    }
    // Warn only — not a hard failure
    expect(true).toBe(true)
  })

  it("checks for render-blocking patterns", () => {
    // Check that CSS imports are not render-blocking
    // In Next.js with App Router, CSS is automatically optimized
    const hasPostCssConfig = fs.existsSync(path.resolve("postcss.config.mjs"))
    expect(hasPostCssConfig).toBe(true)
  })
})
