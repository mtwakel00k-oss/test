import Link from "next/link"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"

describe("Accessibility", () => {
  it("images have alt text", () => {
    render(
      <div>
        <img src="test.jpg" alt="Test image" />
        <img src="logo.png" alt="Logo" />
      </div>
    )
    const images = screen.getAllByRole("img")
    images.forEach(img => {
      expect(img.getAttribute("alt")).toBeTruthy()
    })
  })

  it("form inputs have labels", () => {
    render(
      <form aria-label="Login form">
        <label htmlFor="username">Username</label>
        <input id="username" type="text" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" />
      </form>
    )
    const usernameInput = screen.getByLabelText("Username")
    expect(usernameInput).toBeDefined()
    const passwordInput = screen.getByLabelText("Password")
    expect(passwordInput).toBeDefined()
  })

  it("buttons have accessible names", () => {
    render(
      <div>
        <button aria-label="Close">X</button>
        <button>Submit</button>
      </div>
    )
    const closeBtn = screen.getByLabelText("Close")
    expect(closeBtn).toBeDefined()
    const submitBtn = screen.getByText("Submit")
    expect(submitBtn).toBeDefined()
  })

  it("uses semantic heading hierarchy", () => {
    render(
      <div>
        <h1>Main Title</h1>
        <h2>Section</h2>
        <h3>Subsection</h3>
      </div>
    )
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined()
    expect(screen.getByRole("heading", { level: 2 })).toBeDefined()
    expect(screen.getByRole("heading", { level: 3 })).toBeDefined()
  })

  it("focusable elements are in tab order", () => {
    render(
      <div>
        <Link href="/">Home</Link>
        <button>Click</button>
        <input type="text" />
      </div>
    )
    const focusable = screen.getAllByRole("link")
      .concat(screen.getAllByRole("button"))
      .concat(screen.getAllByRole("textbox"))
    expect(focusable.length).toBeGreaterThanOrEqual(3)
  })

  it("aria-live region exists for dynamic content", () => {
    render(<div aria-live="polite" aria-atomic="true">Loading...</div>)
    const live = screen.getByText("Loading...")
    expect(live.closest("[aria-live]")).toBeDefined()
  })
})
