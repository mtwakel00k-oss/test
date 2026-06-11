export type OrderType = "dine_in" | "takeaway" | "delivery"

export interface MenuProduct {
  id: number
  name: string
  description: string
  category: string
  est_speciale: boolean
  has_white_sauce: boolean
  is_available?: boolean
  image_url?: string | null
  prices: Record<string, {
    sauce_tomate: number | null
    creme_fraiche: number | null
    standard: number | null
  }>
}

export function getPrice(p: MenuProduct, size: string, sauceId: number | null): number {
  if (!p.prices) return 0
  const sizePrices = p.prices[size]
  if (!sizePrices) return 0
  if (sauceId === 1 && sizePrices.sauce_tomate != null) return sizePrices.sauce_tomate
  if (sauceId === 2 && sizePrices.creme_fraiche != null) return sizePrices.creme_fraiche
  if (sizePrices.standard != null) return sizePrices.standard
  return sizePrices.sauce_tomate ?? sizePrices.creme_fraiche ?? 0
}

export function getAvailableSizes(p: MenuProduct): string[] {
  if (!p.prices) return []
  return Object.keys(p.prices).filter(s => {
    if (s === "UNIQUE") return false
    const sp = p.prices[s]
    return (sp.sauce_tomate != null) || (sp.creme_fraiche != null) || (sp.standard != null)
  })
}

export interface CartItem {
  product: MenuProduct
  size: string
  sauceId: number | null
  quantity: number
}

export interface Order {
  id: string
  customer_name: string
  customer_phone: string | null
  table_number: number | null
  order_number: number | null
  order_type: OrderType
  status: "pending" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled"
  total: number
  created_at: string
  delivery_address?: string | null
  delivery_lat?: number | null
  delivery_lng?: number | null
  driver_lat?: number | null
  driver_lng?: number | null
  driver_location_updated_at?: string | null
  driver_id?: string | null
  restaurant_id?: string | null
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: number
  product_name: string
  size: string
  sauce: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export interface CreateOrderPayload {
  customer_name: string
  order_type: OrderType
  customer_phone: string | null
  table_number: number | null
  delivery_address?: string | null
  delivery_lat?: number | null
  delivery_lng?: number | null
  items: {
    product_id: number
    product_name: string
    size: string
    sauce: number | null
    quantity: number
    unit_price: number
  }[]
}
