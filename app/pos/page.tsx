"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { supabase, fetchApi } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { playNewOrderSound, playSuccessSound, playErrorSound, playPrintSound, initAudio } from "@/lib/sound"
import type { PosOrder, PosOrderStatus } from "@/lib/pos-types"
import type { MenuProduct } from "@/lib/types"
import { getPrice, getAvailableSizes } from "@/lib/types"
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
import { useTranslation } from "@/lib/use-translation"

interface RawOrderItem {
  id: number
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  size: string | null
  sauce: number | null
}

interface RawOrder {
  id: string
  order_number: number | null
  table_number: number | null
  order_type: string
  status: string
  payment_status: string
  customer_name: string
  customer_phone?: string | null
  delivery_lat?: number | null
  delivery_lng?: number | null
  total: number
  created_at: string
  items?: RawOrderItem[]
}

const statusMap = DB_STATUS_TO_POS

function toPosOrder(raw: RawOrder, items: RawOrderItem[], dailyIndex?: number): PosOrder {
  return {
    id: raw.id,
    orderNumber: raw.order_number ?? (dailyIndex != null ? dailyIndex + 1 : null),
    tableNumber: raw.table_number ?? null,
    orderType: (raw.order_type as "dine_in" | "takeaway" | "delivery") || "dine_in",
    status: (statusMap[raw.status] as PosOrderStatus) || "pending",
    paymentStatus: (raw.payment_status as PosOrder["paymentStatus"]) || "unpaid",
    serverName: raw.customer_name || "زائر",
    customerPhone: String(raw.customer_phone ?? ""),
    deliveryLat: raw.delivery_lat ?? null,
    deliveryLng: raw.delivery_lng ?? null,
    items: items.map((i) => ({
      id: i.id,
      name: i.product_name + (i.size && i.size !== "UNIQUE" ? ` (${i.size})` : ""),
      quantity: i.quantity,
      price: Number(i.unit_price),
      productId: Number(i.product_id),
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

export default function POSPage() {
  const router = useRouter()
  const { t, lang } = useTranslation()
  // Guard — blocks data queries until tenant config is confirmed
  const hasConfig = useMemo(() => {
    if (typeof window === 'undefined') return false
    const el = document.getElementById("tenant-config")
    return !!(el?.textContent || (window as unknown as Record<string, unknown>).__TENANT_CONFIG__)
  }, [])

  // SECURITY FIX: Redirect if no tenant config (prevents master DB leakage)
  useEffect(() => {
    const el = document.getElementById("tenant-config")
    if (el?.textContent) return
    const config = (window as unknown as Record<string, unknown>).__TENANT_CONFIG__
    if (config) return
    fetch("/api/auth/login").then(r => r.json()).then(d => {
      if (d.slug) router.replace(`/${d.slug}/pos`)
      else router.replace("/login")
    }).catch(() => router.replace("/login"))
  }, [router])
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
  const [editQuantities, setEditQuantities] = useState<Record<number, number>>({})
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [newTable, setNewTable] = useState("")
  const [newOrderItems, setNewOrderItems] = useState<NewOrderItem[]>([])
  const [products, setProducts] = useState<MenuProduct[]>([])
  const [newOrderError, setNewOrderError] = useState("")
  const [newOrderType, setNewOrderType] = useState<"dine_in" | "takeaway">("dine_in")
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [savingItems, setSavingItems] = useState(false)

  useEffect(() => {
    const unlock = () => { initAudio(); document.removeEventListener("pointerdown", unlock) }
    document.addEventListener("pointerdown", unlock)
    return () => document.removeEventListener("pointerdown", unlock)
  }, [])

  const fetchOrders = useCallback(async (): Promise<PosOrder[] | null> => {
    const cancelledIds = getCancelledSet()
    const res = await fetchApi("/api/orders?include_items=true")
    if (!res.ok) { logger.error("Failed to fetch orders", res.status); return null }
    const rawOrders: RawOrder[] = await res.json()

    const today = new Date().toISOString().slice(0, 10)
    const dailyOrders = [...rawOrders]
      .filter((o) => o.created_at?.startsWith(today))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const dailyIndex = new Map(dailyOrders.map((o: RawOrder, i: number) => [o.id, i]))

    const itemsByOrder: Record<string, RawOrderItem[]> = {}
    for (const o of rawOrders) {
      if (o.items) itemsByOrder[o.id] = o.items
    }
    const posOrders = rawOrders
      .map((o: RawOrder) => {
        return toPosOrder(o, itemsByOrder[o.id] || [], dailyIndex.get(o.id))
      })
      .filter((o: PosOrder) => !cancelledIds.has(o.id))
    return posOrders
  }, [])

  useEffect(() => {
    if (!hasConfig) return
    fetchOrders().then(data => { if (data) setOrders(data) })
  }, [fetchOrders, hasConfig])

  useEffect(() => {
    if (!hasConfig) return
    const channel = supabase().channel("pos-orders")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => { fetchOrders().then(data => { if (data) setOrders(data) }) }
      )
      .subscribe()
    const poll = setInterval(() => { fetchOrders().then(data => { if (data) setOrders(data) }) }, 10000)
    return () => { supabase().removeChannel(channel); clearInterval(poll) }
  }, [fetchOrders, hasConfig])

  useEffect(() => {
    if (!hasConfig) return
    fetchApi("/api/products").then(r => r.json()).then((data: MenuProduct[]) => {
      if (Array.isArray(data)) {
        const withImages = data.filter((p: MenuProduct) => p.image_url)
        if (withImages.length > 0) {
          withImages.forEach((p: MenuProduct) => console.log("[POS Image]", p.id, p.name, p.image_url))
        } else {
          console.log("[POS Image] No products have image_url in API response")
        }
        setProducts(data.filter((p: MenuProduct) => p.is_available !== false))
      }
    })
  }, [hasConfig])

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

  const handleComplete = useCallback(async (orderId: string | number, paid: number, change: number, onError: () => void) => {
    const prevStatus = orders.find(o => o.id === orderId)?.status
    const dbStatus = POS_STATUS_TO_DB["completed"]
    setOrders(p => p.map(o => o.id === orderId ? { ...o, status: "completed", paymentStatus: "paid" } : o))
    setSelectedOrder(p => p?.id === orderId ? { ...p, status: "completed", paymentStatus: "paid" } : p)
    const res = await fetchApi(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: dbStatus, payment_status: "paid" }),
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
      .filter(i => (editQuantities[i.id as number] ?? i.quantity) > 0)
      .map(i => ({
        product_id: Number(i.productId),
        product_name: i.name.replace(/\s*\([^)]*\)\s*$/, ''),
        size: i.size || "UNIQUE",
        sauce: i.sauce,
        quantity: editQuantities[i.id as number] ?? i.quantity,
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
      const result = await fetchOrders()
      if (result) setOrders(result)
    } else {
      setSavingItems(false)
      logger.error("Failed to save items")
    }
  }, [orders, editQuantities, fetchOrders])

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
        table_number: newOrderType === "dine_in" && newTable ? tableNum : null,
        order_type: newOrderType,
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
      setNewOrderItems([])
      setNewOrderType("dine_in")
    } catch (e) {
      setNewOrderError(t("pos.orderError"))
      logger.error("Create order error: " + (e instanceof Error ? e.message : "Unknown"))
    } finally {
      setCreatingOrder(false)
    }
  }, [newName, newTable, newOrderItems, newOrderType, t])

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
    <div className="min-h-screen bg-background">
      <POSHeader totalOrders={orders.length} activeOrders={activeOrders.length} todayRevenue={todayRevenue} />
      <OrderTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />
      {activeTab === "active" && <OrderFilters activeFilter={statusFilter} onFilterChange={setStatusFilter} counts={counts} />}

      <div className="flex">
        <div className={cn("flex-1 p-4 lg:p-6 space-y-3", showCheckout ? "hidden lg:block" : "block")}>
          {filteredOrders.length === 0 && !showNewOrder ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium">{activeTab === "active" ? t("pos.noActiveOrders") : t("pos.noCompletedOrders")}</p>
              <p className="text-sm mt-1">{activeTab === "active" ? t("pos.newOrdersHere") : t("pos.completedOrdersHere")}</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} isSelected={selectedOrder?.id === order.id}
                onSelect={() => { setSelectedOrder(order); setShowCheckout(false) }}
                onStatusChange={handleStatusChange} onCancel={(id) => setCancelTargetId(String(id))}
              />
            ))
          )}
          {activeTab === "active" && (
            <button onClick={() => { setShowNewOrder(true); setSelectedOrder(null); setNewOrderError("") }}
              className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200 text-sm font-medium">
              {t("pos.newOrder")}
            </button>
          )}
        </div>

        {(selectedOrder || showNewOrder) && (
          <div className={cn(
            "w-full lg:w-96 border-l border-border bg-card",
            showCheckout ? "block" : "hidden lg:block"
          )}>
            {showNewOrder ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">{t("pos.newOrderTitle")}</h2>
                  <button onClick={() => { setShowNewOrder(false); setNewOrderError("") }}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("pos.customerName")}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setNewOrderType("dine_in")}
                      className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        newOrderType === "dine_in"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}>{t("pos.dineIn")}</button>
                    <button onClick={() => setNewOrderType("takeaway")}
                      className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        newOrderType === "takeaway"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}>{t("pos.takeaway")}</button>
                  </div>
                  {newOrderType === "dine_in" && (
                    <input value={newTable} onChange={e => setNewTable(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder={t("pos.tableNumber")}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                      inputMode="numeric"
                    />
                  )}
                  <div className="space-y-2">
                    {[...new Set(products.map(p => p.category))].map(cat => (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{cat}</p>
                        {products.filter(p => p.category === cat).map(p => {
                          const sizes = getAvailableSizes(p)
                          const defaultSize = sizes[0] || "UNIQUE"
                          const existing = newOrderItems.find(i => i.product.id === p.id)
                          return (
                            <div key={p.id} className="flex items-center justify-between py-1.5 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {p.image_url ? (
                                  <Image src={p.image_url} alt="" width={28} height={28} className="rounded object-cover flex-shrink-0" />
                                ) : (
                                  <span className="h-7 w-7 rounded flex items-center justify-center flex-shrink-0 text-base">🍕</span>
                                )}
                                <span className="text-sm text-foreground truncate">{p.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {existing ? (
                                  <>
                                    <button onClick={() => setNewOrderItems(prev => {
                                      const updated = prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity - 1 } : i)
                                      return updated.filter(i => i.quantity > 0)
                                    })}
                                      className="h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 flex items-center justify-center text-sm font-medium">−</button>
                                    <span className="text-sm font-semibold w-5 text-center">{existing.quantity}</span>
                                    <button onClick={() => setNewOrderItems(prev => prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i))}
                                      className="h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 flex items-center justify-center text-sm font-medium">+</button>
                                  </>
                                ) : (
                                  <button onClick={() => setNewOrderItems(prev => [...prev, { product: p, size: defaultSize, sauceId: p.has_white_sauce ? 2 : null, quantity: 1 }])}
                                    className="h-7 w-7 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center text-sm font-medium transition-colors">+</button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 border-t border-border">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-muted-foreground">{t("pos.total")}</span>
                    <span className="text-lg font-bold text-foreground">
                      {newOrderItems.reduce((s, i) => s + getPrice(i.product, i.size, i.sauceId) * i.quantity, 0)} {cur}
                    </span>
                  </div>
                  <button onClick={handleCreateOrder} disabled={!newName || newOrderItems.length === 0 || creatingOrder}
                    className={cn("w-full rounded-lg py-2.5 text-sm font-semibold transition-all",
                      newName && newOrderItems.length > 0 && !creatingOrder ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}>{creatingOrder ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {t("common.processing")}
                      </span>
                    ) : t("pos.submitOrder")}</button>
                  {newOrderError && <p className="text-sm text-destructive text-center mt-2">{newOrderError}</p>}
                </div>
              </div>
            ) : selectedOrder && (
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
                  <button onClick={() => setShowCheckout(true)}
                    disabled={selectedOrder.status !== "completed"}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >{selectedOrder.status === "completed" ? t("pos.paymentCash") : "غير جاهز"}</button>
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
                <CheckoutPanel order={selectedOrder} onClose={() => setShowCheckout(false)} onComplete={handleComplete} />
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
                          <button onClick={() => setEditQuantities(p => ({ ...p, [Number(item.id)]: Math.max(0, (p[Number(item.id)] ?? item.quantity) - 1) }))}
                            className="h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 flex items-center justify-center text-sm font-medium">−</button>
                          <span className="text-sm font-semibold w-6 text-center">{editQuantities[Number(item.id)] ?? item.quantity}</span>
                          <button onClick={() => setEditQuantities(p => ({ ...p, [Number(item.id)]: (p[Number(item.id)] ?? item.quantity) + 1 }))}
                            className="h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 flex items-center justify-center text-sm font-medium">+</button>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-foreground">{(editQuantities[Number(item.id)] ?? item.quantity) * item.price} {cur}</span>
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
                  <div className="pt-3 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-foreground">{t("pos.total")}</span>
                      <span className="text-xl font-bold text-foreground">{selectedOrder.total} {cur}</span>
                    </div>
                  </div>
                  {selectedOrder.orderType === "delivery" && selectedOrder.customerPhone && (
                    <div className="pt-2 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("pos.phone")}</span>
                        <span className="text-foreground font-medium" dir="ltr">{selectedOrder.customerPhone}</span>
                      </div>
                      <a href={`tel:${selectedOrder.customerPhone.replace(/[^0-9]/g, "")}`}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {t("pos.sendToDriver")}
                      </a>
                    </div>
                  )}
                  {selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" && (
                    <button onClick={() => setCancelTargetId(String(selectedOrder.id))}
                      className="w-full rounded-lg border border-destructive/30 text-destructive py-2.5 text-sm font-medium hover:bg-destructive/5 transition-colors">{t("pos.cancelOrder")}</button>
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
