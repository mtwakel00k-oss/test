"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { fetchApi } from "@/lib/tenant"
import { useSlug } from "@/lib/use-slug"
import { useRealtime } from "@/lib/use-realtime"
import { useProducts } from "@/lib/use-products"
import { logger } from "@/lib/logger"
import { playNewOrderSound, playSuccessSound, playErrorSound, playPrintSound, initAudio } from "@/lib/sound"
import type { PosOrder, PosOrderStatus, Driver } from "@/lib/pos-types"
import type { MenuProduct } from "@/lib/types"
import type { OrderType } from "@/types/order"
import { getPrice } from "@/lib/types"
import { cn } from "@/lib/utils"
import { DB_STATUS_TO_POS, POS_STATUS_TO_DB } from "@/lib/constants"
import { ReceiptPrint } from "@/components/pos/receipt-print"
import { toast } from "@/hooks/use-toast"
import { POSHeader } from "@/components/pos/pos-header"
import { OrderTabs } from "@/components/pos/order-tabs"
import { OrderFilters } from "@/components/pos/order-filters"
import { OrderCard } from "@/components/pos/order-card"
import { CheckoutPanel } from "@/components/pos/checkout-panel"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ProductGrid } from "@/components/pos/product-grid"
import { CartSidebar } from "@/components/pos/cart-sidebar"
import { useTranslation } from "@/lib/use-translation"
import { useStaff } from "@/context/StaffContext"
import { useFeatures } from "@/lib/use-features"

interface RawOrder {
  id: string
  status: string
  order_number: number | null
  table_number: number | null
  order_type: string
  payment_status: string
  customer_name: string
  customer_phone: string | null
  delivery_lat?: number | null
  delivery_lng?: number | null
  delivery_address?: string | null
  driver_id?: string | null
  total: number | string
  created_at: string
  items?: RawOrderItem[]
}

interface RawOrderItem {
  id: string
  order_id: string
  product_id: number
  product_name: string
  size: string | null
  sauce: number | null
  unit_price: number
  quantity: number
}

  const statusMap = DB_STATUS_TO_POS

function toPosOrder(raw: RawOrder, items: RawOrderItem[], dailyIndex?: number, allDrivers?: { id: string; name: string; phone: string }[]): PosOrder {
  const orderType = (["dine_in","takeaway","delivery"].includes(raw.order_type)
    ? raw.order_type : "dine_in") as PosOrder["orderType"]
  const driver = allDrivers?.find(d => d.id === raw.driver_id)
  return {
    id: raw.id,
    orderNumber: raw.order_number ?? (dailyIndex != null ? dailyIndex + 1 : null),
    tableNumber: raw.table_number ?? null,
    orderType,
    status: (statusMap[raw.status] as PosOrderStatus) || "pending",
    paymentStatus: (raw.payment_status as PosOrder["paymentStatus"]) || "unpaid",
    serverName: raw.customer_name || "زائر",
    customerPhone: String(raw.customer_phone ?? ""),
    deliveryLat: raw.delivery_lat ?? null,
    deliveryLng: raw.delivery_lng ?? null,
    deliveryAddress: raw.delivery_address ?? null,
    driverId: raw.driver_id ?? null,
    driverName: driver?.name ?? null,
    driverPhone: driver?.phone ?? null,
    items: items.map((i) => ({
      id: i.id,
      name: i.product_name + (i.size && i.size !== "UNIQUE" ? ` (${i.size})` : ""),
      quantity: i.quantity,
      price: Number(i.unit_price),
      productId: i.product_id,
      size: i.size,
      sauce: i.sauce,
    })),
    total: Number(raw.total),
    createdAt: new Date(raw.created_at),
  }
}

interface NewOrderItem {
  product: MenuProduct
  size: string
  sauceId: number | null
  quantity: number
}

function getCancelledSet(): Set<string | number> {
  try {
    const stored = localStorage.getItem("cancelled_orders")
    return new Set(stored ? JSON.parse(stored) : [])
  } catch { return new Set() }
}

