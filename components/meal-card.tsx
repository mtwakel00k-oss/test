"use client";

import { useState, memo } from "react"
import Image from "next/image"
import { Plus, Minus } from "lucide-react";
import type { MenuProduct } from "@/lib/types";
import { getPrice, getAvailableSizes } from "@/lib/types";
import { SAUCES } from "@/lib/constants";
import { useTranslation } from "@/lib/use-translation";

interface MealCardProps {
  product: MenuProduct;
  size: string;
  sauceId: number | null;
  quantity: number;
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

  return (
    <div className="bg-card rounded-3xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all duration-500 group shadow-sm hover:shadow-xl">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted/50">
        {showImg ? (
          <Image src={product.image_url!} alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            onError={() => setImgFailed(true)} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl opacity-50">🍔</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {product.est_speciale && (
          <div className="absolute top-3 start-3 flex items-center gap-1.5 bg-primary/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg ring-1 ring-white/20">
            <span className="size-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-black text-primary-foreground uppercase tracking-wider">{t("menu.featured")}</span>
          </div>
        )}
        
        {!product.is_available && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-destructive text-destructive-foreground px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
              نفد
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-black text-foreground text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-muted-foreground text-xs mt-1.5 line-clamp-2 leading-relaxed font-medium">
            {product.description}
          </p>
        )}

        {showSauce && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {SAUCES.map(s => (
              <button key={s.id} onClick={() => onSauceChange(s.id)}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-bold transition-all ${
                  sauceId === s.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {avSizes.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {avSizes.map(s => (
              <button key={s} onClick={() => onSizeChange(s)}
                className={`rounded-xl px-4 py-1.5 text-[10px] font-black transition-all ${
                  size === s
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/50">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">السعر</span>
            <span className="text-foreground font-black text-xl">
              {(getPrice(product, size, sauceId) || 0).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} 
              <span className="text-xs font-bold text-muted-foreground ms-1">{lang === "ar" ? "د.ج" : "DA"}</span>
            </span>
          </div>

          {quantity === 0 ? (
            <button
              onClick={onAdd}
              disabled={!product.is_available}
              aria-label={t("menu.add")}
              className="flex items-center justify-center size-12 bg-primary text-primary-foreground rounded-2xl hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:grayscale disabled:scale-100"
            >
              <Plus className="w-6 h-6" />
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-1.5 border border-border/50">
              <button
                onClick={() => onUpdateQuantity(-1)}
                className="size-9 flex items-center justify-center rounded-xl bg-background hover:bg-muted transition-all active:scale-90 shadow-sm"
              >
                <Minus className="w-4 h-4 text-foreground" />
              </button>
              <span className="min-w-[20px] text-center font-black text-primary text-base">
                {quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(1)}
                className="size-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-90 shadow-lg shadow-primary/20"
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
