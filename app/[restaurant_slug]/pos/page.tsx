"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { fetchApi } from "@/lib/tenant"
import { useProducts } from "@/lib/use-products"
import { initAudio } from "@/lib/sound"
import { useSlug } from "@/lib/use-slug"
import { POSHeader } from "@/components/pos/pos-header"
import { PageTransition } from "@/components/page-transition"

const OrdersPanel = dynamic(() => import("@/components/pos/orders-panel").then(m => ({ default: m.OrdersPanel })), {
  ssr: false,
})
const NewOrderPanel = dynamic(() => import("@/components/pos/new-order-panel").then(m => ({ default: m.NewOrderPanel })), {
  ssr: false,
})

export default function POSPage() {
  const router = useRouter()
  const slug = useSlug()
  const [pageTab, setPageTab] = useState<"orders" | "new">("new")
  const [cashier, setCashier] = useState<{ email: string; role: string; name?: string } | null>(null)

  useEffect(() => {
    fetchApi("/api/me").then(r => r.ok ? r.json() : null).then(data => {
      if (!data || data.error) { router.push(`/${slug}/login`); return }
      if (data.role !== "admin" && data.role !== "owner" && data.role !== "cashier") { router.push(`/${slug}/login`); return }
      setCashier(data)
    }).catch(() => router.push(`/${slug}/login`))
  }, [router, slug])

  useEffect(() => {
    const unlock = () => { initAudio(); document.removeEventListener("pointerdown", unlock) }
    document.addEventListener("pointerdown", unlock)
    return () => document.removeEventListener("pointerdown", unlock)
  }, [])

  const { products } = useProducts()

  const handleOrderCreated = useCallback(() => { setPageTab("orders") }, [])

  return (
    <div className="min-h-screen bg-background">
      <POSHeader
        totalOrders={0} activeOrders={0} todayRevenue={0}
        onNewOrder={() => setPageTab("new")}
        userName={cashier?.email?.split("@")[0]} userRole={cashier?.role}
      />
      <PageTransition>
        {pageTab === "orders" ? (
          <OrdersPanel onNewOrder={() => setPageTab("new")} />
        ) : (
          <NewOrderPanel products={products} onOrderCreated={handleOrderCreated} onCancel={() => setPageTab("orders")} hasDelivery={true} />
        )}
      </PageTransition>
    </div>
  )
}