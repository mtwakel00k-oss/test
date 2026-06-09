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

  const pastelBgs = ["bg-pink-50", "bg-orange-50", "bg-green-50", "bg-yellow-50"]
  const pastelBg = pastelBgs[product.id % 4]

  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300 group">
      <div className={`relative aspect-[4/3] overflow-hidden ${pastelBg}`}>
        {showImg ? (
          <Image
            src={product.image_url!}
            alt={product.name}
            width={400} height={300}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl">🍔</span>
          </div>
        )}
        {product.est_speciale && (
          <div className="absolute top-2 start-2 bg-primary/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <span className="text-[10px] font-bold text-primary-foreground">{t("menu.featured")}</span>
          </div>
        )}
        <div className="absolute bottom-2 end-2 bg-accent/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
          <span className="text-[9px] font-black text-accent-foreground">10%OFF</span>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-bold text-card-foreground text-sm leading-tight line-clamp-1 mb-0.5">
          {product.name}
        </h3>

        {showSauce && (
          <div className="flex gap-1 mb-1.5">
            {SAUCES.map(s => (
              <button key={s.id} onClick={() => onSauceChange(s.id)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-all ${
                  sauceId === s.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {avSizes.length > 0 && (
          <div className="flex gap-1 mb-2">
            {avSizes.map(s => (
              <button key={s} onClick={() => onSizeChange(s)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-all ${
                  size === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                }`}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-1">
          <span className="text-sm font-bold text-card-foreground">
            {(getPrice(product, size, sauceId) || 0).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
            <span className="text-xs font-semibold text-muted-foreground ms-0.5">{lang === "ar" ? "د.ج" : "DA"}</span>
          </span>

          {quantity === 0 ? (
            <button
              onClick={onAdd}
              aria-label={t("menu.add")}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-secondary rounded-full px-1.5 py-1">
              <button
                onClick={() => onUpdateQuantity(-1)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-background shadow-xs hover:bg-muted transition-colors"
              >
                <Minus className="w-3 h-3 text-muted-foreground" />
              </button>
              <span className="w-4 text-center font-bold text-foreground text-xs">{quantity}</span>
              <button
                onClick={() => onUpdateQuantity(1)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-xs"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
