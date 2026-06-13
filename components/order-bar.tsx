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
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-8">
      <div className="mx-auto max-w-2xl bg-background/80 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-1">
          {items.map((item) => (
            <div
              key={`${item.product.id}_${item.size}_${item.sauceId}`}
              className="relative size-11 rounded-2xl overflow-hidden flex-shrink-0 border border-border/50 bg-secondary/50 flex items-center justify-center shadow-inner"
            >
              <span className="text-lg">🍔</span>
              {item.quantity > 1 && (
                <div className="absolute -top-1 -end-1 size-5 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-background">
                  {item.quantity}
                </div>
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={onCheckout} 
          className="group w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-3xl p-4.5 flex items-center justify-between active:scale-[0.97] transition-all duration-300 shadow-2xl shadow-primary/30"
        >
          <div className="flex items-center gap-4">
            <div className="relative size-11 bg-white/20 rounded-2xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1.5 -end-1.5 size-5 bg-foreground text-background text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-primary">
                {itemCount}
              </span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-black uppercase tracking-widest opacity-80 leading-none mb-1">{t("menu.viewOrder")}</span>
              <span className="text-xs font-bold opacity-60">اضغط للمتابعة</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black">{total.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} <span className="text-xs opacity-80">{lang === "ar" ? "د.ج" : "DA"}</span></span>
            <div className="size-10 rounded-2xl bg-white/10 flex items-center justify-center group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
              <ChevronRight className="w-5 h-5 rtl:scale-x-[-1]" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
