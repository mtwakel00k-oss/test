"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import type { MenuProduct, CartItem } from "@/lib/types"
import { getPrice } from "@/lib/types"

interface Ctx {
  items: CartItem[]
  addItem: (p: MenuProduct, size: string, sauceId: number | null) => void
  updateQuantity: (pid: number, size: string, sauceId: number | null, d: number) => void
  removeItem: (pid: number, size: string, sauceId: number | null) => void
  removeProduct: (pid: number) => void
  clear: () => void
  total: number
  itemCount: number
}

function key(pid: number, size: string, sid: number | null) {
  return `${pid}_${size}_${sid ?? 0}`
}

const CartCtx = createContext<Ctx | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return []
    try { const s = localStorage.getItem("cart"); return s ? JSON.parse(s) : [] } catch { return [] }
  })
  const persistRef = useRef(items)
  persistRef.current = items
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("cart", JSON.stringify(persistRef.current))
    }, 300)
    return () => clearTimeout(timer)
  }, [items])

  const addItem = useCallback((product: MenuProduct, size: string, sauceId: number | null) => {
    if (product.is_available === false) {
      window.alert("عذراً، هذه الوجبة غير متوفرة حالياً")
      return
    }
    setItems(p => {
      const k = key(product.id, size, sauceId)
      const i = p.find(x => key(x.product.id, x.size, x.sauceId) === k)
      return i
        ? p.map(x => key(x.product.id, x.size, x.sauceId) === k ? { ...x, quantity: x.quantity + 1 } : x)
        : [...p, { product, size, sauceId, quantity: 1 }]
    })
  }, [])

  const updateQuantity = useCallback((pid: number, size: string, sauceId: number | null, delta: number) =>
    setItems(p => {
      const k = key(pid, size, sauceId)
      return p.map(i =>
        key(i.product.id, i.size, i.sauceId) === k
          ? { ...i, quantity: Math.max(0, i.quantity + delta) }
          : i
      ).filter(i => i.quantity > 0)
    }), [])

  const removeItem = useCallback((pid: number, size: string, sauceId: number | null) =>
    setItems(p => p.filter(i => !(i.product.id === pid && i.size === size && i.sauceId === sauceId))), [])

  const removeProduct = useCallback((pid: number) =>
    setItems(p => p.filter(i => i.product.id !== pid)), [])

  const clear = useCallback(() => setItems([]), [])
  const total = items.reduce((s, i) => s + getPrice(i.product, i.size, i.sauceId) * i.quantity, 0)
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <CartCtx.Provider value={{ items, addItem, updateQuantity, removeItem, removeProduct, clear, total, itemCount }}>
      {children}
    </CartCtx.Provider>
  )
}

export function useCart() {
  const c = useContext(CartCtx)
  if (!c) throw new Error("useCart must be used within CartProvider")
  return c
}
