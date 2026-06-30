import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"

// A simple error fallback component for testing
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>Try again</button>
    </div>
  )
}

describe("ErrorFallback", () => {
  it("renders error message", () => {
    render(<ErrorFallback error={new Error("Test error")} />)
    expect(screen.getByRole("alert")).toBeDefined()
    expect(screen.getByText("Test error")).toBeDefined()
  })

  it("has a retry button", () => {
    render(<ErrorFallback error={new Error("Oops")} />)
    expect(screen.getByText("Try again")).toBeDefined()
  })
})
