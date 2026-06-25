"use client"

import { useState, useEffect } from "react"
import { Layers, Loader2 } from "lucide-react"
import { fetchApi } from "@/lib/tenant"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ProductItem {
  id: number
  name: string
  category: string
  is_available: boolean
}

type BulkAction = "set_availability" | "set_price" | "set_category"

const LANG = {
  title: { ar: "عمليات جماعية", en: "Bulk Operations", fr: "Opérations groupées" },
  selectProducts: { ar: "اختر المنتجات", en: "Select Products", fr: "Sélectionner les produits" },
  selected: { ar: "محدد", en: "selected", fr: "sélectionnés" },
  action: { ar: "الإجراء", en: "Action", fr: "Action" },
  setAvailability: { ar: "تعيين التوفر", en: "Set Availability", fr: "Définir la disponibilité" },
  setPrice: { ar: "تعيين السعر", en: "Set Price", fr: "Définir le prix" },
  setCategory: { ar: "تعيين الفئة", en: "Set Category", fr: "Définir la catégorie" },
  available: { ar: "متاح", en: "Available", fr: "Disponible" },
  unavailable: { ar: "غير متاح", en: "Unavailable", fr: "Indisponible" },
  apply: { ar: "تطبيق", en: "Apply", fr: "Appliquer" },
  applying: { ar: "جارٍ التطبيق...", en: "Applying...", fr: "Application..." },
  success: { ar: "تم التحديث بنجاح", en: "Updated successfully", fr: "Mis à jour avec succès" },
  noProducts: { ar: "لا توجد منتجات", en: "No products", fr: "Aucun produit" },
  close: { ar: "إغلاق", en: "Close", fr: "Fermer" },
  sizeCode: { ar: "رمز الحجم", en: "Size Code", fr: "Code taille" },
  price: { ar: "السعر", en: "Price", fr: "Prix" },
  all: { ar: "الكل", en: "All", fr: "Tous" },
}

interface BulkOperationsProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

async function loadProducts(): Promise<ProductItem[]> {
  try {
    const res = await fetchApi("/api/products")
    if (!res.ok) return []
    const data = await res.json()
    return (data || []).map((p: Record<string, unknown>) => ({
      id: p.id as number,
      name: (p.name as string) || "",
      category: (p.category as string) || "",
      is_available: p.is_available !== false,
    }))
  } catch {
    return []
  }
}

