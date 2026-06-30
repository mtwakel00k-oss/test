"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { X, Upload, Plus, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert } from "./product-list"
import type { ProductItem, Category, SizeRow, Lang, TranslationKey } from "./product-manager"

// ─── Constants ────────────────────────────────────────────

const SIZE_LABELS: Record<string, { ar: string; en: string; fr: string }> = {
  NONE: { ar: "\u0628\u062F\u0648\u0646 \u062D\u062C\u0645", en: "No Size", fr: "Sans taille" },
  S: { ar: "\u0635\u063A\u064A\u0631", en: "Small", fr: "Petit" },
  M: { ar: "\u0648\u0633\u0637", en: "Medium", fr: "Moyen" },
  L: { ar: "\u0643\u0628\u064A\u0631", en: "Large", fr: "Grand" },
  XL: { ar: "\u0643\u0628\u064A\u0631 \u062C\u062F\u0627\u064B", en: "Extra Large", fr: "Tr\u00E8s grand" },
  XXL: { ar: "\u0636\u0639\u0641 \u0643\u0628\u064A\u0631", en: "Double Large", fr: "Double grand" },
}

const SIZE_OPTIONS = ["NONE", "S", "M", "L", "XL", "XXL"] as const

// ─── Product Form ───────────────────────────────────────────

export function ProductForm({
  open,
  onOpenChange,
  editProduct,
  form,
  setForm,
  categories,
  lang,
  dir,
  lbl,
  onSubmit,
  submitting,
  uploading,
  handleImageUpload,
  fileRef,
  showCatDropdown,
  setShowCatDropdown,
  selectCategory,
  addSize,
  removeSize,
  updateSize,
  catInputRef,
  catDropdownRef,
  alert,
  dismissAlert,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editProduct: ProductItem | null
  form: { nom: string; categoryName: string; description: string; image_url: string; sizes: SizeRow[] }
  setForm: React.Dispatch<React.SetStateAction<{ nom: string; categoryName: string; description: string; image_url: string; sizes: SizeRow[] }>>
  categories: Category[]
  lang: Lang
  dir: "rtl" | "ltr"
  lbl: (key: TranslationKey) => string
  onSubmit: () => void
  submitting: boolean
  uploading: boolean
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileRef: React.RefObject<HTMLInputElement | null>
  showCatDropdown: boolean
  setShowCatDropdown: React.Dispatch<React.SetStateAction<boolean>>
  selectCategory: (name: string) => void
  addSize: () => void
  removeSize: (idx: number) => void
  updateSize: (idx: number, field: keyof SizeRow, value: string) => void
  catInputRef: React.RefObject<HTMLInputElement | null>
  catDropdownRef: React.RefObject<HTMLDivElement | null>
  alert: { type: "error" | "success"; message: string }
  dismissAlert: () => void
}) {
  const filteredCategories = categories.filter((c) =>
    (c.nom || "").toLowerCase().includes((form.categoryName || "").toLowerCase()),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" dir={dir}>
        <DialogHeader>
          <DialogTitle>{editProduct ? lbl("products.editProduct") : lbl("products.createProduct")}</DialogTitle>
        </DialogHeader>
        <Alert alert={alert} onDismiss={dismissAlert} />
        <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto">
          {/* Image */}
          <div className="grid gap-2">
            <Label>{lbl("products.productImage")}</Label>
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-border flex-shrink-0">
                  <Image
                    src={form.image_url}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={() => setForm((f) => ({ ...f, image_url: "" }))}
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                    className="absolute top-0 end-0 h-5 w-5 bg-red-500 text-white rounded-bl flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground flex-shrink-0">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? lbl("products.uploading") : lbl("products.uploadImage")}
              </Button>
            </div>
          </div>

          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="nom">{lbl("products.productName")}</Label>
            <Input
              id="nom"
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              placeholder={lbl("products.productName")}
            />
          </div>

          {/* Category */}
          <div className="grid gap-2 relative">
            <Label htmlFor="category">{lbl("products.category")}</Label>
            <div className="relative">
              <Input
                ref={catInputRef}
                id="category"
                value={form.categoryName}
                onChange={(e) => { setForm((f) => ({ ...f, categoryName: e.target.value })); setShowCatDropdown(true) }}
                onFocus={() => setShowCatDropdown(true)}
                placeholder={lbl("products.chooseCategory")}
                className="pe-8"
              />
              <button
                type="button"
                onClick={() => setShowCatDropdown((v: boolean) => !v)}
                className="absolute end-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", showCatDropdown && "rotate-180")} />
              </button>
            </div>
            {showCatDropdown && filteredCategories.length > 0 && (
              <div
                ref={catDropdownRef}
                className="absolute top-full inset-x-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
              >
                {filteredCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCategory(c.nom)}
                    className={cn(
                      "w-full text-start px-3 py-2 text-sm hover:bg-secondary/50 transition-colors",
                      c.nom === form.categoryName && "bg-primary/10 text-primary",
                    )}
                  >
                    {c.nom}
                  </button>
                ))}
              </div>
            )}
            {form.categoryName && !filteredCategories.some((c) => (c.nom || "").toLowerCase() === form.categoryName.toLowerCase()) && (
              <p className="text-xs text-malachite dark:text-malachite mt-1">
                {lbl("products.newCategoryHint")}: <strong>{form.categoryName}</strong>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="desc">{lbl("products.description")}</Label>
            <Textarea
              id="desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={lbl("products.description")}
            />
          </div>

          {/* Sizes & Prices */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">{lbl("products.sizesAndPrices")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSize}>
                <Plus className="h-3.5 w-3.5" />
                {lbl("products.addSize")}
              </Button>
            </div>
            {form.sizes.length === 0 && (
              <p className="text-xs text-muted-foreground">{lbl("products.noSizes")}</p>
            )}
            {form.sizes.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={s.code}
                  onChange={(v: string) => updateSize(idx, "code", v)}
                  options={SIZE_OPTIONS.map((code) => ({
                    value: code,
                    label: SIZE_LABELS[code]?.[lang] || code,
                  }))}
                />
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder="0"
                    value={s.price}
                    onChange={(e) => updateSize(idx, "price", e.target.value)}
                    className={cn(lang === "ar" ? "ps-8" : "ps-8")}
                  />
                  <span className="absolute start-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {lang === "ar" ? "\u062F.\u062C" : "DA"}
                  </span>
                </div>
                {form.sizes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSize(idx)}
                    className="h-8 w-8 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{lbl("products.cancel")}</Button>
          <Button onClick={onSubmit} disabled={submitting || !(form.nom || "").trim()}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {lbl("products.saving")}
              </span>
            ) : editProduct ? (
              lbl("products.save")
            ) : (
              lbl("products.create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
