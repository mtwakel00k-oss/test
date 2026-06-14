import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { DollarSign } from "lucide-react"
import { StatCard } from "@/components/admin/stat-card"

vi.mock("@/lib/use-translation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const m: Record<string, string> = { "common.live": "مباشر", "common.vsYesterday": "عن اليوم السابق" }
      return m[key] ?? key
    },
  }),
}))

describe("StatCard", () => {
  it("renders title and value", () => {
    render(
      <StatCard
        title="الإيرادات"
        value="50,000 د.ج"
        change={12.5}
        icon={<DollarSign />}
        trend="up"
      />
    )
    expect(screen.getByText("الإيرادات")).toBeInTheDocument()
    expect(screen.getByText("50,000 د.ج")).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.textContent === "↑ 12.5%")).toBeInTheDocument()
  })

  it("shows negative change with minus sign", () => {
    render(
      <StatCard
        title="الطلبات"
        value="10"
        change={-5}
        icon={<DollarSign />}
        trend="down"
      />
    )
    expect(screen.getByText((_, el) => el?.textContent === "↓ 5%")).toBeInTheDocument()
  })

  it("shows live indicator when isLive=true", () => {
    render(
      <StatCard
        title="نشط"
        value="3"
        change={0}
        icon={<DollarSign />}
        trend="up"
        isLive
      />
    )
    expect(screen.getByText("مباشر")).toBeInTheDocument()
  })

  it("shows suffix when provided", () => {
    render(
      <StatCard
        title="التقييم"
        value="4.5"
        change={0.3}
        icon={<DollarSign />}
        trend="up"
        suffix="/5"
      />
    )
    expect(screen.getByText("/5")).toBeInTheDocument()
  })
})
