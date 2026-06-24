"use client"

import { useEffect, useMemo, useState, useRef, useCallback, useDeferredValue, Component, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"

import { useTranslation } from "@/lib/use-translation"
import { logger } from "@/lib/logger"
import type { MenuProduct } from "@/lib/types"
import { fetchApi } from "@/lib/tenant"
import { getOrderTrackingUrl } from "@/lib/order-tracking"
import { CartProvider, useCart } from "@/context/CartContext"
import { AppHeader } from "./app-header"
import { CategoryFilter } from "./category-filter"
import { MealCard } from "./meal-card"
import { OrderBar } from "./order-bar"
import { ShoppingBag, DoorClosed } from "lucide-react"
import { EmptyState } from "@/components/empty-state"

const CheckoutModal = dynamic(
  () => import("./checkout-modal").then(m => ({ default: m.CheckoutModal })),
  { ssr: false },
)

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    logger.error("Menu ErrorBoundary caught", error)
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <div className="relative mx-auto mb-6 flex size-24 items-center justify-center">
              <div className="absolute inset-0 rounded-[2rem] bg-accent/10 blur-xl" />
              <div className="relative flex items-center justify-center w-20 h-20 rounded-[2rem] border border-accent/20 bg-card shadow-lg">
                <svg className="size-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" />
                  <path d="M5 2v20" />
                  <path d="M9 2v20" />
                  <path d="M18 2a3 3 0 0 0-3 3v6h3" />
                  <path d="M18 11v11" />
                </svg>
              </div>
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">حدث خطأ ما</h2>
            <p className="text-sm text-muted-foreground/70 leading-relaxed">يرجى تحديث الصفحة والمحاولة مرة أخرى.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function SkeletonCard() {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/20 bg-card shadow-sm">
      <div className="aspect-[4/3] bg-gradient-to-br from-primary/[0.03] via-primary/[0.06] to-primary/[0.02] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-pulse" />
      </div>
      <div className="space-y-3.5 p-5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 rounded-md bg-muted/30 animate-pulse" />
          <div className="h-4 w-20 rounded-md bg-muted/20 animate-pulse" />
        </div>
        <div className="h-5 w-2/3 rounded-lg bg-muted/30 animate-pulse" />
        <div className="h-3 w-full rounded-md bg-muted/20 animate-pulse mt-3" />
        <div className="h-3 w-3/4 rounded-md bg-muted/20 animate-pulse" />
        <div className="flex gap-2 pt-2">
          <div className="h-7 w-14 rounded-full bg-muted/20 animate-pulse" />
          <div className="h-7 w-16 rounded-full bg-muted/20 animate-pulse" />
        </div>
        <div className="h-11 w-full rounded-full bg-muted/20 animate-pulse mt-4" />
      </div>
    </div>
  )
}

export function FoodDeliveryApp(props: { initialProducts?: MenuProduct[]; slug?: string }) {
  return (
    <CartProvider>
      <FoodDeliveryAppInner {...props} />
    </CartProvider>
  )
}

function initDerived(prods: MenuProduct[] | undefined) {
  if (!prods || prods.length === 0) return null
  const catSet = new Set<string>()
  const sRec: Record<number, number | null> = {}
  const szRec: Record<number, string> = {}
  for (const p of prods) {
    if (p.category) catSet.add(p.category)
    sRec[p.id] = p.has_white_sauce ? 1 : null
    if (p.prices) {
      const keys = Object.keys(p.prices)
      let found = ""
      for (const k of keys) {
        const sp = p.prices[k]
        if (sp.sauce_tomate != null || sp.creme_fraiche != null || sp.standard != null) { found = k; break }
      }
      szRec[p.id] = found || "L"
    } else {
      szRec[p.id] = "L"
    }
  }
  return { cats: [...catSet] as string[], sauces: sRec, sizes: szRec }
}

function readConfig() {
  if (typeof window === "undefined") return null
  try {
    const el = document.getElementById("tenant-config")
    if (el?.textContent) return JSON.parse(el.textContent)
  } catch {}
  try {
    return (window as unknown as Record<string, unknown>).__TENANT_CONFIG__
  } catch {}
  return null
}

