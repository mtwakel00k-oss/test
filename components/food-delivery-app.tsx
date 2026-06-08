"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

import { useSlug, readTenantConfig } from "@/lib/use-slug";
import { logger } from "@/lib/logger";
import { getAvailableSizes } from "@/lib/types";
import type { OrderType } from "@/lib/types";
import { useProducts } from "@/lib/use-products";
import { useCart } from "@/context/CartContext";
import { AppHeader } from "./app-header";
import { CategoryFilter } from "./category-filter";
import { MealCard } from "./meal-card";
import { OrderBar } from "./order-bar";
import { CheckoutModal } from "./checkout-modal";

function getPlan(): string {
  if (typeof window === "undefined") return "starter"
  return readTenantConfig()?.plan_type || "starter"
}

export function FoodDeliveryApp() {
  const router = useRouter();
  const slug = useSlug();
  const { products } = useProducts();
  const { items, addItem, updateQuantity, removeProduct, itemCount, clear, total } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sizes, setSizes] = useState<Record<number, string>>({});
  const [sauces, setSauces] = useState<Record<number, number | null>>({});

  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const planType = getPlan();

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("error")
      return
    }
    setGeoStatus("loading")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoStatus("success")
      },
      () => {
        setGeoStatus("error")
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  const productIds = useMemo(() => new Set(products.map((p) => p.id)), [products])
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))] as string[], [products])
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    setSizes((prev) => {
      const next = { ...prev }
      for (const id of Object.keys(next).map(Number)) {
        if (!productIds.has(id)) delete next[id]
      }
      for (const p of products) {
        if (!next[p.id]) {
          const avSizes = p.prices ? Object.keys(p.prices).filter((s) => {
            const sp = p.prices[s];
            return sp.sauce_tomate != null || sp.creme_fraiche != null || sp.standard != null;
          }) : [];
          next[p.id] = avSizes[0] || "L";
        }
      }
      return next
    })
    setSauces((prev) => {
      const next = { ...prev }
      for (const id of Object.keys(next).map(Number)) {
        if (!productIds.has(id)) delete next[id]
      }
      for (const p of products) {
        if (!(p.id in next)) {
          next[p.id] = p.has_white_sauce ? 1 : null
        }
      }
      return next
    })
    items.forEach((i) => {
      if (!productIds.has(i.product.id)) removeProduct(i.product.id)
    })
  }, [productIds])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const filtered = selectedCategory === "All"
    ? products
    : products.filter(p => p.category === selectedCategory);

  const cartQuantities = items.reduce((acc, i) => {
    acc[`${i.product.id}_${i.size}_${i.sauceId}`] = i.quantity;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader cartItemCount={itemCount} onCart={() => setCheckoutOpen(true)} />

      <main className="px-4 pt-4 space-y-4">
        <CategoryFilter categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(p => {
            const pSizes = getAvailableSizes(p)
            const pSize = sizes[p.id] || pSizes[0] || "UNIQUE"
            const k = `${p.id}_${pSize}_${sauces[p.id] ?? null}`;
            return (
              <MealCard key={p.id} product={p}
                size={pSize}
                sauceId={sauces[p.id] ?? null}
                quantity={cartQuantities[k] || 0}
                onSizeChange={(s) => setSizes(prev => ({ ...prev, [p.id]: s }))}
                onSauceChange={(s) => setSauces(prev => ({ ...prev, [p.id]: s }))}
                onAdd={() => { addItem(p, pSize, sauces[p.id] ?? null); logger.info("Added", { name: p.name }); }}
                onUpdateQuantity={(d) => { updateQuantity(p.id, pSize, sauces[p.id] ?? null, d); }}
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
          onClose={() => setCheckoutOpen(false)}
          onSuccess={(orderId) => { setCheckoutOpen(false); router.push(`/${slug}/order/${orderId}`) }}
          onClear={clear}
          initialOrderType={orderType}
          initialDeliveryPhone={deliveryPhone}
          initialCoords={coords}
        />
      )}
    </div>
  );
}
