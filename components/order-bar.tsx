"use client";

import { ShoppingBag, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useTranslation } from "@/lib/use-translation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

interface OrderBarProps {
  onCheckout: () => void;
  disabled?: boolean;
}

export function OrderBar({ onCheckout, disabled }: OrderBarProps) {
  const { t, lang } = useTranslation();
  const { items, total, itemCount } = useCart();
  const [expanded, setExpanded] = useState(false);

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-6 md:pb-8">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="rounded-2xl border border-border/20 bg-card/90 shadow-xl shadow-black/5 backdrop-blur-xl"
        >
          <div className="p-3">
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
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 border-b border-border/20 mb-3">
                    {items.map((item) => (
                      <div
                        key={`${item.product.id}_${item.size}_${item.sauceId}`}
                        className="relative w-16 flex-shrink-0"
                      >
                        <div className="aspect-square rounded-xl overflow-hidden border border-border/30 bg-secondary/30">
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
                              <ShoppingBag className="w-5 h-5 text-muted-foreground/20" />
                            </div>
                          )}
                        </div>
                        {item.quantity > 1 && (
                          <div className="absolute -top-1.5 -end-1.5 size-5 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-background">
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
              className="relative size-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors bg-primary/10 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ShoppingBag className="w-5 h-5 text-primary" />
              <span className="absolute -top-1.5 -end-1.5 size-5 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-background">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            </button>

            <div className="flex-1 min-w-0">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-[0.1em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
              >
                {t("menu.viewOrder")}
                <ChevronRight
                  className={`w-3 h-3 transition-transform duration-200 rtl:scale-x-[-1] ${
                    expanded ? "rotate-90" : ""
                  }`}
                />
              </button>
              <div className="font-display text-lg font-bold text-foreground tabular-nums">
                {total.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
                <span className="text-xs font-medium text-muted-foreground/60 ms-1">
                  {lang === "ar" ? "د.ج" : "DA"}
                </span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              disabled={disabled}
              className="inline-flex items-center gap-2.5 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-500 hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:grayscale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("menu.confirmOrder")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
