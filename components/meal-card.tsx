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
  onSizeChange: (s: string) => void;
  onSauceChange: (id: number | null) => void;
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
    <div className="premium-bezel group transition-transform duration-700 hover:scale-[1.01]" style={{ transitionTimingFunction: 'var(--ease-premium)' }}>
      <div className="premium-bezel-inner overflow-hidden">
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
              <ShoppingBag className="size-10 text-muted-foreground/20" strokeWidth={1.5} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

          {product.est_speciale && (
            <div className="absolute top-3 start-3">
              <div className="flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1 backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-white" />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white">{t("menu.featured")}</span>
              </div>
            </div>
          )}

          <div className="absolute bottom-3 start-3 end-3 flex items-end justify-between">
            <div className="rounded-2xl border border-white/20 bg-white/90 px-3 py-2 backdrop-blur-sm dark:bg-neutral-900/85 dark:border-white/10">
              <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-widest text-muted-foreground">{lang === "ar" ? "السعر" : "Price"}</span>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {price.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
                <span className="ms-1 text-[10px] font-medium text-muted-foreground">{lang === "ar" ? "د.ج" : "DA"}</span>
              </span>
            </div>
          </div>

          {!product.is_available && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/55 backdrop-blur-[2px]">
              <span className="rounded-full bg-destructive px-4 py-2 text-xs font-semibold uppercase tracking-wider text-destructive-foreground">
                {lang === "ar" ? "نفد" : "Sold out"}
              </span>
            </div>
          )}
        </div>

        <div className="p-5">
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
                <button key={s} onClick={() => onSizeChange(s)}
                  className={`rounded-full px-3.5 py-1.5 text-[10px] font-semibold transition-all duration-500 ${
                    size === s
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-sm)]"
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
                <button key={s.id} onClick={() => onSauceChange(s.id)}
                  className={`rounded-full px-3 py-1.5 text-[9px] font-medium transition-all duration-500 ${
                    sauceId === s.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-border/40 pt-4">
            {quantity === 0 ? (
              <button
                onClick={onAdd}
                disabled={!product.is_available}
                aria-label={t("menu.add")}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-md),var(--shadow-glow)] transition-all duration-500 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              >
                <Plus className="size-4" strokeWidth={2} />
                {t("menu.add")}
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-full border border-border/40 bg-secondary/40 p-1.5">
                <button
                  onClick={() => onUpdateQuantity(-1)}
                  className="grid size-10 place-items-center rounded-full bg-background shadow-[var(--shadow-sm)] transition-transform active:scale-90"
                >
                  <Minus className="size-4 text-foreground" strokeWidth={2} />
                </button>
                <span className="min-w-[24px] text-center text-lg font-semibold tabular-nums text-primary">
                  {quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(1)}
                  className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-sm)] transition-transform active:scale-90"
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
