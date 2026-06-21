"use client"

import { useState, useEffect, useCallback } from "react"
import { ProductGrid } from "./product-grid"
import { CartSidebar } from "./cart-sidebar"
import type { MenuProduct } from "@/lib/types"
import type { OrderType } from "@/types/order"
import { getPrice } from "@/lib/types"
import { fetchApi } from "@/lib/tenant"
import { playSuccessSound, playErrorSound } from "@/lib/sound"
import { useTranslation } from "@/lib/use-translation"
import { useStaff } from "@/context/StaffContext"
interface NewOrderPanelProps {
  products: MenuProduct[]
  onOrderCreated: () => void
  onCancel: () => void
  hasDelivery: boolean
}

interface NewOrderItem {
  product: MenuProduct
  size: string
  sauceId: number | null
  quantity: number
}

export function NewOrderPanel({ products, onOrderCreated, onCancel, hasDelivery }: NewOrderPanelProps) {
  const { t } = useTranslation()
  const { activeStaff } = useStaff()
  const [newName, setNewName] = useState("")
  const [newTable, setNewTable] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newOrderItems, setNewOrderItems] = useState<NewOrderItem[]>([])
  const [newOrderError, setNewOrderError] = useState("")
  const [newOrderType, setNewOrderType] = useState<OrderType>("dine_in")
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [cashier, setCashier] = useState<{ email: string; role: string; name?: string } | null>(null)

  useEffect(() => {
    fetchApi("/api/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && !data.error) setCashier(data)
      })
      .catch(() => {})
  }, [])

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
      setNewOrderError("")
      playSuccessSound()
      onOrderCreated()
      setNewName("")
      setNewTable("")
      setNewPhone("")
      setNewOrderItems([])
      setNewOrderType("dine_in")
    } catch {
      setNewOrderError(t("pos.orderError"))
    } finally {
      setCreatingOrder(false)
    }
  }, [newName, newTable, newPhone, newOrderItems, newOrderType, t, cashier, activeStaff, onOrderCreated])

  return (
    <div className="flex flex-1 flex-col md:flex-row min-h-0">
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
        hasDelivery={hasDelivery}
        onCancel={onCancel}
      />
    </div>
  )
}
