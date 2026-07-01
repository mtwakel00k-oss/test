import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CartItem } from "@/lib/types"

const mockFetchApi = vi.fn()
const mockOnSuccess = vi.fn()
const mockOnClear = vi.fn()
const mockOnClose = vi.fn()
const mockOnRemoveProduct = vi.fn()

vi.mock("@/lib/use-translation", () => ({
  useTranslation: () => ({
    lang: "ar",
    dir: "rtl" as const,
    t: (key: string) => {
      const m: Record<string, string> = {
        "menu.confirmOrder": "تأكيد الطلب",
        "menu.name": "الاسم",
        "menu.namePlaceholder": "أدخل اسمك",
        "menu.orderSummary": "ملخص الطلب",
        "menu.tableDineIn": "طاولة",
        "menu.takeaway": "اخذ",
        "pos.delivery": "توصيل",
        "common.cancel": "إلغاء",
        "menu.submitting": "...",
        "menu.orderConfirmed": "تم تأكيد الطلب",
        "menu.orderNumber": "رقم الطلب",
        "menu.willPrepare": "...",
        "menu.trackOrder": "تتبع الطلب",
        "pos.total": "المجموع",
        "pos.deliveryInfo": "معلومات التوصيل",
        "pos.yourLocation": "موقعك",
        "pos.redetect": "إعادة تحديد",
        "pos.locationFailed": "فشل",
        "menu.detectLocation": "تحديد موقعي",
        "menu.detectingLocation": "...",
        "menu.enterName": "الاسم مطلوب",
        "menu.enterTable": "الطاولة مطلوبة",
        "menu.updateLocation": "تحديث",
        "menu.restaurantClosed": "المطعم مغلق",
        "menu.forbiddenError": "صلاحية",
        "menu.orderFailed": "فشل",
        "menu.somethingWrong": "خطأ",
        "rating.optional": "اختياري",
        "pos.tableNumber": "رقم الطاولة",
        "pos.phone": "الهاتف",
      }
      return m[key] ?? key
    },
  }),
}))

vi.mock("@/lib/use-slug", () => ({
  readTenantConfig: () => ({ plan_type: "elite" }),
}))

vi.mock("@/lib/tenant", () => ({
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/types", () => ({
  getPrice: () => 500,
}))

vi.mock("framer-motion", () => {
  const Div = ({ children, ...props }: {
    children?: React.ReactNode
    [key: string]: unknown
  }) => {
    const { initial, animate, exit, transition, ...rest } = props as Record<string, unknown>
    return <div {...rest}>{children}</div>
  }
  return {
    motion: { div: Div },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  }
})

vi.mock("lucide-react", () => ({
  MapPin: () => <div data-testid="map-pin-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  ShoppingBag: () => <div data-testid="bag-icon" />,
  Check: () => <div data-testid="check-icon" />,
}))

import { CheckoutModal } from "@/components/checkout-modal"

const sampleItems: CartItem[] = [
  {
    product: { id: 1, name: "Pizza", category: "Pizza", description: "", prices: { M: { standard: 500, sauce_tomate: null, creme_fraiche: null } }, est_speciale: false, has_white_sauce: false, is_available: true },
    size: "M",
    sauceId: null,
    quantity: 2,
  },
]

function mockSuccessResponse(data?: Record<string, unknown>) {
  mockFetchApi.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data ?? { id: "test-order-uuid", orderNumber: 42 }),
  })
}

describe("CheckoutModal — sessionStorage race fix", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("sessionStorage", (() => {
      let store: Record<string, string> = {}
      return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value }),
        removeItem: vi.fn((key: string) => { delete store[key] }),
        clear: vi.fn(() => { store = {} }),
      }
    })())
  })

  it("saves phone to sessionStorage immediately after order creation (not just on button click)", async () => {
    mockSuccessResponse()

    const user = userEvent.setup()
    render(
      <CheckoutModal
        items={sampleItems}
        total={1000}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        onClear={mockOnClear}
        onRemoveProduct={mockOnRemoveProduct}
        slug="burger-house"
        initialOrderType="delivery"
        initialDeliveryPhone="0555123456"
      />,
    )

    const nameInput = screen.getByPlaceholderText("أدخل اسمك")
    await user.type(nameInput, "Ahmed")

    const phoneInput = screen.getByPlaceholderText("0555123456")
    await user.clear(phoneInput)
    await user.type(phoneInput, "0555123456")

    const submitBtn = screen.getByRole("button", { name: "تأكيد الطلب" })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText("تم تأكيد الطلب")).toBeDefined()
    })

    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      "order_phone_test-order-uuid",
      "0555123456",
    )
  })

  it("saves phone as empty string for dine_in orders (no phone collected)", async () => {
    mockSuccessResponse()

    const user = userEvent.setup()
    render(
      <CheckoutModal
        items={sampleItems}
        total={1000}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        onClear={mockOnClear}
        onRemoveProduct={mockOnRemoveProduct}
        slug="burger-house"
        initialOrderType="dine_in"
      />,
    )

    const nameInput = screen.getByPlaceholderText("أدخل اسمك")
    await user.type(nameInput, "Ahmed")

    const tableInput = screen.getByPlaceholderText("مثال: 5")
    await user.type(tableInput, "5")

    const submitBtn = screen.getByRole("button", { name: "تأكيد الطلب" })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText("تم تأكيد الطلب")).toBeDefined()
    })

    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      "order_phone_test-order-uuid",
      "",
    )
  })
})
