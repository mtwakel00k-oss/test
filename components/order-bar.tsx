"use client";

import { ShoppingBag, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useTranslation } from "@/lib/use-translation";

interface OrderBarProps {
  onCheckout: () => void;
}

export function OrderBar({ onCheckout }: OrderBarProps) {
  const { t, lang } = useTranslation();
  const { items, total, itemCount } = useCart();

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50">
      <div className="h-6 bg-gradient-to-t from-background to-transparent" />
      <div className="bg-background/95 backdrop-blur-md border-t border-border px-4 pb-6 pt-3">
        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
          {items.slice(0, 4).map((item) => (
            <div
              key={`${item.product.id}_${item.size}_${item.sauceId}`}
              className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border-2 border-primary/30 bg-secondary flex items-center justify-center"
            >
              <span className="text-xl">🍔</span>
              {item.quantity > 1 && (
                <div className="absolute -top-1 -end-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {item.quantity}
                </div>
              )}
            </div>
          ))}
          {items.length > 4 && (
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <span className="text-muted-foreground text-xs font-medium">
                +{items.length - 4}
              </span>
            </div>
          )}
        </div>

        <button onClick={onCheckout} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingBag className="w-6 h-6" />
              <span className="absolute -top-2 -end-2 w-5 h-5 bg-primary-foreground text-primary text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            </div>
            <span className="font-semibold">{t("menu.viewOrder")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{total.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} {lang === "ar" ? "د.ج" : "DA"}</span>
            <ChevronRight className="w-5 h-5 rtl:scale-x-[-1]" />
          </div>
        </button>
      </div>
    </div>
  );
}
