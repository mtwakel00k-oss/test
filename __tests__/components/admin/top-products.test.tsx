import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TopProducts } from "@/components/admin/top-products"

vi.mock("@/lib/use-translation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const m: Record<string, string> = {
        "admin.topProducts": "أفضل المنتجات",
        "admin.topProductsSub": "المنتجات الأكثر مبيعاً",
        "admin.sold": "مباع",
        "order.noOrders": "لا توجد طلبات بعد",
      }
      return m[key] ?? key
    },
  }),
}))

describe("TopProducts", () => {
  const data = [
    { name: "بيتزا", quantity: 50 },
    { name: "برغر", quantity: 30 },
    { name: "مشروبات", quantity: 20 },
  ]

  it("renders product names and quantities", () => {
    render(<TopProducts data={data} />)
    expect(screen.getByText("بيتزا")).toBeInTheDocument()
    expect(screen.getByText("برغر")).toBeInTheDocument()
    expect(screen.getByText("مشروبات")).toBeInTheDocument()
    expect(screen.getByText("50 مباع")).toBeInTheDocument()
    expect(screen.getByText("30 مباع")).toBeInTheDocument()
  })

  it("shows empty state when no data", () => {
    render(<TopProducts data={[]} />)
    expect(screen.getByText("لا توجد طلبات بعد")).toBeInTheDocument()
  })

  it("shows empty state when data is undefined", () => {
    render(<TopProducts data={undefined as unknown as { name: string; quantity: number }[]} />)
    expect(screen.getByText("لا توجد طلبات بعد")).toBeInTheDocument()
  })

  it("assigns correct rank numbers", () => {
    render(<TopProducts data={data} />)
    const badges = screen.getAllByText(/^\d+$/).filter((el) =>
      el.className.includes("bg-")
    )
    expect(badges.map((b) => b.textContent)).toEqual(["1", "2", "3"])
  })
})
