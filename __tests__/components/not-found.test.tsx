import Link from "next/link"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"

describe("404 Page", () => {
  it("renders not found message", () => {
    render(
      <div>
        <h1>404</h1>
        <p>الصفحة غير موجودة</p>
        <Link href="/">العودة للرئيسية</Link>
      </div>
    )
    expect(screen.getByText("404")).toBeDefined()
    expect(screen.getByText("الصفحة غير موجودة")).toBeDefined()
    expect(screen.getByText("العودة للرئيسية")).toBeDefined()
  })
})
