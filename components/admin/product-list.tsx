"use client"

import Image from "next/image"
import { AlertCircle, CheckCircle, Pencil, ShoppingBag, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProductItem, Lang, TranslationKey } from "./product-manager"

// ─── Types ─────────────────────────────────────────────────

export interface AlertState {
  type: "error" | "success"
  message: string
}

// ─── Alert sub-component ───────────────────────────────────

export function Alert({ alert, onDismiss }: { alert: AlertState; onDismiss: () => void }) {
  if (!alert.message) return null
  const isError = alert.type === "error"
  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 rounded-md text-sm mb-3",
        isError
          ? "bg-red-500/10 text-red-600 dark:text-red-400"
          : "bg-malachite/10 text-malachite dark:text-malachite",
      )}
    >
      {isError ? (
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      ) : (
        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      )}
      <span className="flex-1">{alert.message}</span>
      <button type="button" onClick={onDismiss} className="text-current opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────

export function intlNumber(value: number, lang: Lang): string {
  const locale = lang === "fr" ? "fr-DZ" : "en-DZ"
  try {
    return value.toLocaleString(locale)
  } catch {
    return String(value)
  }
}

export function priceRange(prices: ProductItem["prices"], lang: Lang): string {
  if (!prices) return "\u2014"
  const vals: number[] = []
  for (const _code of Object.keys(prices)) {
    const pr = prices[_code]
    const v = pr?.standard ?? pr?.sauce_tomate ?? null
    if (v != null && v > 0) vals.push(v)
  }
  vals.sort((a, b) => a - b)
  if (vals.length === 0) return "\u2014"
  const symbol = lang === "ar" ? "\u062F.\u062C" : "DA"
  if (vals.length === 1) return `${intlNumber(vals[0], lang)} ${symbol}`
  return `${intlNumber(vals[0], lang)} - ${intlNumber(vals[vals.length - 1], lang)} ${symbol}`
}

// ─── Constants ────────────────────────────────────────────

const COLUMNS: { key: string; labelKey: TranslationKey }[] = [
  { key: "product", labelKey: "column.product" },
  { key: "category", labelKey: "column.category" },
  { key: "price", labelKey: "column.price" },
  { key: "status", labelKey: "column.status" },
  { key: "actions", labelKey: "column.actions" },
]

// ─── Product Row ───────────────────────────────────────────

export function ProductRow({
  product,
  lang,
  dir,
  lbl,
  loadingId,
  onToggle,
  onEdit,
  onDelete,
}: {
  product: ProductItem
  lang: Lang
  dir: "rtl" | "ltr"
  lbl: (key: TranslationKey) => string
  loadingId: number | null
  onToggle: (id: number, current: boolean) => void
  onEdit: (product: ProductItem) => void
  onDelete: (id: number, name: string) => void
}) {
  return (
    <tr key={product.id} className="group hover:bg-primary/[0.02] transition-all duration-300">
      <td className="px-8 py-6 whitespace-nowrap">
        <div className="flex items-center gap-4" style={{ flexDirection: dir === "rtl" ? "row-reverse" : "row" }}>
          {product.image_url ? (
            <div className="size-14 rounded-2xl overflow-hidden border border-border/50 shadow-sm group-hover:scale-110 transition-transform duration-500">
              <Image src={product.image_url} alt={product.name} width={56} height={56} loading="lazy" className="size-full object-cover" unoptimized />
            </div>
          ) : (
            <div className="size-14 rounded-2xl bg-muted/50 border border-border/30 flex items-center justify-center text-muted-foreground/30">
              <ShoppingBag className="size-6" />
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span
              className={cn(
                "text-sm font-black text-foreground tracking-tight group-hover:text-primary transition-colors",
                product.is_available === false && "line-through text-muted-foreground/50",
              )}
            >
              {product.name || "\u2014"}
            </span>
            {product.description && (
              <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest truncate max-w-[150px]">
                {product.description}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-8 py-6 whitespace-nowrap">
        <span className="px-3 py-1 rounded-xl bg-muted/50 border border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          {product.category || "\u2014"}
        </span>
      </td>
      <td className="px-8 py-6 whitespace-nowrap">
        <span className="text-sm font-black text-foreground tabular-nums">
          {priceRange(product.prices, lang)}
        </span>
      </td>
      <td className="px-8 py-6 whitespace-nowrap text-center">
        <button
          onClick={() => onToggle(product.id, product.is_available ?? true)}
          disabled={loadingId === product.id}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all disabled:opacity-50 shadow-sm",
            product.is_available !== false
              ? "bg-malachite/10 text-malachite border-malachite/20 hover:bg-malachite/20"
              : "bg-muted text-muted-foreground/60 border-border/50 hover:bg-muted/80",
          )}
        >
          {loadingId === product.id ? (
            <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : product.is_available !== false ? (
            <ToggleRight className="size-4" />
          ) : (
            <ToggleLeft className="size-4" />
          )}
          {product.is_available !== false ? lbl("products.available") : lbl("products.unavailable")}
        </button>
      </td>
      <td className="px-8 py-6 whitespace-nowrap text-center font-medium">
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={() => onEdit(product)}
            className="size-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => onDelete(product.id, product.name)}
            className="size-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center justify-center"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Product List ───────────────────────────────────────────

export function ProductList({
  products,
  loadingId,
  lang,
  dir,
  lbl,
  alert,
  onDismissAlert,
  onToggle,
  onEdit,
  onDelete,
}: {
  products: ProductItem[]
  loadingId: number | null
  lang: Lang
  dir: "rtl" | "ltr"
  lbl: (key: TranslationKey) => string
  alert: AlertState
  onDismissAlert: () => void
  onToggle: (id: number, current: boolean) => void
  onEdit: (product: ProductItem) => void
  onDelete: (id: number, name: string) => void
}) {
  return (
    <>
      <Alert alert={alert} onDismiss={onDismissAlert} />
      <div className="w-full overflow-x-auto rounded-[1.5rem] border border-border/50 shadow-inner bg-muted/10">
        <table className="min-w-full divide-y divide-border/50">
          <thead className="bg-muted/30">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50",
                    (col.key === "actions" || col.key === "status") ? "text-center" : "text-start",
                  )}
                >
                  {lbl(col.labelKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 bg-transparent">
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  {lbl("products.noProducts")}
                </td>
              </tr>
            )}
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                lang={lang}
                dir={dir}
                lbl={lbl}
                loadingId={loadingId}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