function addCancelledId(id: string | number) {
  try {
    const set = getCancelledSet()
    set.add(id)
    localStorage.setItem("cancelled_orders", JSON.stringify([...set]))
  } catch {}
}

interface DeliveryMan {
  id: string
  name: string
  whatsapp_number: string
  is_busy: boolean
}

type UnifiedDriver = {
  id: string
  name: string
  phone: string
  isBusy: boolean
  source: "tenant" | "delivery_men"
}

export default function POSPage() {
  const router = useRouter()
  const slug = useSlug()
  const { t, lang } = useTranslation()
  const cur = lang === "ar" ? "د.ج" : "DA"
  const [orders, setOrders] = useState<PosOrder[]>([])
  const [activeTab, _setActiveTab] = useState<"active" | "completed">("active")
  const [statusFilter, setStatusFilter] = useState<PosOrderStatus | null>(null)
  const setActiveTab = useCallback((tab: "active" | "completed") => { _setActiveTab(tab); setStatusFilter(null) }, [])
  const [selectedOrder, setSelectedOrder] = useState<PosOrder | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<{ paid: number; change: number } | null>(null)
  const [editingItems, setEditingItems] = useState(false)
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({})
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [newTable, setNewTable] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newOrderItems, setNewOrderItems] = useState<NewOrderItem[]>([])
  const [newOrderError, setNewOrderError] = useState("")
  const [newOrderType, setNewOrderType] = useState<OrderType>("dine_in")
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [savingItems, setSavingItems] = useState(false)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [assigningDriver, setAssigningDriver] = useState(false)
  const [pendingDriverId, setPendingDriverId] = useState<string | null>(null)
  const [deliveryMen, setDeliveryMen] = useState<DeliveryMan[]>([])
  const [cashier, setCashier] = useState<{ email: string; role: string; name?: string } | null>(null)
  const { activeStaff } = useStaff()
  const features = useFeatures()

  useEffect(() => {
    fetchApi("/api/tenant/drivers")
      .then(r => r.ok ? r.json() : [])
      .then(data => setDrivers(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetchApi("/api/delivery-men")
      .then(r => r.ok ? r.json() : [])
      .then(data => setDeliveryMen(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const allDrivers = useMemo<UnifiedDriver[]>(() => {
    const map = new Map<string, UnifiedDriver>()
    // tenant drivers (lower priority)
    for (const d of drivers) {
      const phone = (d as { phone?: string; is_busy?: boolean }).phone || ""
      map.set(phone, { id: d.id, name: d.name, phone, isBusy: !!(d as { is_busy?: boolean }).is_busy, source: "tenant" })
    }
    // delivery_men (higher priority — overwrites by phone)
    for (const dm of deliveryMen) {
      map.set(dm.whatsapp_number, { id: dm.id, name: dm.name, phone: dm.whatsapp_number, isBusy: dm.is_busy, source: "delivery_men" })
    }
    return Array.from(map.values()).filter(d => d.phone)
  }, [drivers, deliveryMen])

  useEffect(() => {
    fetchApi("/api/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.error) { router.push(`/${slug}/login`); return }
        if (data.role !== "admin" && data.role !== "owner" && data.role !== "cashier") {
          router.push(`/${slug}/login`); return
        }
        setCashier(data)
      })
      .catch(() => router.push(`/${slug}/login`))
  }, [router, slug])

  useEffect(() => {
    const unlock = () => { initAudio(); document.removeEventListener("pointerdown", unlock) }
    document.addEventListener("pointerdown", unlock)
    return () => document.removeEventListener("pointerdown", unlock)
  }, [])

  const fetchOrders = useCallback(async (): Promise<PosOrder[]> => {
    const cancelledIds = getCancelledSet()
    const res = await fetchApi("/api/orders?include_items=true")
    if (!res.ok) { logger.error("Failed to fetch orders", res.status); return [] }
    const rawOrders: RawOrder[] = await res.json()

    const today = new Date().toISOString().slice(0, 10)
    const dailyOrders = [...rawOrders]
      .filter((o) => o.created_at?.startsWith(today))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const dailyIndex = new Map(dailyOrders.map((o, i) => [o.id, i]))

    const itemsByOrder: Record<string, RawOrderItem[]> = {}
    for (const o of rawOrders) {
      if (o.items) itemsByOrder[o.id] = o.items
    }
    const posOrders = rawOrders
      .map((o) => {
        return toPosOrder(o, itemsByOrder[o.id] || [], dailyIndex.get(o.id), allDrivers)
      })
      .filter((o: PosOrder) => !cancelledIds.has(o.id))
    return posOrders
  }, [allDrivers])

  useEffect(() => { fetchOrders().then(setOrders) }, [fetchOrders])

  const subscriptions = useMemo(() => [
    {
      table: "orders" as const,
      event: "*" as const,
      handler: () => { fetchOrders().then(setOrders) },
    },
    {
      table: "order_items" as const,
      event: "*" as const,
      handler: () => { fetchOrders().then(setOrders) },
    },
  ], [fetchOrders])

  useRealtime({
    channelName: "pos-orders",
    subscriptions,
    pollInterval: 10000,
    onPoll: () => { fetchOrders().then(setOrders) },
  })

  const { products } = useProducts()

  const productIds = useMemo(() => new Set(products.map((p) => p.id)), [products])
  useEffect(() => { setNewOrderItems((prev) => prev.filter((i) => productIds.has(i.product.id))) }, [productIds]) // eslint-disable-line react-hooks/set-state-in-effect

  const prevPendingRef = useRef(0)
  const prevCompletedRef = useRef(0)


  useEffect(() => {
    const pending = orders.filter(o => o.status === "pending").length
    if (pending > prevPendingRef.current) playNewOrderSound()
    prevPendingRef.current = pending
    const completed = orders.filter(o => o.status === "completed").length
    if (completed > prevCompletedRef.current) playSuccessSound()
    prevCompletedRef.current = completed
  }, [orders])

  const handleStatusChange = useCallback(async (orderId: string | number, status: PosOrderStatus) => {
    const prevOrders = orders
    const dbStatus = POS_STATUS_TO_DB[status]
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    setSelectedOrder(prev => prev?.id === orderId ? { ...prev, status } : prev)
    const res = await fetchApi(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: dbStatus }),
    })
    if (!res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...(prevOrders.find(p => p.id === orderId) || o) } : o))
      setSelectedOrder(prev => prev?.id === orderId ? (prevOrders.find(p => p.id === orderId) ?? prev) : prev)
      toast({ variant: "destructive", title: "فشل تحديث الحالة" })
      logger.error("Status update failed")
    }
  }, [orders])

  const handleComplete = useCallback(async (orderId: string | number, paid: number, change: number, onError: () => void, driverId?: string | null) => {
    const prevStatus = orders.find(o => o.id === orderId)?.status
    const order = orders.find(o => o.id === orderId)
    const isDelivery = order?.orderType === "delivery"
    if (isDelivery && !driverId) {
      toast({ title: "يرجى اختيار سائق", variant: "destructive" })
      onError()
      return
    }
    const dbStatus = POS_STATUS_TO_DB[isDelivery ? "out_for_delivery" : "completed"]
    setOrders(p => p.map(o => o.id === orderId
      ? { ...o, status: isDelivery ? "out_for_delivery" : "completed", ...(isDelivery ? {} : { paymentStatus: "paid" as const }), driverId: driverId ?? o.driverId }
      : o))
    setSelectedOrder(p => p?.id === orderId
      ? { ...p, status: isDelivery ? "out_for_delivery" : "completed", ...(isDelivery ? {} : { paymentStatus: "paid" as const }), driverId: driverId ?? p?.driverId }
      : p)
    const res = await fetchApi(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: dbStatus,
        ...(isDelivery ? {} : { payment_status: "paid" }),
        ...(isDelivery && driverId ? { driver_id: driverId } : {}),
      }),
    })
    if (!res.ok) {
      setOrders(p => p.map(o => o.id === orderId ? { ...o, status: prevStatus || o.status } : o))
      setSelectedOrder(p => p?.id === orderId ? { ...p, status: prevStatus || "pending" } : p)
      toast({ title: t("guest.orderPaid"), variant: "destructive" })
      onError()
      return
    }
    playPrintSound()
    setReceiptData({ paid, change })
    setShowCheckout(false)
    setShowReceipt(true)
    setTimeout(() => window.print(), 500)
  }, [orders, t])

  const handleCancel = useCallback(async (orderId: string | number) => {
    addCancelledId(orderId)
    setOrders(prev => prev.filter(o => o.id !== orderId))
    setSelectedOrder(null)
    try {
      await fetchApi(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })
    } catch (e) {
      logger.error("Cancel update failed: " + (e instanceof Error ? e.message : "Unknown"))
    }
  }, [])

  const handleSaveItems = useCallback(async (orderId: string | number) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    setSavingItems(true)

    const keptItems = order.items
      .filter(i => (editQuantities[i.id] ?? i.quantity) > 0)
      .map(i => ({
        product_id: i.productId,
        product_name: i.name.replace(/\s*\([^)]*\)\s*$/, ''),
        size: i.size || "UNIQUE",
        sauce: i.sauce,
        quantity: editQuantities[i.id] ?? i.quantity,
        unit_price: i.price,
      }))
    const newTotal = keptItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)

    const res = await fetchApi(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: keptItems, total: newTotal }),
    })
    if (res.ok) {
      setEditingItems(false)
      setSavingItems(false)
      setOrders(await fetchOrders())
    } else {
      setSavingItems(false)
      logger.error("Failed to save items")
    }
  }, [orders, editQuantities, fetchOrders])

  const assignDriver = useCallback(async (orderId: string | number, driver: UnifiedDriver | null) => {
    setAssigningDriver(true)

    const selectedDriver = driver ? allDrivers.find(d => d.id === driver.id) : null
    if (driver && !selectedDriver) {
      toast({ title: "اختر سائقاً من القائمة", variant: "destructive" })
      setAssigningDriver(false)
      return
    }
    if (driver && selectedDriver?.isBusy) {
      toast({ title: `السائق ${selectedDriver.name} مشغول حالياً، اختر سائقاً آخر`, variant: "destructive" })
      setAssigningDriver(false)
      return
    }

    if (driver?.source === "delivery_men") {
      const res = await fetchApi("/api/admin/assign-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: String(orderId), delivery_man_id: driver.id, slug }),
      })
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, driverId: driver.id, driverName: driver.name, driverPhone: driver.phone, status: "out_for_delivery" as PosOrderStatus } : o))
        setSelectedOrder(prev => prev?.id === orderId ? { ...prev, driverId: driver.id, driverName: driver.name, driverPhone: driver.phone, status: "out_for_delivery" as PosOrderStatus } : prev)
        setDeliveryMen(prev => prev.map(d => d.id === driver.id ? { ...d, is_busy: true } : d))
        fetchApi("/api/delivery-men").then(r => r.ok ? r.json() : []).then(data => setDeliveryMen(Array.isArray(data) ? data : [])).catch(() => {})
        fetchApi("/api/tenant/drivers").then(r => r.ok ? r.json() : []).then(data => setDrivers(Array.isArray(data) ? data : [])).catch(() => {})
      } else {
        const err = await res.json().catch(() => ({ error: "فشل تعيين السائق" }))
        toast({ title: err.error || "فشل تعيين السائق", variant: "destructive" })
      }
    } else {
      const res = await fetchApi(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: driver?.id ?? null,
          ...(driver ? { status: POS_STATUS_TO_DB["out_for_delivery"] } : {}),
        }),
      })
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, driverId: driver?.id ?? null, driverName: driver?.name ?? null, driverPhone: driver?.phone ?? null, ...(driver ? { status: "out_for_delivery" as PosOrderStatus } : {}) } : o))
        setSelectedOrder(prev => prev?.id === orderId ? { ...prev, driverId: driver?.id ?? null, driverName: driver?.name ?? null, driverPhone: driver?.phone ?? null, ...(driver ? { status: "out_for_delivery" as PosOrderStatus } : {}) } : prev)
        fetchApi("/api/tenant/drivers").then(r => r.ok ? r.json() : []).then(data => setDrivers(Array.isArray(data) ? data : [])).catch(() => {})
        fetchApi("/api/delivery-men").then(r => r.ok ? r.json() : []).then(data => setDeliveryMen(Array.isArray(data) ? data : [])).catch(() => {})
      } else {
        const err = await res.json().catch(() => ({ error: "فشل تعيين السائق" }))
        toast({ title: err.error || "فشل تعيين السائق", variant: "destructive" })
      }
    }
    setAssigningDriver(false)
    setPendingDriverId(null)
  }, [allDrivers, slug])

  const handleCreateOrder = useCallback(async () => {
    if (!newName || newOrderItems.length === 0) return
    const tableNum = parseInt(newTable, 10)
    if (newTable && (isNaN(tableNum) || tableNum < 1)) return
    setCreatingOrder(true)
    setNewOrderError("")

    const availableItems = newOrderItems.filter(i => i.product.is_available !== false)
    if (availableItems.length === 0) {
      setNewOrderError(t("pos.orderError"))
      playErrorSound()
      setCreatingOrder(false)
      return
    }

    try {
      const bodyObj = {
        customer_name: newName,
        customer_phone: newOrderType === "delivery" ? newPhone || null : null,
        table_number: newOrderType === "dine_in" && newTable ? tableNum : null,
        order_type: newOrderType,
        cashier_id: cashier?.email || null,
        cashier_name: cashier?.email?.split("@")[0] || null,
        processed_by_staff_id: activeStaff?.id || null,
        processed_by_staff_name: activeStaff?.name || null,
        items: availableItems.map(i => ({
          product_id: i.product.id,
          product_name: i.product.name,
          size: i.size,
          sauce: i.sauceId,
          quantity: i.quantity,
          unit_price: getPrice(i.product, i.size, i.sauceId),
        })),
      }
      const res = await fetchApi("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.code === "ALL_PRODUCTS_STALE") { setNewOrderItems([]); setNewOrderError(""); setCreatingOrder(false); return }
        setNewOrderError(body.error === "Table is occupied" ? t("pos.tableOccupied") : (body.error || t("pos.orderError")))
        playErrorSound()
        return
      }
      const data = await res.json()
      const newOrder: PosOrder = {
        id: data.id,
        orderNumber: data.orderNumber,
        tableNumber: newOrderType === "dine_in" && newTable ? tableNum : null,
        orderType: newOrderType,
        status: "pending",
        paymentStatus: "unpaid",
        serverName: newName,
        customerPhone: newPhone,
        items: availableItems.map(i => ({
          id: Math.random(),
          name: i.product.name + (i.size && i.size !== "UNIQUE" ? ` (${i.size})` : ""),
          quantity: i.quantity,
          price: getPrice(i.product, i.size, i.sauceId),
          productId: i.product.id,
          size: i.size,
          sauce: i.sauceId,
        })),
        total: availableItems.reduce((s, i) => s + getPrice(i.product, i.size, i.sauceId) * i.quantity, 0),
        createdAt: new Date(),
      }
      setOrders(prev => [newOrder, ...prev])
      setNewOrderError("")
      playSuccessSound()
      setShowNewOrder(false)
      setNewName("")
      setNewTable("")
      setNewPhone("")
      setNewOrderItems([])
      setNewOrderType("dine_in")
    } catch (e) {
      setNewOrderError(t("pos.orderError"))
      logger.error("Create order error: " + (e instanceof Error ? e.message : "Unknown"))
    } finally {
      setCreatingOrder(false)
    }
  }, [newName, newTable, newPhone, newOrderItems, newOrderType, t, cashier, activeStaff])

  const activeOrders = orders.filter(o => o.status !== "completed" && o.status !== "cancelled")
  const completedOrders = orders.filter(o => o.status === "completed")
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayRevenue = orders
    .filter(o => o.status === "completed" && o.createdAt >= todayStart)
    .reduce((sum, o) => sum + o.total, 0)

  const filteredOrders = (activeTab === "active" ? activeOrders : completedOrders)
    .filter(o => !statusFilter || o.status === statusFilter)

  const counts = {
    active: activeOrders.length,
    completed: completedOrders.length,
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    preparing: orders.filter(o => o.status === "preparing").length,
    ready: orders.filter(o => o.status === "ready").length,
    out_for_delivery: orders.filter(o => o.status === "out_for_delivery").length,
  }

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <POSHeader totalOrders={orders.length} activeOrders={activeOrders.length} todayRevenue={todayRevenue}
        onNewOrder={() => { setShowNewOrder(true); setSelectedOrder(null); setNewOrderError("") }}
        userName={cashier?.email?.split("@")[0]} userRole={cashier?.role} />
      <OrderTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />
      {activeTab === "active" && <OrderFilters activeFilter={statusFilter} onFilterChange={setStatusFilter} counts={counts} />}

      <div className="flex">
        <div className={cn("flex-1 p-4 lg:p-6 space-y-3", showCheckout ? "hidden lg:block" : "block")}>
          {showNewOrder ? (
            <div className="fixed inset-0 z-50 bg-background flex flex-col lg:flex-row lg:static lg:inset-auto lg:z-auto lg:min-h-0">
              <ProductGrid
                products={products}
                orderItems={newOrderItems}
                onAddItem={(item) => setNewOrderItems(prev => [...prev, item])}
                onUpdateQuantity={(productId, delta) => {
                  setNewOrderItems(prev => {
                    const updated = prev.map(i =>
                      i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
                    )
                    return updated.filter(i => i.quantity > 0)
                  })
                }}
                onClose={() => {
                  setShowNewOrder(false)
                  setNewName("")
                  setNewTable("")
                  setNewPhone("")
                  setNewOrderItems([])
                  setNewOrderType("dine_in")
                }}
              />
              <CartSidebar
                orderItems={newOrderItems}
                customerName={newName}
                onCustomerNameChange={setNewName}
                customerPhone={newPhone}
                onCustomerPhoneChange={setNewPhone}
                onUpdateQuantity={(productId, delta) => {
                  setNewOrderItems(prev => {
                    const updated = prev.map(i =>
                      i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
                    )
                    return updated.filter(i => i.quantity > 0)
                  })
                }}
                onRemoveItem={(productId) => {
                  setNewOrderItems(prev => prev.filter(i => i.product.id !== productId))
                }}
                onSubmit={handleCreateOrder}
                submitting={creatingOrder}
                disabled={!newName || newOrderItems.length === 0 || (newOrderType === "delivery" && !newPhone)}
                error={newOrderError}
                orderType={newOrderType}
                onOrderTypeChange={setNewOrderType}
                tableNumber={newTable}
                onTableNumberChange={setNewTable}
                hasDelivery={features?.hasDelivery !== false}
                onCancel={() => {
                  setShowNewOrder(false)
                  setNewName("")
                  setNewTable("")
                  setNewPhone("")
                  setNewOrderItems([])
                  setNewOrderType("dine_in")
                }}
              />
            </div>
          ) : filteredOrders.length === 0 && !showNewOrder ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-fade-in-up">
              <div className="relative mb-6">
                <svg className="w-20 h-20 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="absolute -bottom-1 -end-1 text-lg">📋</span>
              </div>
              <p className="text-lg font-medium text-foreground/60">{activeTab === "active" ? t("pos.noActiveOrders") : t("pos.noCompletedOrders")}</p>
              <p className="text-sm mt-1 text-muted-foreground/70">{activeTab === "active" ? t("pos.newOrdersHere") : t("pos.completedOrdersHere")}</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} isSelected={selectedOrder?.id === order.id}
                onSelect={() => { setSelectedOrder(order); setShowCheckout(false) }}
                onStatusChange={handleStatusChange} onCancel={(id) => setCancelTargetId(String(id))}
              />
            ))
          )}
          {activeTab === "active" && !showNewOrder && (
            <button onClick={() => { setShowNewOrder(true); setSelectedOrder(null); setNewOrderError("") }}
              className="group w-full py-4 rounded-xl border-2 border-dashed border-border/60 text-muted-foreground/70 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-300 text-sm font-medium flex items-center justify-center gap-2">
              <svg className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("pos.newOrder")}
            </button>
          )}
        </div>

        {!showNewOrder && (selectedOrder) && (
          <div className={cn(
            "w-full lg:w-96 border-l border-border bg-card",
            showCheckout ? "block" : "hidden lg:block"
          )}>
            {selectedOrder && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedOrder.orderType === "takeaway" ? t("pos.takeaway") : `${t("pos.table")} ${selectedOrder.tableNumber}`}
                  </h2>
                  <p className="text-xs text-muted-foreground">#{selectedOrder.orderNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrint}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors"
                  >{t("common.print")}</button>
                  <div className="relative group">
                    <button onClick={() => setShowCheckout(true)}
                      disabled={selectedOrder.status !== "completed"}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >{selectedOrder.status === "completed" ? t("pos.paymentCash") : "غير جاهز"}</button>
                    {selectedOrder.status !== "completed" && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                        <div className="bg-foreground text-background text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                          الطلب لم يكتمل بعد — انتظر حتى يصبح جاهزاً
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setSelectedOrder(null); setShowCheckout(false) }}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {showCheckout ? (
                <CheckoutPanel order={selectedOrder} onClose={() => setShowCheckout(false)} onComplete={handleComplete} hasDriverAssigned={!!selectedOrder.driverId} drivers={allDrivers} />
              ) : showReceipt && receiptData ? (
                <div id="receipt" className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="text-center pb-3 border-b border-border">
                    <h3 className="text-lg font-bold text-foreground">{t("pos.receipt")}</h3>
                    <p className="text-xs text-muted-foreground">{t("pos.receipt")} #{selectedOrder.orderNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedOrder.serverName}{selectedOrder.tableNumber ? ` · ${t("pos.table")} ${selectedOrder.tableNumber}` : ` · ${t("pos.takeaway")}`}</p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.createdAt.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1.5">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-foreground/80">{item.quantity}x {item.name}</span>
                        <span className="text-foreground font-medium">{item.price * item.quantity} {cur}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-border space-y-1">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{t("pos.total")}</span>
                      <span className="text-foreground font-semibold">{selectedOrder.total} {cur}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{t("pos.amountPaid")}</span>
                      <span className="text-foreground">{receiptData.paid} {cur}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{t("pos.change")}</span>
                      <span className="text-emerald-600 font-semibold">{receiptData.change.toFixed(2)} {cur}</span>
                    </div>
                  </div>
                  <p className="text-center text-xs text-muted-foreground pt-2">{t("pos.thanks")}</p>
                  <div className="flex gap-2 pt-3 print:hidden">
                    <button onClick={() => window.print()}
                      className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90">{t("common.print")}</button>
                    <button onClick={() => { setShowReceipt(false); setSelectedOrder(null); setReceiptData(null) }}
                      className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">{t("common.close")}</button>
                  </div>
                </div>
              ) : editingItems ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <button onClick={() => setEditQuantities(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] ?? item.quantity) - 1) }))}
                            className="h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 flex items-center justify-center text-sm font-medium">−</button>
                          <span className="text-sm font-semibold w-6 text-center">{editQuantities[item.id] ?? item.quantity}</span>
                          <button onClick={() => setEditQuantities(p => ({ ...p, [item.id]: (p[item.id] ?? item.quantity) + 1 }))}
                            className="h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 flex items-center justify-center text-sm font-medium">+</button>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-foreground">{(editQuantities[item.id] ?? item.quantity) * item.price} {cur}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-border flex gap-2">
                    <button onClick={() => { setEditingItems(false); setEditQuantities({}) }}
                      className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">{t("common.cancel")}</button>
                    <button onClick={() => handleSaveItems(selectedOrder.id)} disabled={savingItems}
                      className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">{savingItems ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {t("common.processing")}
                        </span>
                      ) : t("common.save")}</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("pos.quantity")}</span>
                    {selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" && (
                      <button onClick={() => {
                        setEditingItems(true)
                        setEditQuantities({})
                      }} className="text-xs font-medium text-primary hover:underline">{t("pos.editItems")}</button>
                    )}
                  </div>
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{t("pos.qty")} {item.quantity}</p>
                      </div>
                      <span className="text-sm font-medium text-foreground">{item.price * item.quantity} {cur}</span>
                    </div>
                  ))}
                  {selectedOrder.orderType === "delivery" && (selectedOrder.status === "ready" || selectedOrder.status === "preparing") && features?.hasDelivery !== false && (
                    <div className="border-t border-border/50 pt-3 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1m2 1l2-1m2 1l2-1m2 1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v10" />
                        </svg>
                        {t("pos.delivery")}
                      </p>
                      {selectedOrder.driverId ? (() => {
                        const assignedDriver = allDrivers.find(d => d.id === selectedOrder.driverId)
                        return (
                          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                                {assignedDriver ? assignedDriver.name.charAt(0) : "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{assignedDriver ? assignedDriver.name : "—"}</p>
                                <p className="text-xs text-muted-foreground font-mono dir-ltr text-left truncate">{assignedDriver ? assignedDriver.phone : ""}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a href={`https://wa.me/${assignedDriver?.phone?.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                              </a>
                              <button onClick={async () => { await assignDriver(selectedOrder.id, null) }}
                                disabled={assigningDriver}
                                className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all disabled:opacity-50">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )
                      })() : allDrivers.length > 0 ? (
                        <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pe-1">
                          {allDrivers.filter(d => !d.isBusy).length === 0 ? (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                              <span>⚠️</span>
                              <span>كل السائقين مشغولون حالياً</span>
                            </div>
                          ) : (
                            allDrivers.filter(d => !d.isBusy).map(driver => (
                              <button key={driver.id} onClick={() => assignDriver(selectedOrder.id, driver)}
                                disabled={assigningDriver}
                                className="flex items-center gap-3 w-full rounded-lg border border-border/50 bg-card px-3 py-2.5 text-right hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold group-hover:bg-emerald-500/20 transition-colors">
                                  {driver.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{driver.name}</p>
                                  <p className="text-[11px] text-muted-foreground font-mono dir-ltr text-left">{driver.phone}</p>
                                </div>
                                <span className="flex items-center gap-1.5 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">متاح</span>
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/30 text-muted-foreground text-xs">
                          <span>🛵</span>
                          <span>لا يوجد سائقون — أضف من الإعدادات</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="pt-3 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-foreground">{t("pos.total")}</span>
                      <span className="text-xl font-bold text-foreground">{selectedOrder.total} {cur}</span>
                    </div>
                  </div>
                  {selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" && (
                    <button onClick={() => setCancelTargetId(String(selectedOrder.id))}
                      className="w-full rounded-lg border border-destructive/30 text-destructive py-2.5 text-sm font-medium hover:bg-destructive/5 transition-colors">{t("pos.cancelButton") || t("pos.cancelOrder")}</button>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={cancelTargetId !== null}
        title={t("pos.cancelOrder")}
        message={t("pos.cancelConfirm")}
        confirmLabel={t("common.cancel")}
        cancelLabel={t("pos.keep")}
        onConfirm={() => { if (cancelTargetId !== null) handleCancel(cancelTargetId); setCancelTargetId(null) }}
        onCancel={() => setCancelTargetId(null)}
      />

      <ReceiptPrint
        order={showReceipt ? selectedOrder : null}
        paid={receiptData?.paid ?? 0}
        change={receiptData?.change ?? 0}
      />
    </div>
  )
}
