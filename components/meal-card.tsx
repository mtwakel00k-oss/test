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
    <div className="bg-card rounded-[2rem] overflow-hidden border border-border/40 hover:border-emerald-500/20 transition-all duration-500 group hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
        {showImg ? (
          <Image src={product.image_url!} alt={product.name}
            fill
            loading="lazy"
            priority={priority}
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            onError={() => setImgFailed(true)} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {product.est_speciale && (
          <div className="absolute top-3 start-3">
            <div className="flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-lg ring-1 ring-white/20">
              <span className="size-1.5 rounded-full bg-white" />
              <span className="text-[9px] font-black text-white uppercase tracking-wider">{t("menu.featured")}</span>
            </div>
          </div>
        )}

            <div className="absolute bottom-3 start-3 end-3 flex items-end justify-between">
            <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20 dark:bg-neutral-800 dark:border-neutral-700/50">
              <span className="text-[9px] font-bold text-foreground uppercase tracking-widest leading-none mb-0.5 block dark:text-neutral-400">{lang === "ar" ? "السعر" : "PRICE"}</span>
              <span className="text-foreground font-black text-lg tabular-nums dark:text-white">
                {price.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
                <span className="text-[10px] font-bold text-muted-foreground ms-1 dark:text-neutral-400">{lang === "ar" ? "د.ج" : "DA"}</span>
              </span>
            </div>
        </div>

        {!product.is_available && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-destructive text-destructive-foreground px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
              {lang === "ar" ? "نفد" : "SOLD OUT"}
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-black text-foreground text-base leading-tight line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-muted-foreground text-xs mt-2 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {avSizes.length > 0 && (
          <div className="flex items-center gap-1.5 mt-4">
            {avSizes.map(s => (
              <button key={s} onClick={() => onSizeChange(s)}
                className={`rounded-xl px-3.5 py-1.5 text-[10px] font-black transition-all ${
                  size === s
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}>
                {s}
              </button>
            ))}
          </div>
        )}

        {showSauce && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {SAUCES.map(s => (
              <button key={s.id} onClick={() => onSauceChange(s.id)}
                className={`rounded-xl px-3 py-1.5 text-[9px] font-bold transition-all ${
                  sauceId === s.id
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-border/40">
          {quantity === 0 ? (
            <button
              onClick={onAdd}
              disabled={!product.is_available}
              aria-label={t("menu.add")}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 active:scale-[0.97] transition-all duration-200 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:grayscale disabled:active:scale-100 font-black text-sm uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              {t("menu.add")}
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 bg-secondary/50 rounded-2xl p-1.5 border border-border/40">
              <button
                onClick={() => onUpdateQuantity(-1)}
                className="size-10 flex items-center justify-center rounded-xl bg-background hover:bg-muted transition-all active:scale-90 shadow-sm"
              >
                <Minus className="w-4 h-4 text-foreground" />
              </button>
              <span className="min-w-[24px] text-center font-black text-emerald-600 dark:text-emerald-400 text-lg tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(1)}
                className="size-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all active:scale-90 shadow-lg shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
