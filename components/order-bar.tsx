"use client";

import { ShoppingBag, ChevronRight, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useTranslation } from "@/lib/use-translation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

interface OrderBarProps {
  onCheckout: () => void;
}

export function OrderBar({ onCheckout }: OrderBarProps) {
  const { t, lang } = useTranslation();
  const { items, total, itemCount } = useCart();
  const [expanded, setExpanded] = useState(false);

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-8">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-background/80 backdrop-blur-2xl border border-border/40 rounded-[2rem] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
        >
          {items.length > 0 && (
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 border-b border-border/30 mb-4">
                    {items.map((item) => (
                      <div
                        key={`${item.product.id}_${item.size}_${item.sauceId}`}
                        className="relative w-16 flex-shrink-0"
                      >
                        <div className="aspect-square rounded-2xl overflow-hidden border border-border/40 bg-secondary/40">
                          {item.product.image_url ? (
                            <Image
                              src={item.product.image_url}
                              alt={item.product.name}
                              width={64}
                              height={64}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-5 h-5 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        {item.quantity > 1 && (
                          <div className="absolute -top-1.5 -end-1.5 size-5 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-background">
                            {item.quantity}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="relative size-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center flex-shrink-0 hover:bg-emerald-600/20 transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <span className="absolute -top-1.5 -end-1.5 size-5 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-background">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            </button>

            <div className="flex-1 min-w-0">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest"
              >
                {t("menu.viewOrder")}
                <ChevronRight
                  className={`w-3 h-3 transition-transform duration-200 rtl:scale-x-[-1] ${
                    expanded ? "rotate-90" : ""
                  }`}
                />
              </button>
              <div className="text-lg font-black text-foreground tabular-nums">
                {total.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
                <span className="text-xs font-bold text-muted-foreground ms-1">
                  {lang === "ar" ? "د.ج" : "DA"}
                </span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl active:scale-[0.97] transition-all duration-200 shadow-lg shadow-emerald-600/20 font-black text-sm uppercase tracking-wider"
            >
              {t("menu.confirmOrder")}
              <ChevronRight className="w-4 h-4 rtl:scale-x-[-1]" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
