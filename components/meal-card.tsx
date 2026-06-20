"use client";

import { useState, memo } from "react"
import Image from "next/image"
import { Plus, Minus, ShoppingBag } from "lucide-react";
import type { MenuProduct } from "@/lib/types";
import { getPrice, getAvailableSizes } from "@/lib/types";
import { SAUCES } from "@/lib/constants";
import { useTranslation } from "@/lib/use-translation";

interface MealCardProps {
  product: MenuProduct;
  size: string;
  sauceId: number | null;
  quantity: number;
  priority?: boolean;
  onSizeChange: (productId: number, s: string) => void;
  onSauceChange: (productId: number, id: number | null) => void;
  onAdd: () => void;
  onUpdateQuantity: (delta: number) => void;
}

export const MealCard = memo(function MealCard({
  product,
  size,
  sauceId,
  quantity,
  priority = false,
  onSizeChange,
  onSauceChange,
  onAdd,
  onUpdateQuantity,
}: MealCardProps) {
  const { t, lang } = useTranslation();
  const avSizes = getAvailableSizes(product);
  const showSauce = product.has_white_sauce && sauceId !== null;
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = !!product.image_url && !imgFailed
  const price = getPrice(product, size, sauceId) || 0

  return (
    <div className="premium-bezel group transition-transform duration-700 hover:scale-[1.01] h-full flex flex-col" style={{ transitionTimingFunction: 'var(--ease-premium)' }}>
      <div className="premium-bezel-inner overflow-hidden flex flex-col h-full">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
          {showImg ? (
            <Image src={product.image_url!} alt={product.name}
              fill
              loading="lazy"
              priority={priority}
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              style={{ transitionTimingFunction: 'var(--ease-premium)' }}
              onError={() => setImgFailed(true)} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
              <ShoppingBag className="size-10 text-muted-foreground/20" strokeWidth={1} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

          {product.est_speciale && (
            <div className="absolute top-3 start-3">
              <span className="section-eyebrow text-primary-foreground bg-primary/90 border-primary/20">
                <span className="size-1.5 rounded-full bg-white" />
                {t("menu.featured")}
              </span>
            </div>
          )}

          <div className="absolute bottom-3 start-3 end-3 flex items-end justify-between">
            <div className="rounded-xl px-3.5 py-2 shadow-[var(--shadow-md)] bg-neutral-900 text-white font-bold dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700">
              <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-[0.15em] text-white/70">{lang === "ar" ? "السعر" : "Price"}</span>
              <span className="text-lg font-semibold tabular-nums text-white">
                {price.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
                <span className="ms-1 text-[10px] font-medium text-white/60">{lang === "ar" ? "د.ج" : "DA"}</span>
              </span>
            </div>
          </div>

          {!product.is_available && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <span className="rounded-full bg-destructive/90 px-5 py-2 text-xs font-bold uppercase tracking-widest text-destructive-foreground shadow-[var(--shadow-lg)]">
                {lang === "ar" ? "نفد" : "Sold out"}
              </span>
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col flex-1">
          <div className="flex-1">
            <h3 className="line-clamp-1 text-base font-semibold leading-tight text-foreground transition-colors duration-300 group-hover:text-primary">
              {product.name}
            </h3>
            {product.description && (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            {avSizes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {avSizes.map(s => (
                  <button key={s} onClick={() => onSizeChange(product.id, s)}
                    className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-all duration-500 ${
                      size === s
                        ? "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] ring-1 ring-primary/30"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {showSauce && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SAUCES.map(s => (
                  <button key={s.id} onClick={() => onSauceChange(product.id, s.id)}
                    className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-500 ${
                      sauceId === s.id
                        ? "bg-primary text-primary-foreground shadow-[var(--shadow-sm)]"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-border/30 pt-4">
            {quantity === 0 ? (
              <button
                onClick={onAdd}
                disabled={!product.is_available}
                aria-label={t("menu.add")}
                className="btn-premium w-full justify-center bg-primary text-primary-foreground shadow-[var(--shadow-md),var(--shadow-glow)] hover:scale-[1.02] disabled:opacity-50 disabled:grayscale"
              >
                <Plus className="size-4" strokeWidth={2} />
                {t("menu.add")}
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-full bg-secondary/50 p-1">
                <button
                  onClick={() => onUpdateQuantity(-1)}
                  className="grid size-11 place-items-center rounded-full bg-background shadow-[var(--shadow-sm)] transition-all duration-300 active:scale-90 hover:bg-muted"
                >
                  <Minus className="size-4 text-foreground" strokeWidth={2} />
                </button>
                <span className="min-w-[2rem] text-center text-xl font-semibold tabular-nums text-primary">
                  {quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(1)}
                  className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-md)] transition-all duration-300 active:scale-90 hover:brightness-110"
                >
                  <Plus className="size-4" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
