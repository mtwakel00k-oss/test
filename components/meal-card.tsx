"use client";

import { useState, memo } from "react"
import Image from "next/image"
import { Plus, Minus, ShoppingBag, ChefHat } from "lucide-react";
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
    <div className="group relative h-full flex flex-col overflow-hidden rounded-2xl border border-border/20 bg-card shadow-sm transition-all duration-700 hover:shadow-lg hover:border-primary/20"
      style={{ transitionTimingFunction: 'var(--ease-premium)' }}>
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/[0.04] to-primary/[0.08]">
        {showImg ? (
          <>
            <Image src={product.image_url!} alt={product.name}
              fill
              loading="lazy"
              priority={priority}
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover transition-all duration-700 group-hover:scale-105"
              style={{ transitionTimingFunction: 'var(--ease-premium)' }}
              onError={() => setImgFailed(true)} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <ChefHat className="size-8 text-muted-foreground/15" strokeWidth={1} />
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/15">{lang === "ar" ? "صورة" : "Image"}</span>
            </div>
          </div>
        )}

        {product.est_speciale && (
          <div className="absolute top-3 start-3 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground shadow-md backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-white/60" />
              {t("menu.featured")}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 end-3 z-10">
          <div className="rounded-xl bg-accent px-3.5 py-2 shadow-lg">
            <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-[0.15em] text-accent-foreground/60">{lang === "ar" ? "السعر" : "Price"}</span>
            <span className="text-lg font-bold tabular-nums text-accent-foreground">
              {price.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
              <span className="ms-1 text-[10px] font-medium text-accent-foreground/50">{lang === "ar" ? "د.ج" : "DA"}</span>
            </span>
          </div>
        </div>

        {!product.is_available && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-[3px]">
            <span className="rounded-full bg-destructive/90 px-5 py-2 text-xs font-bold uppercase tracking-widest text-destructive-foreground shadow-lg">
              {lang === "ar" ? "نفد" : "Sold out"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1">
          <h3 className="line-clamp-1 font-display text-lg font-semibold leading-snug text-foreground transition-colors duration-300 group-hover:text-primary">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground/60">
              {product.description}
            </p>
          )}

          {avSizes.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {avSizes.map(s => (
                <button key={s} onClick={() => onSizeChange(product.id, s)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-500 ${
                    size === s
                      ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20"
                      : "bg-secondary/40 text-muted-foreground/60 hover:bg-secondary hover:text-foreground border border-border/20"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {showSauce && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SAUCES.map(s => (
                <button key={s.id} onClick={() => onSauceChange(product.id, s.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-500 ${
                    sauceId === s.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/40 text-muted-foreground/60 hover:bg-secondary hover:text-foreground border border-border/20"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-border/20">
          {quantity === 0 ? (
            <button
              onClick={onAdd}
              disabled={!product.is_available}
              aria-label={t("menu.add")}
              className="group/btn inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-primary/20 bg-primary/[0.04] px-5 py-3 text-sm font-semibold text-primary transition-all duration-500 hover:bg-primary hover:text-primary-foreground hover:shadow-md disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]"
            >
              <Plus className="size-4 transition-transform duration-300 group-hover/btn:rotate-90" strokeWidth={2} />
              {t("menu.add")}
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-full bg-secondary/30 p-1.5">
              <button
                onClick={() => onUpdateQuantity(-1)}
                className="grid size-10 place-items-center rounded-full bg-card text-foreground shadow-sm transition-all duration-300 active:scale-90 hover:bg-muted"
              >
                <Minus className="size-4" strokeWidth={2} />
              </button>
              <span className="min-w-[2.5rem] text-center font-display text-xl font-bold tabular-nums text-primary">
                {quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(1)}
                className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-all duration-300 active:scale-90 hover:brightness-110"
              >
                <Plus className="size-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
