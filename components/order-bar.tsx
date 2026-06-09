"use client";

import { ShoppingBag } from "lucide-react";
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
    <div className="fixed bottom-6 inset-x-0 z-50 flex flex-col items-center gap-3 px-4">
      <div className="flex gap-2 bg-white/90 backdrop-blur-md rounded-2xl px-3 py-2 shadow-lg border border-white/60">
        {items.slice(0, 4).map((item) => (
          <div
            key={`${item.product.id}_${item.size}_${item.sauceId}`}
            className="relative w-10 h-10 rounded-xl overflow-hidden bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0"
          >
            <span className="text-lg">🍔</span>
            {item.quantity > 1 && (
              <div className="absolute -top-1 -end-1 w-4 h-4 bg-green-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {item.quantity}
              </div>
            )}
          </div>
        ))}
        {items.length > 4 && (
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <span className="text-slate-500 text-xs font-bold">+{items.length - 4}</span>
          </div>
        )}
        <div className="w-px bg-slate-200 mx-1 self-stretch" />
        <div className="flex flex-col justify-center">
          <span className="text-xs text-slate-400 leading-none">{t("menu.viewOrder")}</span>
          <span className="text-sm font-black text-slate-800">
            {total.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} {lang === "ar" ? "د.ج" : "DA"}
          </span>
        </div>
      </div>

      <button
        onClick={onCheckout}
        className="w-full max-w-xs bg-green-500 hover:bg-green-600 text-white rounded-2xl py-3.5 font-black text-base shadow-xl shadow-green-500/40 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
      >
        <ShoppingBag className="w-5 h-5" />
        {t("menu.viewOrder")}
        <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full ms-1">
          {itemCount}
        </span>
      </button>
    </div>
  );
}
