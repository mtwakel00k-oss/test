export type PosOrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled"

export interface PosOrderItem {
  id: number | string
  name: string
  quantity: number
  price: number
  productId: number
  size: string | null
  sauce: number | null
}

export interface PosOrder {
  id: string | number
  orderNumber: number | null
  tableNumber: number | null
  orderType: "dine_in" | "takeaway" | "delivery"
  status: PosOrderStatus
  paymentStatus?: "paid" | "unpaid"
  serverName: string
  customerPhone?: string | null
  deliveryLat?: number | null
  deliveryLng?: number | null
  deliveryAddress?: string | null
  driverId?: string | null
  driverName?: string | null
  driverPhone?: string | null
  items: PosOrderItem[]
  total: number
  createdAt: Date
}

export interface Driver {
  id: string
  name: string
  phone: string
  token: string
  is_active: boolean
  created_at: string
}
