"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { logger } from "@/lib/logger";
import type { MenuProduct } from "@/lib/types";
import { fetchApi } from "@/lib/tenant";
import { useCart } from "@/context/CartContext";
import { AppHeader } from "./app-header";
import { CategoryFilter } from "./category-filter";
import { MealCard } from "./meal-card";
import { OrderBar } from "./order-bar";
import { CheckoutModal } from "./checkout-modal";

export function FoodDeliveryApp() {
  const router = useRouter();
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sizes, setSizes] = useState<Record<number, string>>({});
  const [sauces, setSauces] = useState<Record<number, number | null>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { items, addItem, updateQuantity, itemCount, clear, total } = useCart();

  useEffect(() => {
    fetchApi("/api/products").then(r => r.json()).then(data => {
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
    <div className="min-h-screen bg-background pb-24">
      <AppHeader cartItemCount={itemCount} onCart={() => setCheckoutOpen(true)} />

      <main className="px-4 pt-4">
        <CategoryFilter categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
        <div className="grid grid-cols-2 gap-3 mt-4">
          {filtered.map(p => {
            const k = `${p.id}_${sizes[p.id] || "L"}_${sauces[p.id] ?? null}`;
            return (
              <MealCard key={p.id} product={p}
                size={sizes[p.id] || "L"}
                sauceId={sauces[p.id] ?? null}
                quantity={cartQuantities[k] || 0}
                onSizeChange={(s) => setSizes(prev => ({ ...prev, [p.id]: s }))}
                onSauceChange={(s) => setSauces(prev => ({ ...prev, [p.id]: s }))}
                onAdd={() => { addItem(p, sizes[p.id] || "L", sauces[p.id] ?? null); logger.info("Added", { name: p.name }); }}
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
          onClose={() => setCheckoutOpen(false)}
          onSuccess={(orderId) => { setCheckoutOpen(false); router.push(`/order/${orderId}`) }}
          onClear={clear}
        />
      )}
    </div>
  );
}
