"use client"

import { useState, useMemo } from "react"
import { Search, Plus, Minus, Trash2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { MenuProduct } from "@/lib/types"
import { getPrice, getAvailableSizes } from "@/lib/types"
import { useTranslation } from "@/lib/use-translation"

interface NewOrderItem {
  product: MenuProduct
  size: string
  sauceId: number | null
  quantity: number
}

interface ProductGridProps {
  products: MenuProduct[]
  orderItems: NewOrderItem[]
  onAddItem: (item: NewOrderItem) => void
  onUpdateQuantity: (productId: number, delta: number) => void
  onClose?: () => void
}

function getProductSauces(product: MenuProduct): { tomato: boolean; cream: boolean } {
  let tomato = false, cream = false
  for (const sp of Object.values(product.prices ?? {})) {
    if (sp.sauce_tomate != null) tomato = true
    if (sp.creme_fraiche != null) cream = true
  }
  if (product.has_white_sauce) cream = true
  return { tomato, cream }
}

function getDefaultSauce(product: MenuProduct): number | null {
  const s = getProductSauces(product)
  if (s.cream) return 2
  if (s.tomato) return 1
  return null
}

const SIZE_LABEL: Record<string, string> = {
  S: "صغير", M: "وسط", L: "كبير", XL: "كبير جداً", XXL: "خارق",
}

export function ProductGrid({ products, orderItems, onAddItem, onUpdateQuantity }: ProductGridProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sizeMap, setSizeMap] = useState<Record<number, string>>({})
  const [sauceMap, setSauceMap] = useState<Record<number, number | null>>({})

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [products, selectedCategory, search])

  const qty = (id: number) => orderItems.find((i) => i.product.id === id)?.quantity || 0

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="w-44 shrink-0 border-l border-border bg-muted/30 p-3 overflow-y-auto hidden lg:flex flex-col gap-1">
        <div className="relative mb-2">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pos.search")}
            className="input-base text-xs py-1.5 pr-8" />
        </div>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={cn("w-full text-right px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              selectedCategory === cat
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-background hover:text-foreground")}>
            {cat}
          </button>
        ))}
      </aside>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((product) => {
            const sizes = getAvailableSizes(product)
            const curSize = sizeMap[product.id] || sizes[0] || "UNIQUE"
            const defaultSauce = getDefaultSauce(product)
            const curSauce = sauceMap[product.id] ?? defaultSauce
            const sauces = getProductSauces(product)
            const showSauces = sauces.tomato || sauces.cream
            const price = getPrice(product, curSize, curSauce)
            const count = qty(product.id)

            return (
              <div key={product.id}
                className="group relative bg-card rounded-xl border border-border/60 overflow-hidden card-hover">
                <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <Image src={product.image_url} alt={product.name} width={200} height={150}
                      className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                  ) : (
                    <span className="text-3xl opacity-20">🍕</span>
                  )}
                </div>
                <div className="p-2.5 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{product.name}</h3>

                  {sizes.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {sizes.map((s) => (
                        <button key={s} onClick={() => setSizeMap((p) => ({ ...p, [product.id]: s }))}
                          className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-all border",
                            curSize === s
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-background text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground")}>
                          {SIZE_LABEL[s] || s}
                        </button>
                      ))}
                    </div>
                  )}

                  {showSauces && (
                    <div className="flex gap-1">
                      {sauces.tomato && (
                        <button onClick={() => setSauceMap((p) => ({ ...p, [product.id]: 1 }))}
                          className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-all border",
                            curSauce === 1 ? "bg-red-500 text-white border-red-500 shadow-xs" : "bg-background text-muted-foreground border-border/60 hover:border-red-300 hover:text-red-600")}>
                          {t("pos.redSauce")}
                        </button>
                      )}
                      {sauces.cream && (
                        <button onClick={() => setSauceMap((p) => ({ ...p, [product.id]: 2 }))}
                          className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-all border",
                            curSauce === 2 ? "bg-amber-100 text-amber-800 border-amber-200 shadow-xs" : "bg-background text-muted-foreground border-border/60 hover:border-amber-300 hover:text-amber-700")}>
                          {t("pos.whiteSauce")}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1.5 border-t border-border/30">
                    <span className="text-xs font-bold text-foreground tabular-nums">{price.toLocaleString()} {t("pos.currency")}</span>
                    {count > 0 ? (
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => onUpdateQuantity(product.id, -1)}
                          className="flex items-center justify-center w-7 h-7 rounded-lg bg-secondary text-secondary-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90">
                          {count === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-foreground tabular-nums">{count}</span>
                        <button onClick={() => onUpdateQuantity(product.id, 1)}
                          className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all active:scale-90">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => onAddItem({ product, size: curSize, sauceId: curSauce, quantity: 1 })}
                        className="inline-flex items-center h-7 px-2.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary hover:text-primary-foreground transition-all active:scale-95">
                        <Plus className="w-3 h-3" /> {t("pos.add")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">{t("pos.noProducts")}</p>
            <p className="text-xs mt-1">{t("pos.trySearch")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