async function loadCategories(): Promise<{ id: number; nom: string }[]> {
  try {
    const res = await fetchApi("/api/categories")
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

function t(key: keyof typeof LANG, lang: string): string {
  const entry = LANG[key]
  if (lang === "ar") return entry.ar
  if (lang === "fr") return entry.fr
  return entry.en
}

export function BulkOperations({ open, onClose, onComplete }: BulkOperationsProps) {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<{ id: number; nom: string }[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [action, setAction] = useState<BulkAction>("set_availability")
  const [isAvailable, setIsAvailable] = useState(true)
  const [sizeCode, setSizeCode] = useState("M")
  const [price, setPrice] = useState("")
  const [categorieId, setCategorieId] = useState<number | "">("")
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<{ success: boolean; affected: number; errors: string[] } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setResult(null)
      setSelectedIds(new Set())
      setApplying(false)
    })
    loadProducts().then(setProducts)
    loadCategories().then(setCategories)
  }, [open])

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  })

  const toggleAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)))
    }
  }

  const toggle = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleApply = async () => {
    if (selectedIds.size === 0) return
    setApplying(true)
    setResult(null)
    try {
      const payload: Record<string, unknown> = {
        product_ids: [...selectedIds],
        action,
      }
      if (action === "set_availability") payload.is_available = isAvailable
      else if (action === "set_price") {
        payload.size_code = sizeCode
        payload.price = Number(price)
        if (!price || isNaN(Number(price))) {
          setResult({ success: false, affected: 0, errors: ["Invalid price"] })
          setApplying(false)
          return
        }
      } else if (action === "set_category") {
        payload.categorie_id = categorieId || null
      }

      const res = await fetchApi("/api/admin/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, affected: data.affected || 0, errors: data.errors || [] })
        onComplete()
      } else {
        setResult({ success: false, affected: 0, errors: [data.error || "Unknown error"] })
      }
    } catch (e) {
      setResult({ success: false, affected: 0, errors: [(e as Error).message] })
    }
    setApplying(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            {t("title", "en")}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            {result.success ? (
              <div className="p-4 rounded-xl bg-malachite/10 border border-malachite/20">
                <p className="text-sm font-medium text-malachite dark:text-malachite">
                  {t("success", "en")} — {result.affected} products
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive dark:text-destructive">
                  {result.errors.join(", ")}
                </p>
              </div>
            )}
            <Button onClick={() => { setResult(null); onClose() }} className="w-full">
              {t("close", "en")}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Action selector */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                {t("action", "en")}
              </label>
              <div className="flex items-center gap-1.5 bg-muted/50 p-0.5 rounded-lg border border-border/40 w-fit">
                {(["set_availability", "set_price", "set_category"] as BulkAction[]).map((a) => (
                  <button key={a} onClick={() => setAction(a)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      action === a ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground/60 hover:text-foreground/70"
                    }`}>
                    {a === "set_availability" ? t("setAvailability", "en") : a === "set_price" ? t("setPrice", "en") : t("setCategory", "en")}
                  </button>
                ))}
              </div>
            </div>

            {/* Action-specific inputs */}
            {action === "set_availability" && (
              <div className="flex items-center gap-1.5 bg-muted/50 p-0.5 rounded-lg border border-border/40 w-fit">
                <button onClick={() => setIsAvailable(true)}
                   className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isAvailable ? "bg-malachite/20 text-malachite dark:text-malachite shadow-sm" : "text-muted-foreground/60 hover:text-foreground/70"}`}>
                  {t("available", "en")}
                </button>
                <button onClick={() => setIsAvailable(false)}
                   className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!isAvailable ? "bg-destructive/20 text-destructive dark:text-destructive shadow-sm" : "text-muted-foreground/60 hover:text-foreground/70"}`}>
                  {t("unavailable", "en")}
                </button>
              </div>
            )}

            {action === "set_price" && (
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {t("sizeCode", "en")}
                  </label>
                  <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/40">
                    {["S", "M", "L", "XL"].map((code) => (
                      <button key={code} onClick={() => setSizeCode(code)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${sizeCode === code ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground/60 hover:text-foreground/70"}`}>
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {t("price", "en")} (DA)
                  </label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                    className="w-24 h-9 rounded-lg bg-muted/50 border border-input text-foreground text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="0" min="0" step="10" />
                </div>
              </div>
            )}

            {action === "set_category" && (
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                  {t("setCategory", "en")}
                </label>
                <select value={categorieId} onChange={(e) => setCategorieId(e.target.value ? Number(e.target.value) : "")}
                  className="h-9 rounded-lg bg-muted/50 border border-input text-foreground/80 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">{t("all", "en")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Product search + select all */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t("selectProducts", "en")} ({selectedIds.size} {t("selected", "en")})
                </label>
                <button onClick={toggleAll} className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors">
                  {selectedIds.size === filteredProducts.length ? t("close", "en") : t("all", "en")}
                </button>
              </div>
              <input type="text"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full h-9 rounded-lg bg-muted/50 border border-input text-foreground text-sm px-3 mb-2 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            {/* Product list */}
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border/40 rounded-xl p-1">
              {filteredProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t("noProducts", "en")}</p>
              ) : (
                filteredProducts.map((p) => (
                  <label key={p.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedIds.has(p.id) ? "bg-primary/10 text-foreground" : "bg-transparent text-muted-foreground hover:bg-muted/50"
                    }`}>
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggle(p.id)}
                      className="w-4 h-4 rounded border-border accent-primary" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground">{p.category}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      p.is_available ? "bg-malachite/10 text-malachite dark:text-malachite" : "bg-destructive/10 text-destructive dark:text-destructive"
                    }`}>
                      {p.is_available ? "ON" : "OFF"}
                    </span>
                  </label>
                ))
              )}
            </div>

            {/* Apply button */}
            <Button onClick={handleApply} disabled={selectedIds.size === 0 || applying} className="w-full">
              {applying && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {applying ? t("applying", "en") : `${t("apply", "en")} (${selectedIds.size})`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
