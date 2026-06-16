"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase, fetchApi } from "@/lib/tenant"
import type { MenuProduct } from "@/lib/types"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface UseProductsResult {
  products: MenuProduct[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useProducts(pollInterval = 15000): UseProductsResult {
  const [products, setProducts] = useState<MenuProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetchApi("/api/products")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: MenuProduct[] = await res.json()
      if (!Array.isArray(data)) throw new Error("Invalid response")
      setProducts(data.filter((p) => p.is_available !== false))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch products")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts]) // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    const sb = supabase()
    const channel = sb.channel("products-sync")

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "produits" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          const deletedId = payload.old?.id as number | undefined
          if (deletedId != null) {
            setProducts((prev) => prev.filter((p) => p.id !== deletedId))
          }
        } else {
          fetchProducts()
        }
      },
    )

    channel.subscribe()
    channelRef.current = channel

    return () => {
      sb.removeChannel(channel)
      channelRef.current = null
    }
  }, [fetchProducts])

  useEffect(() => {
    const interval = setInterval(() => fetchProducts(), pollInterval)
    return () => clearInterval(interval)
  }, [fetchProducts, pollInterval])

  return { products, loading, error, refresh: fetchProducts }
}
