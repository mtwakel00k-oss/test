"use client";

import { useState } from "react"
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

export function MealCard({
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
    <div className="bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all duration-300 group">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {showImg ? (
          <Image src={product.image_url!} alt={product.name}
            width={400} height={400}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgFailed(true)} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">🍔</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
        {product.est_speciale && (
          <div className="absolute top-2 start-2 flex items-center gap-1 bg-primary/90 backdrop-blur-sm px-2 py-1 rounded-full">
            <span className="text-xs font-semibold text-primary-foreground">{t("menu.featured")}</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-1">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-muted-foreground text-xs mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {showSauce && (
          <div className="mt-2 flex gap-1">
            {SAUCES.map(s => (
              <button key={s.id} onClick={() => onSauceChange(s.id)}
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  sauceId === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {avSizes.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            {avSizes.map(s => (
              <button key={s} onClick={() => onSizeChange(s)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  size === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-primary font-bold text-lg">
            {(getPrice(product, size, sauceId) || 0).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} {lang === "ar" ? "د.ج" : "DA"}
          </span>

          {quantity === 0 ? (
            <button
              onClick={onAdd}
              aria-label={t("menu.add")}
              className="flex items-center justify-center w-9 h-9 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 active:scale-95 transition-all duration-200 shadow-lg shadow-primary/30"
            >
              <Plus className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-secondary rounded-xl p-1">
              <button
                onClick={() => onUpdateQuantity(-1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-background hover:bg-muted transition-colors"
              >
                <Minus className="w-4 h-4 text-foreground" />
              </button>
              <span className="w-5 text-center font-bold text-primary text-sm">
                {quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
