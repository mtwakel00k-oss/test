import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { OrderCard } from "@/components/pos/order-card"
import type { PosOrder, PosOrderStatus } from "@/lib/pos-types"

vi.mock("@/lib/use-translation", () => ({
  useTranslation: () => ({
    lang: "ar",
    dir: "rtl" as const,
    t: (key: string) => {
      const m: Record<string, string> = {
        "pos.table": "طاولة",
        "pos.takeaway": "طلبات خارجية",
        "pos.delivery": "توصيل",
        "pos.dineIn": "داخلي",
        "pos.statusNew": "جديد",
        "pos.statusPreparing": "قيد التحضير",
        "pos.statusReady": "جاهز",
        "pos.statusCompleted": "مكتمل",
        "pos.statusCancelled": "ملغي",
        "pos.statusOutForDelivery": "في الطريق",
        "pos.paid": "مدفوع",
        "pos.unpaid": "غير مدفوع",
        "time.justNow": "الآن",
      }
      return m[key] ?? key
    },
  }),
}))

function makeOrder(overrides: Partial<PosOrder> = {}): PosOrder {
  return {
    id: "1",
    orderNumber: 101,
    tableNumber: 5,
    orderType: "dine_in",
    status: "pending" as PosOrderStatus,
    paymentStatus: "unpaid",
    serverName: "أحمد",
    items: [
      { id: "i1", name: "بيتزا (L)", quantity: 2, price: 650, productId: 1, size: "L", sauce: null },
    ],
    total: 1300,
    createdAt: new Date(),
    ...overrides,
  }
}

describe("OrderCard", () => {
  it("renders table number for dine-in", () => {
    render(
      <OrderCard
        order={makeOrder()}
        isSelected={false}
        onSelect={() => {}}
        onStatusChange={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText(/طاولة/)).toBeInTheDocument()
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  it("renders takeaway text for takeaway", () => {
    render(
      <OrderCard
        order={makeOrder({ orderType: "takeaway", tableNumber: null })}
        isSelected={false}
        onSelect={() => {}}
        onStatusChange={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText(/طلبات خارجية/)).toBeInTheDocument()
  })

  it("shows pending indicator for new orders", () => {
    render(
      <OrderCard
        order={makeOrder({ status: "pending" })}
        isSelected={false}
        onSelect={() => {}}
        onStatusChange={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText(/قيد الانتظار/)).toBeInTheDocument()
  })

  it("shows preparing status for preparing orders", () => {
    render(
      <OrderCard
        order={makeOrder({ status: "preparing" })}
        isSelected={false}
        onSelect={() => {}}
        onStatusChange={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText(/قيد التحضير/)).toBeInTheDocument()
  })

  it("shows unpaid badge for unpaid orders", () => {
    render(
      <OrderCard
        order={makeOrder({ paymentStatus: "unpaid" })}
        isSelected={false}
        onSelect={() => {}}
        onStatusChange={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText("غير مدفوع")).toBeInTheDocument()
  })

  it("shows paid badge for paid orders", () => {
    render(
      <OrderCard
        order={makeOrder({ paymentStatus: "paid" })}
        isSelected={false}
        onSelect={() => {}}
        onStatusChange={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText("مدفوع")).toBeInTheDocument()
  })
})
