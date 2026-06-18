import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CategoryFilter } from "@/components/category-filter"

vi.mock("@/lib/use-translation", () => ({
  useTranslation: () => ({
    lang: "ar",
    dir: "rtl" as const,
    t: (key: string) => {
      const m: Record<string, string> = { "menu.all": "الكل" }
      return m[key] ?? key
    },
  }),
}))

describe("CategoryFilter", () => {
  const categories = ["Pizza", "Sandwich", "Boissons"]

  it("renders all categories plus 'All'", () => {
    render(
      <CategoryFilter
        categories={categories}
        selectedCategory="All"
        onSelectCategory={() => {}}
      />
    )
    expect(screen.getByText("الكل")).toBeInTheDocument()
    expect(screen.getByText("Pizza")).toBeInTheDocument()
    expect(screen.getByText("Sandwich")).toBeInTheDocument()
    expect(screen.getByText("Boissons")).toBeInTheDocument()
  })

  it("highlights selected category", () => {
    render(
      <CategoryFilter
        categories={categories}
        selectedCategory="Pizza"
        onSelectCategory={() => {}}
      />
    )
    const pizzaBtn = screen.getByText("Pizza")
    expect(pizzaBtn.className).toContain("bg-emerald-600")
  })

  it("calls onSelectCategory on click", () => {
    const onSelect = vi.fn()
    render(
      <CategoryFilter
        categories={categories}
        selectedCategory="All"
        onSelectCategory={onSelect}
      />
    )
    fireEvent.click(screen.getByText("Boissons"))
    expect(onSelect).toHaveBeenCalledWith("Boissons")
  })

  it("handles empty categories", () => {
    render(
      <CategoryFilter
        categories={[]}
        selectedCategory="All"
        onSelectCategory={() => {}}
      />
    )
    expect(screen.getByText("الكل")).toBeInTheDocument()
  })
})
