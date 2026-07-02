export interface PrinterConfig {
  id: string
  tenant_slug: string
  name: string
  connection_type: "network" | "usb" | "bluetooth" | "browser"
  ip_address: string
  port: number
  paper_width: number
  charset_per_line: number
  receipt_lang: string
  header_text: string
  footer_text: string
  primary_color: string
  show_logo: boolean
  print_receipt: boolean
  print_kitchen: boolean
  copies_receipt: number
  copies_kitchen: number
  auto_cut: boolean
  is_default: boolean
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface PrinterConfigInput {
  name?: string
  connection_type?: "network" | "usb" | "bluetooth" | "browser"
  ip_address?: string
  port?: number
  paper_width?: number
  charset_per_line?: number
  receipt_lang?: string
  header_text?: string
  footer_text?: string
  primary_color?: string
  show_logo?: boolean
  print_receipt?: boolean
  print_kitchen?: boolean
  copies_receipt?: number
  copies_kitchen?: number
  auto_cut?: boolean
  is_default?: boolean
  enabled?: boolean
}

export interface OrderItem {
  id?: string
  name?: string
  price?: number
  total_price?: number
  quantity?: number
  notes?: string
}

export interface OrderData {
  order_id: string
  order_number?: number
  customer_name?: string
  table_number?: string
  order_type?: string
  status?: string
  total?: number
  paid?: number
  change?: number
  instructions?: string
  created_at: string
  items?: OrderItem[]
  tracking_url?: string
  discount_amount?: number
  discount_label?: string
}
