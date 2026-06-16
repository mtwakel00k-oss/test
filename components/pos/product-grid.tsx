"use client"

import { useState, useMemo } from "react"
import { Search, Plus } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { MenuProduct } from "@/lib/types"
import { getPrice, getAvailableSizes } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  let tomato = false
  let cream = false
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
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sizeMap, setSizeMap] = useState<Record<number, string>>({})
  const [sauceMap, setSauceMap] = useState<Record<number, number | null>>({})

  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category))]
  }, [products])

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
      <aside className="w-56 shrink-0 border-l border-border bg-card p-4 overflow-y-auto hidden lg:flex flex-col gap-1">
        <div className="relative mb-2">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="w-full rounded-lg bg-secondary pr-9 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            !selectedCategory
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          الكل
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </aside>

      <ScrollArea className="flex-1">
        <div className="p-3 lg:p-4">
          <div className="flex items-center justify-between mb-3">
            {onClose ? (
              <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
                <Search className="w-4 h-4 ml-1" />
                إلغاء
              </Button>
            ) : <div />}
            <Button variant="ghost" size="xs" onClick={() => { setSizeMap({}); setSauceMap({}) }}>
              إعادة تعيين
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-3">
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
                <Card key={product.id} className="overflow-hidden py-0 gap-0 shadow-none border-border/60">
                  <div className="aspect-[4/3] bg-secondary/40 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        width={200}
                        height={150}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl opacity-30">🍕</span>
                    )}
                  </div>
                  <CardContent className="p-2.5 space-y-1.5">
                    <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{product.name}</h3>

                    {sizes.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {sizes.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSizeMap((p) => ({ ...p, [product.id]: s }))}
                            className={cn(
                              "text-[11px] px-2 py-0.5 rounded-full font-medium transition-all border",
                              curSize === s
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                            )}
                          >
                            {SIZE_LABEL[s] || s}
                          </button>
                        ))}
                      </div>
                    )}

                    {showSauces && (
                      <div className="flex gap-1">
                        {sauces.tomato && (
                          <button
                            onClick={() => setSauceMap((p) => ({ ...p, [product.id]: 1 }))}
                            className={cn(
                              "text-[11px] px-2 py-0.5 rounded-full font-medium transition-all border flex items-center gap-1",
                              curSauce === 1
                                ? "bg-red-500 text-white border-red-500"
                                : "bg-background text-muted-foreground border-border hover:border-red-300 hover:text-red-600"
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                            أحمر
                          </button>
                        )}
                        {sauces.cream && (
                          <button
                            onClick={() => setSauceMap((p) => ({ ...p, [product.id]: 2 }))}
                            className={cn(
                              "text-[11px] px-2 py-0.5 rounded-full font-medium transition-all border flex items-center gap-1",
                              curSauce === 2
                                ? "bg-amber-100 text-amber-900 border-amber-200"
                                : "bg-background text-muted-foreground border-border hover:border-amber-300 hover:text-amber-700"
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                            أبيض
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-xs font-bold text-foreground">{price.toLocaleString()} د.ج</span>

                      {count > 0 ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => onUpdateQuantity(product.id, -1)}
                            className="shrink-0"
                          >
                            {count === 1 ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5.143 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            ) : (
                              "−"
                            )}
                          </Button>
                          <span className="text-sm font-bold text-foreground w-5 text-center tabular-nums">{count}</span>
                          <Button
                            variant="default"
                            size="icon-xs"
                            onClick={() => onUpdateQuantity(product.id, 1)}
                            className="shrink-0"
                          >
                            +
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAddItem({ product, size: curSize, sauceId: curSauce, quantity: 1 })}
                          className="h-7 text-xs gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          أضف
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Search className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-base font-medium">لا توجد منتجات</p>
              <p className="text-sm mt-1">جرب بحث آخر أو اختر قسم مختلف</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
