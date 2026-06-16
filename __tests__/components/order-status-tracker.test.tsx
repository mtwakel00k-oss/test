import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { OrderStatusTracker } from "@/components/order-status-tracker"

describe("OrderStatusTracker", () => {
  it("renders all 3 hardcoded steps", () => {
    const { container } = render(<OrderStatusTracker currentStage={1} />)
    expect(container.textContent).toMatch(/تم الاستلام/)
    expect(container.textContent).toMatch(/قيد التحضير/)
    expect(container.textContent).toMatch(/جاهز/)
  })

  it("renders without crashing for all stages", () => {
    for (const s of [1, 2, 3]) {
      const { container } = render(<OrderStatusTracker currentStage={s} />)
      expect(container).toBeTruthy()
    }
  })
})
