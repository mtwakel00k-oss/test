import { describe, it, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("logger", () => {
  it("logs info messages", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const { logger } = await import("@/lib/logger")
    logger.info("test message")
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("test message"))
  })

  it("logs warn messages", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { logger } = await import("@/lib/logger")
    logger.warn("warning")
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("warning"))
  })

  it("logs error messages", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { logger } = await import("@/lib/logger")
    logger.error("error occurred")
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("error occurred"))
  })

  it("handles Error objects in data", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const { logger } = await import("@/lib/logger")
    logger.info("err", new Error("something broke"))
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("something broke"))
  })

  it("handles non-JSON-serializable data gracefully", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const { logger } = await import("@/lib/logger")
    const circular: Record<string, unknown> = { ref: null }
    circular.ref = circular
    logger.info("circular", circular)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("circular"))
  })
})
