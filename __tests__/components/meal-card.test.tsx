import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MealCard } from "@/components/meal-card"
import type { MenuProduct } from "@/lib/types"

vi.mock("@/lib/use-translation", () => ({
  useTranslation: () => ({
    lang: "ar",
    dir: "rtl" as const,
    t: (key: string) => {
      const m: Record<string, string> = {
        "menu.sauceTomate": "صلصة طماطم",
        "menu.cremeFraiche": "كريمة فرش",
        "menu.add": "إضافة",
        "menu.noSauce": "بدون صوص",
        "menu.soldOut": "غير متاح",
      }
      return m[key] ?? key
    },
  }),
}))

vi.mock("@/lib/types", () => ({
  getPrice: () => 500,
  getAvailableSizes: (p: { prices?: Record<string, unknown> }) => p.prices ? Object.keys(p.prices) : [],
}))

const pizza: MenuProduct = {
  id: 1,
  name: "بيتزا",
  description: "بيتزا لذيذة",
  category: "Pizza",
  est_speciale: false,
  has_white_sauce: true,
  is_available: true,
  prices: {
    M: { sauce_tomate: 500, creme_fraiche: 600, standard: 450 },
    L: { sauce_tomate: 700, creme_fraiche: 800, standard: 650 },
  },
}

describe("MealCard", () => {
  it("renders product name", () => {
    render(
      <MealCard
        product={pizza}
        size="L"
        sauceId={null}
        quantity={0}
        onSizeChange={() => {}}
        onSauceChange={() => {}}
        onAdd={() => {}}
        onUpdateQuantity={() => {}}
      />
    )
    expect(screen.getByText("بيتزا")).toBeInTheDocument()
  })

  it("calls onAdd when add button clicked", () => {
    const onAdd = vi.fn()
    render(
      <MealCard
        product={pizza}
        size="L"
        sauceId={null}
        quantity={0}
        onSizeChange={() => {}}
        onSauceChange={() => {}}
        onAdd={onAdd}
        onUpdateQuantity={() => {}}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "إضافة" }))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it("shows quantity when > 0", () => {
    render(
      <MealCard
        product={pizza}
        size="L"
        sauceId={null}
        quantity={3}
        onSizeChange={() => {}}
        onSauceChange={() => {}}
        onAdd={() => {}}
        onUpdateQuantity={() => {}}
      />
    )
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("add button has aria-label for accessibility", () => {
    render(
      <MealCard
        product={pizza}
        size="L"
        sauceId={null}
        quantity={0}
        onSizeChange={() => {}}
        onSauceChange={() => {}}
        onAdd={() => {}}
        onUpdateQuantity={() => {}}
      />
    )
    expect(screen.getByRole("button", { name: "إضافة" })).toBeInTheDocument()
  })
})
