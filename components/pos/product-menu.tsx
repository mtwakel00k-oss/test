"use client"

import Image from "next/image"
import { getAvailableSizes } from "@/lib/types"
import type { MenuProduct } from "@/lib/types"
import { useTranslation } from "@/lib/use-translation"

interface NewOrderItem {
  product: MenuProduct
  size: string
  sauceId: number | null
  quantity: number
}

interface ProductMenuProps {
  products: MenuProduct[]
  orderItems: NewOrderItem[]
  onAddItem: (product: MenuProduct, size: string, sauceId: number | null) => void
  onUpdateQuantity: (productId: number, delta: number) => void
}

export function ProductMenu({ products, orderItems, onAddItem, onUpdateQuantity }: ProductMenuProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t("pos.categories")}</p>
      {[...new Set(products.map(p => p.category))].map(cat => (
        <div key={cat}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{cat}</p>
          {products.filter(p => p.category === cat).map(p => {
            const sizes = getAvailableSizes(p)
            const defaultSize = sizes[0] || "UNIQUE"
            const existing = orderItems.find(i => i.product.id === p.id)
            return (
              <div key={p.id} className="flex items-center justify-between py-1.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {p.image_url ? (
                    <Image src={p.image_url} alt="" width={28} height={28} loading="lazy" className="rounded object-cover flex-shrink-0" />
                  ) : (
                    <span className="h-7 w-7 rounded flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </span>
                  )}
                  <span className="text-sm text-foreground truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {existing ? (
                    <>
                      <button onClick={() => onUpdateQuantity(p.id, -1)}
                        className="h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 flex items-center justify-center text-sm font-medium">−</button>
                      <span className="text-sm font-semibold w-5 text-center">{existing.quantity}</span>
                      <button onClick={() => onUpdateQuantity(p.id, 1)}
                        className="h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 flex items-center justify-center text-sm font-medium">+</button>
                    </>
                  ) : (
                    <button onClick={() => onAddItem(p, defaultSize, p.has_white_sauce ? 2 : null)}
                      className="h-7 w-7 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center text-sm font-medium transition-colors">+</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
