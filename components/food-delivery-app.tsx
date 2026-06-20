"use client"

import { useEffect, useMemo, useState, useRef, useCallback, useDeferredValue, Component, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"

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
                <svg className="size-10 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" />
                  <path d="M5 2v20" />
                  <path d="M9 2v20" />
                  <path d="M18 2a3 3 0 0 0-3 3v6h3" />
                  <path d="M18 11v11" />
                </svg>
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
  const [slug, setSlug] = useState(propSlug || "")
  const [isOpen, setIsOpen] = useState(true)
  const { items, addItem, updateQuantity, itemCount, clear, total, removeProduct: _removeProduct } = useCart()

  const itemsRef = useRef(items)
  const removeProductRef = useRef(_removeProduct)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { removeProductRef.current = _removeProduct }, [_removeProduct])

  // Read tenant config from DOM once on mount (avoids forced reflows during render)
  useEffect(() => {
    if (propSlug) {
      setSlug(propSlug)
      return
    }
    if (typeof window === "undefined") return
    try {
      const el = document.getElementById("tenant-config")
      if (el?.textContent) {
        const config = JSON.parse(el.textContent)
        setSlug(config.slug || "")
        setIsOpen(config.is_open !== false)
        return
      }
    } catch {}
    try {
      const config = (window as unknown as Record<string, unknown>).__TENANT_CONFIG__ as { slug?: string; is_open?: boolean }
      if (config) {
        setSlug(config.slug || "")
        setIsOpen(config.is_open !== false)
      }
    } catch {}
  }, [propSlug])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedAdd = useCallback((fn: () => void) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fn, 300)
  }, [])

  // Defer filtered computation to avoid blocking render
  const filteredProducts = useDeferredValue(products)

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
    if (initialProducts && initialProducts.length > 0) {
      const prod = initialProducts
      const catSet = new Set<string>()
      const initSauces: Record<number, number | null> = {}
      const initSizes: Record<number, string> = {}
      for (let i = 0; i < prod.length; i++) {
        const p = prod[i]
        if (p.category) catSet.add(p.category)
        initSauces[p.id] = p.has_white_sauce ? 1 : null
        if (p.prices) {
          const keys = Object.keys(p.prices)
          let found = ""
          for (let j = 0; j < keys.length; j++) {
            const sp = p.prices[keys[j]]
            if (sp.sauce_tomate != null || sp.creme_fraiche != null || sp.standard != null) {
              found = keys[j]; break
            }
          }
          initSizes[p.id] = found || "L"
        } else {
          initSizes[p.id] = "L"
        }
      }
      setCategories([...catSet] as string[])
      setSauces(initSauces)
      setSizes(initSizes)
      setLoading(false)
    } else {
      fetchApi("/api/products").then(r => {
        if (!r.ok) throw new Error(`Products API returned ${r.status}`)
        return r.json()
      }).then(data => {
        if (!Array.isArray(data)) return
        const available: MenuProduct[] = []
        const catSet = new Set<string>()
        const initSauces: Record<number, number | null> = {}
        const initSizes: Record<number, string> = {}
        for (let i = 0; i < data.length; i++) {
          const p = data[i]
          if (p.is_available === false) continue
          available.push(p)
          if (p.category) catSet.add(p.category)
          initSauces[p.id] = p.has_white_sauce ? 1 : null
          if (p.prices) {
            const keys = Object.keys(p.prices)
            let found = ""
            for (let j = 0; j < keys.length; j++) {
              const sp = p.prices[keys[j]]
              if (sp.sauce_tomate != null || sp.creme_fraiche != null || sp.standard != null) {
                found = keys[j]; break
              }
            }
            initSizes[p.id] = found || "L"
          } else {
            initSizes[p.id] = "L"
          }
        }
        setProducts(available)
        setCategories([...catSet] as string[])
        setSauces(initSauces)
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

  return (
    <ErrorBoundary>
      <div className="min-h-[100dvh] app-surface relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
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

        <main className="relative mx-auto max-w-5xl px-4 pb-32 pt-8 md:px-6" aria-label="Menu content">
          <div className="mb-8">
            <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-normal tracking-tight text-foreground">القائمة</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">اختر وجبتك المفضلة من قائمتنا المتنوعة</p>
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
              </>
            ) : filtered.length === 0 ? (
              <div
                className="animate-empty-enter col-span-full flex flex-col items-center justify-center py-28 text-center gap-6"
              >
                <div className="premium-bezel">
                  <div className="premium-bezel-inner p-6">
                    <ShoppingBag className="size-10 text-muted-foreground/20" strokeWidth={1} aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-semibold text-foreground">لا توجد منتجات</p>
                  <p className="text-sm text-muted-foreground/60 mt-2 max-w-xs">عذراً، لا توجد منتجات متوفرة في هذا القسم حالياً.</p>
                </div>
              </div>
            ) : (
              filtered.map((p, idx) => {
                const k = `${p.id}_${sizes[p.id] || "L"}_${sauces[p.id] ?? null}`
                return (
                  <div
                    key={p.id}
                    className="animate-card-enter"
                    style={{ animationDelay: `${0.1 + idx * 0.03}s` }}
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
                  </div>
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