"use client";

import { useEffect, useMemo, useState, useRef, useCallback, Component, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { logger } from "@/lib/logger";
import type { MenuProduct } from "@/lib/types";
import { fetchApi } from "@/lib/tenant";
import { getOrderTrackingUrl } from "@/lib/order-tracking";
import { useCart } from "@/context/CartContext";
import { AppHeader } from "./app-header";
import { CategoryFilter } from "./category-filter";
import { MealCard } from "./meal-card";
import { OrderBar } from "./order-bar";
import { CheckoutModal } from "./checkout-modal";

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
            <div className="text-5xl mb-4">🍔</div>
            <h2 className="text-lg font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">Please refresh the page to try again.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function FoodDeliveryApp({ initialProducts, slug: propSlug }: { initialProducts?: MenuProduct[]; slug?: string }) {
  const router = useRouter();
  const [products, setProducts] = useState<MenuProduct[]>(initialProducts || []);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sizes, setSizes] = useState<Record<number, string>>({});
  const [sauces, setSauces] = useState<Record<number, number | null>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { items, addItem, updateQuantity, itemCount, clear, total } = useCart();

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

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setCategories([...new Set(initialProducts.map(p => p.category).filter(Boolean))] as string[])
      const initSauces: Record<number, number | null> = {};
      initialProducts.forEach(p => { initSauces[p.id] = p.has_white_sauce ? 1 : null });
      setSauces(initSauces);
      const initSizes: Record<number, string> = {};
      initialProducts.forEach(p => {
        const avSizes = p.prices ? Object.keys(p.prices).filter(s => {
          const sp = p.prices[s];
          return sp.sauce_tomate != null || sp.creme_fraiche != null || sp.standard != null;
        }) : [];
        initSizes[p.id] = avSizes[0] || "L";
      });
      setSizes(initSizes);
      return
    }
    fetchApi("/api/products").then(r => {
      if (!r.ok) throw new Error(`Products API returned ${r.status}`)
      return r.json()
    }).then(data => {
      if (!Array.isArray(data)) return
      const available = data.filter((p: { is_available?: boolean }) => p.is_available !== false) as MenuProduct[]
      setProducts(available);
      const cats = [...new Set(available.map(p => p.category).filter(Boolean))] as string[];
      setCategories(cats);
      const initSauces: Record<number, number | null> = {};
      available.forEach(p => { initSauces[p.id] = p.has_white_sauce ? 1 : null });
      setSauces(initSauces);
      const initSizes: Record<number, string> = {};
      available.forEach(p => {
        const avSizes = p.prices ? Object.keys(p.prices).filter(s => {
          const sp = p.prices[s];
          return sp.sauce_tomate != null || sp.creme_fraiche != null || sp.standard != null;
        }) : [];
        initSizes[p.id] = avSizes[0] || "L";
      });
      setSizes(initSizes);
    }).catch(e => {
      logger.error("Failed to fetch products", e)
    });
  }, []);

  const filtered = selectedCategory === "All"
    ? products
    : products.filter(p => p.category === selectedCategory);

  const cartQuantities = items.reduce((acc, i) => {
    acc[`${i.product.id}_${i.size}_${i.sauceId}`] = i.quantity;
    return acc;
  }, {} as Record<string, number>);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background pb-24">
        <AppHeader cartItemCount={itemCount} onCart={() => setCheckoutOpen(true)} />

        <main className="px-4 pt-4">
          <CategoryFilter categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          <div className="grid grid-cols-2 gap-3 mt-4">
            {filtered.length === 0 && (
              <div className="col-span-2 text-center py-16 text-muted-foreground">
                <p className="text-5xl mb-4">🍽️</p>
                <p className="text-sm">No products available</p>
              </div>
            )}
            {filtered.map(p => {
              const k = `${p.id}_${sizes[p.id] || "L"}_${sauces[p.id] ?? null}`;
              return (
                <MealCard key={p.id} product={p}
                  size={sizes[p.id] || "L"}
                  sauceId={sauces[p.id] ?? null}
                  quantity={cartQuantities[k] || 0}
                  onSizeChange={(s) => setSizes(prev => ({ ...prev, [p.id]: s }))}
                  onSauceChange={(s) => setSauces(prev => ({ ...prev, [p.id]: s }))}
                  onAdd={() => debouncedAdd(() => { addItem(p, sizes[p.id] || "L", sauces[p.id] ?? null); logger.info("Added", { name: p.name }); })}
                  onUpdateQuantity={(d) => { updateQuantity(p.id, sizes[p.id] || "L", sauces[p.id] ?? null, d); }}
                />
              );
            })}
          </div>
        </main>

        <OrderBar onCheckout={() => setCheckoutOpen(true)} />

        {checkoutOpen && (
          <CheckoutModal
            items={items}
            total={total}
            slug={slug}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={(orderId) => { setCheckoutOpen(false); router.push(getOrderTrackingUrl(slug, orderId)) }}
            onClear={clear}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
