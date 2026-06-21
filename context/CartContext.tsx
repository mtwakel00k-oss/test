"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { MenuProduct, CartItem } from "@/lib/types"
import { getPrice } from "@/lib/types"
import { logger } from "@/lib/logger"

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

function cartStorageKey(): string {
  if (typeof window === "undefined") return "cart:default"
  const slug = (window as Window & { __TENANT_CONFIG__?: { slug?: string } }).__TENANT_CONFIG__?.slug ?? "default"
  return `cart:${slug}`
}

const CartCtx = createContext<Ctx | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(cartStorageKey())
      if (saved) {
        const parsed = JSON.parse(saved)
        queueMicrotask(() => { if (Array.isArray(parsed)) setItems(parsed) })
      }
    } catch (e) { logger.warn("Failed to hydrate cart from localStorage — corrupt data", e) }
    queueMicrotask(() => setHydrated(true))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const timer = setTimeout(() => {
      localStorage.setItem(cartStorageKey(), JSON.stringify(items))
    }, 300)
    return () => clearTimeout(timer)
  }, [items, hydrated])

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
