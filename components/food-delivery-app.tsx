"use client"

import { useEffect, useMemo, useState, useRef, useCallback, startTransition, Component, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"

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
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <div className="flex items-center justify-center w-20 h-20 mx-auto mb-5 rounded-2xl bg-muted/40 border border-border/30">
              <span className="text-4xl">🍔</span>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1.5">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">Refresh the page to try again.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function SkeletonCard() {
  return (
    <div className="premium-bezel animate-pulse">
      <div className="premium-bezel-inner overflow-hidden">
        <div className="aspect-[4/3] bg-muted/40" />
        <div className="space-y-3 p-5">
          <div className="h-4 w-3/4 rounded-full bg-muted/50" />
          <div className="h-3 w-full rounded-full bg-muted/30" />
          <div className="h-10 rounded-full bg-muted/40" />
        </div>
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

function FoodDeliveryAppInner({ initialProducts, slug: propSlug }: { initialProducts?: MenuProduct[]; slug?: string }) {
  const router = useRouter()
  const { t } = useTranslation()
  const [products, setProducts] = useState<MenuProduct[]>(initialProducts || [])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sizes, setSizes] = useState<Record<number, string>>({})
  const [sauces, setSauces] = useState<Record<number, number | null>>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [loading, setLoading] = useState(() => !(initialProducts && initialProducts.length > 0))
  const { items, addItem, updateQuantity, itemCount, clear, total, removeProduct: _removeProduct } = useCart()

  const itemsRef = useRef(items)
  const removeProductRef = useRef(_removeProduct)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { removeProductRef.current = _removeProduct }, [_removeProduct])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedAdd = useCallback((fn: () => void) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fn, 300)
  }, [])

  const slug = useMemo(() => {
    if (propSlug) return propSlug
    if (typeof window === "undefined") return ""
    const el = document.getElementById("tenant-config")
    try { if (el?.textContent) return JSON.parse(el.textContent).slug || "" } catch {}
    try { return ((window as unknown as Record<string, unknown>).__TENANT_CONFIG__ as { slug?: string })?.slug || "" } catch {}
    return ""
  }, [propSlug])

  const isOpen = useMemo(() => {
    if (typeof window === "undefined") return true
    try {
      const el = document.getElementById("tenant-config")
      if (el?.textContent) return JSON.parse(el.textContent).is_open !== false
      return ((window as unknown as Record<string, unknown>).__TENANT_CONFIG__ as { is_open?: boolean })?.is_open !== false
    } catch {
      return true
    }
  }, [])

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      startTransition(() => {
        setCategories([...new Set(initialProducts.map(p => p.category).filter(Boolean))] as string[])
        const initSauces: Record<number, number | null> = {}
        initialProducts.forEach(p => { initSauces[p.id] = p.has_white_sauce ? 1 : null })
        setSauces(initSauces)
        const initSizes: Record<number, string> = {}
        initialProducts.forEach(p => {
          const avSizes = p.prices ? Object.keys(p.prices).filter(s => {
            const sp = p.prices[s]
            return sp.sauce_tomate != null || sp.creme_fraiche != null || sp.standard != null
          }) : []
          initSizes[p.id] = avSizes[0] || "L"
        })
        setSizes(initSizes)
        setLoading(false)
      })
    } else {
      fetchApi("/api/products").then(r => {
        if (!r.ok) throw new Error(`Products API returned ${r.status}`)
        return r.json()
      }).then(data => {
        if (!Array.isArray(data)) return
        const available = data.filter((p: { is_available?: boolean }) => p.is_available !== false) as MenuProduct[]
        setProducts(available)
        const cats = [...new Set(available.map(p => p.category).filter(Boolean))] as string[]
        setCategories(cats)
        const initSauces: Record<number, number | null> = {}
        available.forEach(p => { initSauces[p.id] = p.has_white_sauce ? 1 : null })
        setSauces(initSauces)
        const initSizes: Record<number, string> = {}
        available.forEach(p => {
          const avSizes = p.prices ? Object.keys(p.prices).filter(s => {
            const sp = p.prices[s]
            return sp.sauce_tomate != null || sp.creme_fraiche != null || sp.standard != null
          }) : []
          initSizes[p.id] = avSizes[0] || "L"
        })
        setSizes(initSizes)
      }).catch(e => {
        logger.error("Failed to fetch products", e)
      }).finally(() => {
        setLoading(false)
      })
    }
  }, [initialProducts])

  useEffect(() => {
    if (products.length === 0) return
    const validIds = new Set(products.map(p => p.id))
    const stale = itemsRef.current.filter(i => !validIds.has(i.product.id))
    if (stale.length > 0) {
      logger.warn("Removing stale items from cart", { removed: stale.map(i => ({ id: i.product.id, name: i.product.name })) })
      for (const s of stale) removeProductRef.current(s.product.id)
    }
  }, [products])

  const filtered = selectedCategory === "All"
    ? products
    : products.filter(p => p.category === selectedCategory)

  const cartQuantities = items.reduce((acc, i) => {
    acc[`${i.product.id}_${i.size}_${i.sauceId}`] = i.quantity
    return acc
  }, {} as Record<string, number>)

  return (
    <ErrorBoundary>
      <div className="min-h-[100dvh] app-surface relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-48 -right-48 h-[32rem] w-[32rem] rounded-full bg-primary/4 blur-[120px]" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/4 blur-[100px]" />
        </div>

        {!isOpen && (
          <div className="relative mx-auto max-w-5xl px-4 pt-4">
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-5 py-4 flex items-center gap-3 text-rose-600">
              <DoorClosed className="size-5 shrink-0" strokeWidth={2} />
              <div>
                <p className="text-sm font-bold">{t("menu.restaurantClosed")}</p>
                <p className="text-xs text-rose-500/80">{t("menu.closedMessage")}</p>
              </div>
            </div>
          </div>
        )}

        <AppHeader cartItemCount={itemCount} onCart={() => setCheckoutOpen(true)} />

        <main className="relative mx-auto max-w-5xl px-4 pb-32 pt-8 md:px-6">
          <div className="mb-10">
            <motion.div
              initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
            >
              <span className="section-eyebrow mb-4">Menu</span>
              <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-normal tracking-tight text-foreground">القائمة</h1>
              <p className="mt-3 text-sm text-muted-foreground max-w-md">اختر وجبتك المفضلة من قائمتنا المتنوعة</p>
            </motion.div>
          </div>

          <div className="mb-8">
            <CategoryFilter categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="col-span-full flex flex-col items-center justify-center py-28 text-center gap-6"
              >
                <div className="premium-bezel">
                  <div className="premium-bezel-inner p-6">
                    <ShoppingBag className="size-10 text-muted-foreground/20" strokeWidth={1} />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-semibold text-foreground">لا توجد منتجات</p>
                  <p className="text-sm text-muted-foreground/60 mt-2 max-w-xs">عذراً، لا توجد منتجات متوفرة في هذا القسم حالياً.</p>
                </div>
              </motion.div>
            ) : (
              filtered.map((p, idx) => {
                const k = `${p.id}_${sizes[p.id] || "L"}_${sauces[p.id] ?? null}`
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.1 + idx * 0.06,
                    }}
                  >
                    <MealCard product={p}
                      size={sizes[p.id] || "L"}
                      sauceId={sauces[p.id] ?? null}
                      quantity={isOpen ? cartQuantities[k] || 0 : 0}
                      priority={idx < 6}
                      onSizeChange={(s) => setSizes(prev => ({ ...prev, [p.id]: s }))}
                      onSauceChange={(s) => setSauces(prev => ({ ...prev, [p.id]: s }))}
                      onAdd={isOpen ? () => debouncedAdd(() => { addItem(p, sizes[p.id] || "L", sauces[p.id] ?? null); logger.info("Added", { name: p.name }) }) : () => {}}
                      onUpdateQuantity={isOpen ? (d) => { updateQuantity(p.id, sizes[p.id] || "L", sauces[p.id] ?? null, d) } : () => {}}
                    />
                  </motion.div>
                )
              })
            )}
          </div>
        </main>

        <OrderBar onCheckout={() => isOpen && setCheckoutOpen(true)} disabled={!isOpen} />

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