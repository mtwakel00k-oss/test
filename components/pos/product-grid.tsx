"use client"

import { useState, useMemo } from "react"
import { Search, Plus } from "lucide-react"
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

export function ProductGrid({ products, orderItems, onAddItem, onUpdateQuantity, onClose }: ProductGridProps) {
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
      <aside className="w-48 shrink-0 border-l border-border bg-card p-3 overflow-y-auto hidden lg:flex flex-col gap-1">
        <div className="relative mb-2">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pos.search")}
            className="w-full rounded-lg bg-secondary pr-8 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={cn("w-full text-right px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              selectedCategory === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
            {cat}
          </button>
        ))}
      </aside>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
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
              <div key={product.id} className="group relative bg-card rounded-xl border border-border/60 overflow-hidden hover:shadow-sm hover:border-primary/20 transition-all">
                <div className="aspect-[4/3] bg-muted/40 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <Image src={product.image_url} alt={product.name} width={200} height={150} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <span className="text-3xl opacity-25">🍕</span>
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
                              ? "bg-primary text-primary-foreground border-primary"
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
                          className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-all border flex items-center gap-1",
                            curSauce === 1 ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-background text-muted-foreground border-border/60 hover:border-red-300 hover:text-red-600")}>
                          <span className="w-1 h-1 rounded-full bg-current" /> {t("pos.redSauce")}
                        </button>
                      )}
                      {sauces.cream && (
                        <button onClick={() => setSauceMap((p) => ({ ...p, [product.id]: 2 }))}
                          className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-all border flex items-center gap-1",
                            curSauce === 2 ? "bg-amber-100 text-amber-800 border-amber-200 shadow-sm" : "bg-background text-muted-foreground border-border/60 hover:border-amber-300 hover:text-amber-700")}>
                          <span className="w-1 h-1 rounded-full bg-current" /> {t("pos.whiteSauce")}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/30">
                    <span className="text-xs font-bold text-foreground tabular-nums">{price.toLocaleString()} {t("pos.currency")}</span>
                    {count > 0 ? (
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => onUpdateQuantity(product.id, -1)}
                          className="w-6 h-6 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-medium hover:bg-destructive/10 hover:text-destructive transition-colors">
                          {count === 1 ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5.143 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> : "−"}
                        </button>
                        <span className="text-xs font-bold text-foreground w-5 text-center tabular-nums">{count}</span>
                        <button onClick={() => onUpdateQuantity(product.id, 1)}
                          className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium hover:bg-primary/90 transition-colors">
                          +
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => onAddItem({ product, size: curSize, sauceId: curSauce, quantity: 1 })}
                        className="h-6 px-2 rounded-md bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-0.5">
                        <Plus className="w-2.5 h-2.5" /> {t("pos.add")}
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