function FoodDeliveryAppInner({ initialProducts, slug: propSlug }: { initialProducts?: MenuProduct[]; slug?: string }) {
  const router = useRouter()
  const { t } = useTranslation()
  const initData = initDerived(initialProducts)
  const [products, setProducts] = useState<MenuProduct[]>(initialProducts || [])
  const [categories, setCategories] = useState<string[]>(initData?.cats || [])
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sizes, setSizes] = useState<Record<number, string>>(initData?.sizes || {})
  const [sauces, setSauces] = useState<Record<number, number | null>>(initData?.sauces || {})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [loading, setLoading] = useState(() => !(initialProducts && initialProducts.length > 0))
  const [slug] = useState(() => propSlug || (readConfig() as { slug?: string })?.slug || "")
  const [isOpen, setIsOpen] = useState(() => (readConfig() as { is_open?: boolean })?.is_open !== false)
  const { items, addItem, updateQuantity, itemCount, clear, total, removeProduct: _removeProduct } = useCart()

  const itemsRef = useRef(items)
  const removeProductRef = useRef(_removeProduct)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { removeProductRef.current = _removeProduct }, [_removeProduct])

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetchApi("/api/tenant/logo")
        if (res.ok) { const j = await res.json(); if (typeof j.is_open === "boolean") setIsOpen(j.is_open) }
      } catch { /* ignore */ }
    }, 10000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) return
    fetchApi("/api/products").then(r => {
      if (!r.ok) throw new Error(`Products API returned ${r.status}`)
      return r.json()
    }).then((data: MenuProduct[]) => {
      const prod = Array.isArray(data) ? data : (data as { data: MenuProduct[] }).data || []
      setProducts(prod)
      if (prod.length > 0) {
        const derived = initDerived(prod)
        if (derived) {
          setCategories(derived.cats)
          setSauces(derived.sauces)
          setSizes(derived.sizes)
        }
      }
      setLoading(false)
    }).catch(e => { logger.warn("Failed to fetch products", e); setLoading(false) })
  }, [initialProducts])

  const filteredProducts = useDeferredValue(products)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedAdd = useCallback((fn: () => void) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fn, 300)
  }, [])

  const filtered = useMemo(() => 
    selectedCategory === "All"
      ? filteredProducts
      : filteredProducts.filter(p => p.category === selectedCategory)
  , [filteredProducts, selectedCategory])

  const cartQuantities = useMemo(() => 
    items.reduce((acc, i) => {
      acc[`${i.product.id}_${i.size}_${i.sauceId}`] = i.quantity
      return acc
    }, {} as Record<string, number>)
  , [items])

  const handleSizeChange = useCallback((productId: number, s: string) => {
    setSizes(prev => ({ ...prev, [productId]: s }))
  }, [])

  const handleSauceChange = useCallback((productId: number, s: number | null) => {
    setSauces(prev => ({ ...prev, [productId]: s }))
  }, [])



  useEffect(() => {
    if (products.length === 0) return
    const validIds = new Set(products.map(p => p.id))
    const stale = itemsRef.current.filter(i => !validIds.has(i.product.id))
    if (stale.length > 0) {
      logger.warn("Removing stale items from cart", { removed: stale.map(i => ({ id: i.product.id, name: i.product.name })) })
      for (const s of stale) removeProductRef.current(s.product.id)
    }
  }, [products])

  return (
    <ErrorBoundary>
      <div className="min-h-[100dvh] bg-background relative" dir="rtl">
        {/* Ambient background orbs — static on mobile for perf */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-48 -right-48 h-[36rem] w-[36rem] rounded-full bg-primary/[0.035] blur-[140px]" />
          <div className="absolute -bottom-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-accent/[0.04] blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-primary/[0.02] blur-[100px]" />
        </div>

        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="relative mx-auto max-w-5xl px-4 pt-4 md:px-8"
            >
              <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-500/8 to-rose-500/4 px-5 py-4 flex items-center gap-3 text-rose-600 shadow-sm backdrop-blur-sm">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10">
                  <DoorClosed className="size-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-bold">{t("menu.restaurantClosed")}</p>
                  <p className="text-xs text-rose-500/70">{t("menu.closedMessage")}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AppHeader cartItemCount={itemCount} onCart={() => setCheckoutOpen(true)} isOpen={isOpen} />

        <main className="relative mx-auto max-w-5xl px-4 pb-44 pt-10 md:px-8 md:pt-14" aria-label="Menu content">
          {/* Category filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.25 }}
            className="mb-10 md:mb-12"
          >
            <CategoryFilter categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          </motion.div>

          {/* Menu grid — grouped by category when "All" selected */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<ShoppingBag className="size-9" />} title="لا توجد منتجات" description="عذراً، لا توجد منتجات متوفرة في هذا القسم حالياً." />
          ) : selectedCategory === "All" ? (
            <>
              {categories.map((cat, catIdx) => {
                const catProducts = filtered.filter(p => p.category === cat)
                if (catProducts.length === 0) return null
                return (
                  <motion.section
                    key={cat}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 80, damping: 18, delay: catIdx * 0.06 }}
                    className="mb-8 last:mb-0"
                  >
                    {catIdx > 0 && (
                      <div className="border-b border-border/20 mb-8" />
                    )}
                    <div className="flex items-center gap-3 mb-5">
                      <h2 className="font-display text-xl font-bold text-foreground">{cat}</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
                      <span className="text-xs font-medium text-muted-foreground/60">{catProducts.length} items</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {catProducts.map((p, idx) => {
                        const k = `${p.id}_${sizes[p.id] || "L"}_${sauces[p.id] ?? null}`
                        return (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ type: "spring", stiffness: 100, damping: 20, delay: idx * 0.04 }}
                          >
                            <MealCard product={p}
                              size={sizes[p.id] || "L"}
                              sauceId={sauces[p.id] ?? null}
                              quantity={isOpen ? cartQuantities[k] || 0 : 0}
                              priority={idx < 6}
                              onSizeChange={handleSizeChange}
                              onSauceChange={handleSauceChange}
                              onAdd={isOpen ? () => debouncedAdd(() => { addItem(p, sizes[p.id] || "L", sauces[p.id] ?? null); logger.info("Added", { name: p.name }) }) : () => {}}
                              onUpdateQuantity={isOpen ? (d) => { updateQuantity(p.id, sizes[p.id] || "L", sauces[p.id] ?? null, d) } : () => {}}
                            />
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.section>
                )
              })}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filtered.map((p, idx) => {
                const k = `${p.id}_${sizes[p.id] || "L"}_${sauces[p.id] ?? null}`
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ type: "spring", stiffness: 100, damping: 20, delay: idx * 0.04 }}
                  >
                    <MealCard product={p}
                      size={sizes[p.id] || "L"}
                      sauceId={sauces[p.id] ?? null}
                      quantity={isOpen ? cartQuantities[k] || 0 : 0}
                      priority={idx < 6}
                      onSizeChange={handleSizeChange}
                      onSauceChange={handleSauceChange}
                      onAdd={isOpen ? () => debouncedAdd(() => { addItem(p, sizes[p.id] || "L", sauces[p.id] ?? null); logger.info("Added", { name: p.name }) }) : () => {}}
                      onUpdateQuantity={isOpen ? (d) => { updateQuantity(p.id, sizes[p.id] || "L", sauces[p.id] ?? null, d) } : () => {}}
                    />
                  </motion.div>
                )
              })}
            </div>
          )}
        </main>

        {/* Order bar — slides up when items exist */}
        <AnimatePresence>
          {itemCount > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="fixed bottom-0 inset-x-0 z-50"
            >
              <OrderBar onCheckout={() => isOpen && setCheckoutOpen(true)} disabled={!isOpen} />
            </motion.div>
          )}
        </AnimatePresence>

        {checkoutOpen && (
          <CheckoutModal
            items={items}
            total={total}
            slug={slug}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={(orderId) => { setCheckoutOpen(false); router.push(getOrderTrackingUrl(slug, orderId)) }}
            onClear={clear}
            onRemoveProduct={_removeProduct}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
