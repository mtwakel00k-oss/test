"use client"

import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Search, Plus, Minus, Trash2, ChevronDown } from "lucide-react"
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

function ProductCard({ product, curSize, curSauce, count, price, sizes, showSauces, sauces, SIZE_LABEL, onSizeChange, onSauceChange, onAddItem, onUpdateQuantity }: {
  product: MenuProduct; curSize: string; curSauce: number | null; count: number; price: number
  sizes: string[]; showSauces: boolean; sauces: { tomato: boolean; cream: boolean }
  SIZE_LABEL: Record<string, string>
  onSizeChange: (id: number, size: string) => void
  onSauceChange: (id: number, sauce: number | null) => void
  onAddItem: (item: NewOrderItem) => void
  onUpdateQuantity: (productId: number, delta: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div data-testid="product-card" className="group relative bg-card rounded-[2rem] border border-border/50 overflow-hidden shadow-sm hover:shadow-2xl hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
      <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center overflow-hidden relative shrink-0">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} width={200} height={150}
            loading="lazy"
            className="w-full h-full object-cover transition duration-700 group-hover:scale-110" />
        ) : (
          <svg className="size-10 opacity-20 grayscale group-hover:grayscale-0 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 2C6.48 2 2 6.48 2 12h20C22 6.48 17.52 2 12 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M8 8h.01M12 12h.01M16 10h.01" />
          </svg>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1 space-y-3">
          <h3 className="text-sm font-black text-foreground leading-tight line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
          <div className="flex flex-col gap-2">
            {sizes.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {sizes.map((s) => (
                  <button key={s} onClick={() => onSizeChange(product.id, s)}
                    className={cn("text-[9px] px-2.5 py-1 rounded-xl font-black uppercase tracking-widest transition-all border",
                      curSize === s
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                        : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground")}>
                    {SIZE_LABEL[s] || s}
                  </button>
                ))}
              </div>
            )}
            {showSauces && (
              <div className="flex gap-1.5">
                {sauces.tomato && (
                  <button onClick={() => onSauceChange(product.id, 1)}
                    className={cn("text-[9px] px-2.5 py-1 rounded-xl font-black uppercase tracking-widest transition-all border",
                      curSauce === 1 ? "bg-malachite text-evergreen border-malachite shadow-lg shadow-malachite/20" : "bg-muted/50 text-muted-foreground border-border/50 hover:border-malachite/50 hover:text-malachite")}>
                    {t("pos.redSauce")}
                  </button>
                )}
                {sauces.cream && (
                  <button onClick={() => onSauceChange(product.id, 2)}
                    className={cn("text-[9px] px-2.5 py-1 rounded-xl font-black uppercase tracking-widest transition-all border",
                      curSauce === 2 ? "bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/20" : "bg-muted/50 text-muted-foreground border-border/50 hover:border-amber-300 hover:text-amber-700")}>
                    {t("pos.whiteSauce")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex flex-col">
            <span className="text-sm font-black text-foreground tabular-nums leading-none">{price.toLocaleString()}</span>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t("pos.currency")}</span>
          </div>
          {count > 0 ? (
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-2xl border border-border/50">
              <button onClick={() => onUpdateQuantity(product.id, -1)}
                className="flex items-center justify-center size-8 rounded-xl bg-background text-foreground hover:bg-destructive hover:text-destructive-foreground transition-all active:scale-90 shadow-sm">
                {count === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
              </button>
              <span className="w-6 text-center text-sm font-black text-foreground tabular-nums">{count}</span>
              <button onClick={() => onUpdateQuantity(product.id, 1)}
                className="flex items-center justify-center size-8 rounded-xl bg-primary text-primary-foreground hover:scale-105 transition-all active:scale-90 shadow-lg shadow-primary/20">
                <Plus className="size-3.5" />
              </button>
            </div>
          ) : (
            <button data-testid="add-to-order" onClick={() => onAddItem({ product, size: curSize, sauceId: curSauce, quantity: 1 })}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-2xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 shadow-sm">
              <Plus className="size-3.5" /> {t("pos.add")}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function useBreakpoint(cols: Record<string, number>): number {
  const [colsCount, setColsCount] = useState(2)
  useEffect(() => {
    const mqls = Object.entries(cols).map(([bp, c]) => {
      const mql = window.matchMedia(`(min-width: ${bp}px)`)
      const handler = () => { if (mql.matches) setColsCount(c) }
      mql.addEventListener("change", handler)
      handler()
      return { mql, handler }
    })
    return () => mqls.forEach(({ mql, handler }) => mql.removeEventListener("change", handler))
  }, [cols])
  return colsCount
}

const ROW_HEIGHT = 340

export function ProductGrid({ products, orderItems, onAddItem, onUpdateQuantity }: ProductGridProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sizeMap, setSizeMap] = useState<Record<number, string>>({})
  const [sauceMap, setSauceMap] = useState<Record<number, number | null>>({})

  const cols = useBreakpoint({ 1024: 3, 1280: 4 })
  const parentRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [products, selectedCategory, search])

  const rowCount = Math.ceil(filtered.length / Math.max(cols, 1))

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 2,
  })

  const qty = (id: number) => orderItems.find((i) => i.product.id === id)?.quantity || 0

  const handleSizeChange = useCallback((id: number, s: string) => setSizeMap((p) => ({ ...p, [id]: s })), [])
  const handleSauceChange = useCallback((id: number, s: number | null) => setSauceMap((p) => ({ ...p, [id]: s })), [])

  return (
    <div className="flex flex-1 min-h-0 bg-muted/5">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="w-56 shrink-0 border-l border-border/50 bg-background/50 backdrop-blur-xl p-4 overflow-y-auto hidden lg:flex flex-col gap-2">
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pos.search")}
            className="w-full h-10 bg-muted/50 border-border/50 rounded-xl pr-10 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
        </div>
        <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{t("pos.categories")}</p>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={cn("w-full text-right px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-tight transition-all duration-300",
              selectedCategory === cat
                ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-[1.02]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            {cat}
          </button>
        ))}
      </aside>

      <div ref={parentRef} className="flex-1 overflow-y-auto p-3" style={{ contain: "strict" }}>
        {/* Mobile search + categories — visible below lg */}
        <div className="lg:hidden space-y-2 mb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("pos.search")}
              className="w-full h-10 bg-muted/50 border-border/50 rounded-xl pr-10 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={cn("whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all shrink-0",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-muted/40 text-muted-foreground border border-border/50 hover:text-foreground")}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const rowIndex = virtualRow.index
            const startIdx = rowIndex * cols
            const rowProducts = filtered.slice(startIdx, startIdx + cols)
            return (
              <div
                key={rowIndex}
                style={{
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  width: "100%",
                }}
              >
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {rowProducts.map((product) => {
                    const sizes = getAvailableSizes(product)
                    const curSize = sizeMap[product.id] || sizes[0] || "UNIQUE"
                    const defaultSauce = getDefaultSauce(product)
                    const curSauce = sauceMap[product.id] ?? defaultSauce
                    const sauces = getProductSauces(product)
                    const showSauces = sauces.tomato || sauces.cream
                    const price = getPrice(product, curSize, curSauce)
                    const count = qty(product.id)
                    return (
                      <ProductCard
                        key={product.id}
                        product={product} curSize={curSize} curSauce={curSauce}
                        count={count} price={price} sizes={sizes}
                        showSauces={showSauces} sauces={sauces} SIZE_LABEL={SIZE_LABEL}
                        onSizeChange={handleSizeChange}
                        onSauceChange={handleSauceChange}
                        onAddItem={onAddItem} onUpdateQuantity={onUpdateQuantity}
                      />
                    )
                  })}
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
