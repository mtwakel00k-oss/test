import { describe, it, expect, vi, afterEach } from "vitest"
import { debounce } from "@/lib/debounce"

afterEach(() => {
  vi.useRealTimers()
})

describe("debounce()", () => {
  it("delays execution", () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("cancels previous pending call on new invocation", () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    debounced()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("`.cancel()` prevents execution", () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    debounced.cancel()
    vi.advanceTimersByTime(100)
    expect(fn).not.toHaveBeenCalled()
  })

  it("passes arguments to the original function", () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 50)
    debounced("a", 1, true)
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledWith("a", 1, true)
  })
})
