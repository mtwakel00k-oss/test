"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle, Plus, Trash2, Pencil, X, Upload, ChevronDown, ToggleLeft, ToggleRight, ShoppingBag, Layers } from "lucide-react"
import { ConfirmDeleteModal } from "./confirm-delete-modal"
import { BulkOperations } from "./bulk-operations"
import { logger } from "@/lib/logger"
import { cn } from "@/lib/utils"
import { fetchApi } from "@/lib/tenant"
import { getScope, getScopedCookieLang } from "@/lib/i18n-scope"

// ─── Types ─────────────────────────────────────────────────

interface ProductItem {
  id: number
  name: string
  description?: string | null
  category: string | null
  is_available: boolean | null
  image_url?: string | null
  prices?: Record<string, { standard?: number | null; sauce_tomate?: number | null; creme_fraiche?: number | null }> | null
}

interface Category {
  id: number
  nom: string
}

interface SizeRow {
  code: string
  price: string
}

interface AlertState {
  type: "error" | "success"
  message: string
}

type Lang = "ar" | "en" | "fr"
type TranslationKey =
  | "products.title"
  | "products.subtitle"
  | "products.addCategory"
  | "products.addProduct"
  | "products.editProduct"
  | "products.createProduct"
  | "products.bulk"
  | "products.productImage"
  | "products.uploadImage"
  | "products.uploading"
  | "products.productName"
  | "products.category"
  | "products.description"
  | "products.sizesAndPrices"
  | "products.addSize"
  | "products.noSizes"
  | "products.cancel"
  | "products.save"
  | "products.create"
  | "products.saving"
  | "products.loading"
  | "products.createCategory"
  | "products.categoryName"
  | "products.categoryDescription"
  | "products.chooseCategory"
  | "products.newCategoryHint"
  | "products.invalidPrice"
  | "products.enterName"
  | "products.addOneSize"
  | "products.updateSuccess"
  | "products.createSuccess"
  | "products.categoryCreateSuccess"
  | "products.deleteSuccess"
  | "products.catDeleteSuccess"
  | "products.unknownError"
  | "products.networkError"
  | "products.changeStatusError"
  | "products.deleteError"
  | "products.catDeleteError"
  | "products.noProducts"
  | "products.available"
  | "products.unavailable"
  | "products.youSure"
  | "products.irreversible"
  | "column.product"
  | "column.category"
  | "column.price"
  | "column.status"
  | "column.actions"
  | "common.cancel"
  | "common.delete"
  | "common.deleting"

const TRANSLATIONS: Record<TranslationKey, { ar: string; en: string; fr: string }> = {
  "products.title": { ar: "المنتجات", en: "Products", fr: "Produits" },
  "products.subtitle": { ar: "إدارة قائمة الطعام والأسعار", en: "Manage menu and prices", fr: "Gérer le menu et les prix" },
  "products.addCategory": { ar: "إضافة تصنيف", en: "Add Category", fr: "Ajouter une catégorie" },
  "products.addProduct": { ar: "إضافة منتج", en: "Add Product", fr: "Ajouter un produit" },
  "products.bulk": { ar: "عمليات جماعية", en: "Bulk", fr: "Groupé" },
  "products.editProduct": { ar: "تعديل المنتج", en: "Edit Product", fr: "Modifier le produit" },
  "products.createProduct": { ar: "إضافة منتج", en: "Add Product", fr: "Ajouter un produit" },
  "products.productImage": { ar: "صورة المنتج", en: "Product Image", fr: "Image du produit" },
  "products.uploadImage": { ar: "رفع صورة", en: "Upload Image", fr: "Télécharger l'image" },
  "products.uploading": { ar: "جاري الرفع...", en: "Uploading...", fr: "Téléchargement..." },
  "products.productName": { ar: "اسم المنتج", en: "Product Name", fr: "Nom du produit" },
  "products.category": { ar: "التصنيف", en: "Category", fr: "Catégorie" },
  "products.description": { ar: "الوصف", en: "Description", fr: "Description" },
  "products.sizesAndPrices": { ar: "المقاسات والأسعار", en: "Sizes & Prices", fr: "Tailles et prix" },
  "products.addSize": { ar: "إضافة مقاس", en: "Add Size", fr: "Ajouter une taille" },
  "products.noSizes": { ar: "لا توجد مقاسات. أضف مقاساً واحداً على الأقل.", en: "No sizes. Add at least one size.", fr: "Aucune taille. Ajoutez au moins une taille." },
  "products.cancel": { ar: "إلغاء", en: "Cancel", fr: "Annuler" },
  "products.save": { ar: "حفظ التعديلات", en: "Save Changes", fr: "Enregistrer" },
  "products.create": { ar: "إضافة المنتج", en: "Add Product", fr: "Ajouter le produit" },
  "products.saving": { ar: "جاري الحفظ...", en: "Saving...", fr: "Enregistrement..." },
  "products.loading": { ar: "جاري التحميل...", en: "Loading...", fr: "Chargement..." },
  "products.createCategory": { ar: "إضافة تصنيف", en: "Add Category", fr: "Ajouter une catégorie" },
  "products.categoryName": { ar: "اسم التصنيف", en: "Category Name", fr: "Nom de la catégorie" },
  "products.categoryDescription": { ar: "وصف التصنيف (اختياري)", en: "Category description (optional)", fr: "Description de la catégorie (optionnelle)" },
  "products.chooseCategory": { ar: "اختر أو اكتب تصنيفاً جديداً", en: "Choose or type a new category", fr: "Choisissez ou tapez une nouvelle catégorie" },
  "products.newCategoryHint": { ar: "سيتم إنشاء تصنيف جديد", en: "New category will be created", fr: "Une nouvelle catégorie sera créée" },
  "products.invalidPrice": { ar: "سعر غير صالح للحجم", en: "Invalid price for size", fr: "Prix invalide pour la taille" },
  "products.enterName": { ar: "الرجاء إدخال اسم المنتج", en: "Please enter a product name", fr: "Veuillez saisir un nom de produit" },
  "products.addOneSize": { ar: "الرجاء إضافة حجم واحد على الأقل", en: "Please add at least one size", fr: "Veuillez ajouter au moins une taille" },
  "products.updateSuccess": { ar: "تم تحديث المنتج", en: "Product updated", fr: "Produit mis à jour" },
  "products.createSuccess": { ar: "تم إنشاء المنتج", en: "Product created", fr: "Produit créé" },
  "products.categoryCreateSuccess": { ar: "تم إنشاء التصنيف", en: "Category created", fr: "Catégorie créée" },
  "products.deleteSuccess": { ar: "تم حذف المنتج", en: "Product deleted", fr: "Produit supprimé" },
  "products.catDeleteSuccess": { ar: "تم حذف التصنيف", en: "Category deleted", fr: "Catégorie supprimée" },
  "products.unknownError": { ar: "خطأ غير معروف", en: "Unknown error", fr: "Erreur inconnue" },
  "products.networkError": { ar: "خطأ في الشبكة", en: "Network error", fr: "Erreur réseau" },
  "products.changeStatusError": { ar: "فشل تغيير الحالة", en: "Failed to change status", fr: "Échec du changement de statut" },
  "products.deleteError": { ar: "فشل الحذف", en: "Delete failed", fr: "Échec de la suppression" },
  "products.catDeleteError": { ar: "فشل حذف التصنيف", en: "Category delete failed", fr: "Échec de la suppression de la catégorie" },
  "products.noProducts": { ar: "لا توجد منتجات بعد", en: "No products yet", fr: "Aucun produit pour l'instant" },
  "products.available": { ar: "متاح", en: "Available", fr: "Disponible" },
  "products.unavailable": { ar: "غير متاح", en: "Unavailable", fr: "Indisponible" },
  "products.youSure": { ar: "هل أنت متأكد", en: "Are you sure?", fr: "Êtes-vous sûr ?" },
  "products.irreversible": { ar: "لا يمكن التراجع عن هذا الإجراء", en: "This action cannot be undone", fr: "Cette action est irréversible" },
  "column.product": { ar: "المنتج", en: "Product", fr: "Produit" },
  "column.category": { ar: "التصنيف", en: "Category", fr: "Catégorie" },
  "column.price": { ar: "السعر", en: "Price", fr: "Prix" },
  "column.status": { ar: "الحالة", en: "Status", fr: "Statut" },
  "column.actions": { ar: "الإجراءات", en: "Actions", fr: "Actions" },
  "common.cancel": { ar: "تراجع", en: "Cancel", fr: "Annuler" },
  "common.delete": { ar: "حذف", en: "Delete", fr: "Supprimer" },
  "common.deleting": { ar: "جارٍ الحذف...", en: "Deleting...", fr: "Suppression..." },
}

const SIZE_LABELS: Record<string, { ar: string; en: string; fr: string }> = {
  NONE: { ar: "بدون حجم", en: "No Size", fr: "Sans taille" },
  S: { ar: "صغير", en: "Small", fr: "Petit" },
  M: { ar: "وسط", en: "Medium", fr: "Moyen" },
  L: { ar: "كبير", en: "Large", fr: "Grand" },
  XL: { ar: "كبير جداً", en: "Extra Large", fr: "Très grand" },
  XXL: { ar: "ضعف كبير", en: "Double Large", fr: "Double grand" },
}

const SIZE_OPTIONS = ["NONE", "S", "M", "L", "XL", "XXL"] as const

const COLUMNS: { key: string; labelKey: TranslationKey }[] = [
  { key: "product", labelKey: "column.product" },
  { key: "category", labelKey: "column.category" },
  { key: "price", labelKey: "column.price" },
  { key: "status", labelKey: "column.status" },
  { key: "actions", labelKey: "column.actions" },
]

// ─── Locale helpers ────────────────────────────────────────

function getLabel(key: TranslationKey, lang: Lang): string {
  const entry = TRANSLATIONS[key]
  if (!entry) return TRANSLATIONS["products.unknownError"].ar
  const text = entry[lang]
  if (text === undefined || text === null) return entry.ar
  return text
}

function intlNumber(value: number, lang: Lang): string {
  const locale = lang === "fr" ? "fr-DZ" : "en-DZ"
  try {
    return value.toLocaleString(locale)
  } catch {
    return String(value)
  }
}

// ─── Use language hook ─────────────────────────────────────

function useLanguage(): Lang {
  const [lang] = useState<Lang>(() => {
    if (typeof document === "undefined") return "ar"
    return getScopedCookieLang(getScope()) || "ar"
  })
  return lang
}

// ─── Alert sub-component ───────────────────────────────────

function Alert({ alert, onDismiss }: { alert: AlertState; onDismiss: () => void }) {
  if (!alert.message) return null
  const isError = alert.type === "error"
  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 rounded-md text-sm mb-3",
        isError
          ? "bg-red-500/10 text-red-600 dark:text-red-400"
          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
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

const sanitizePrice = (raw: string): number => {
  const cleaned = raw.replace(/[^0-9.,]/g, "").replace(/,/g, ".")
  const num = parseFloat(cleaned)
  return isNaN(num) ? NaN : num
}

function priceRange(prices: ProductItem["prices"], lang: Lang): string {
  if (!prices) return "—"
  const vals: number[] = []
  for (const _code of Object.keys(prices)) {
    const pr = prices[_code]
    const v = pr?.standard ?? pr?.sauce_tomate ?? null
    if (v != null && v > 0) vals.push(v)
  }
  vals.sort((a, b) => a - b)
  if (vals.length === 0) return "—"
  const symbol = lang === "ar" ? "د.ج" : "DA"
  if (vals.length === 1) return `${intlNumber(vals[0], lang)} ${symbol}`
  return `${intlNumber(vals[0], lang)} - ${intlNumber(vals[vals.length - 1], lang)} ${symbol}`
}

// ─── Main Component ──────────────────────────────────────

export function ProductManager() {
  const lang = useLanguage()
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr"
  const lbl = (key: TranslationKey): string => getLabel(key, lang)

  const [products, setProducts] = useState<ProductItem[]>([])
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [catDeleteId, setCatDeleteId] = useState<number | null>(null)
  const [catDeleteTarget, setCatDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductItem | null>(null)
  const [form, setForm] = useState({ nom: "", categoryName: "", description: "", image_url: "", sizes: [] as SizeRow[] })
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [alert, setAlert] = useState<AlertState>({ type: "error", message: "" })
  const [showCatDropdown, setShowCatDropdown] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catForm, setCatForm] = useState({ nom: "", description: "" })
  const [catSubmitting, setCatSubmitting] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const catInputRef = useRef<HTMLInputElement>(null)
  const catDropdownRef = useRef<HTMLDivElement>(null)

  const showError = useCallback((msg: string) => setAlert({ type: "error", message: msg }), [])
  const showSuccess = useCallback((msg: string) => setAlert({ type: "success", message: msg }), [])
  const dismissAlert = useCallback(() => setAlert((prev) => ({ ...prev, message: "" })), [])
  const clearAlert = useCallback(() => setAlert({ type: "error", message: "" }), [])

  const fetchProducts = useCallback(() => {
    fetchApi("/api/products")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (data && typeof data === "object" && "error" in data) {
          const errData = data as { error: string }
          showError(errData.error)
          return
        }
        if (Array.isArray(data)) setProducts(data)
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : lbl("products.unknownError")
        showError(`${lbl("products.networkError")}: ${msg}`)
      })
  }, [showError]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCategories = useCallback(() => {
    fetchApi("/api/categories")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setCategories(data)
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : lbl("products.unknownError")
        logger.error("Categories fetch error", msg)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        catDropdownRef.current &&
        !catDropdownRef.current.contains(e.target as Node) &&
        catInputRef.current &&
        !catInputRef.current.contains(e.target as Node)
      ) {
        setShowCatDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filteredCategories = categories.filter((c) =>
    (c.nom || "").toLowerCase().includes((form.categoryName || "").toLowerCase()),
  )

  const openAdd = useCallback(() => {
    setEditProduct(null)
    clearAlert()
    setForm({ nom: "", categoryName: "", description: "", image_url: "", sizes: [{ code: "L", price: "" }] })
    setModalOpen(true)
  }, [clearAlert])

  const openEdit = useCallback(
    (product: ProductItem) => {
      setEditProduct(product)
      clearAlert()
      const sizes: SizeRow[] = []
      if (product.prices) {
        for (const [code, prices] of Object.entries(product.prices)) {
          const val = prices?.standard ?? prices?.sauce_tomate ?? null
          const mappedCode = code === "UNIQUE" ? "NONE" : code
          sizes.push({ code: mappedCode, price: val != null ? String(val) : "" })
        }
      }
      setForm({
        nom: product.name || "",
        categoryName: product.category || "",
        description: product.description || "",
        image_url: product.image_url || "",
        sizes: sizes.length ? sizes : [{ code: "L", price: "" }],
      })
      setModalOpen(true)
    },
    [clearAlert],
  )

  const selectCategory = useCallback((name: string) => {
    setForm((f) => ({ ...f, categoryName: name }))
    setShowCatDropdown(false)
  }, [])

  const toggle = useCallback(
    async (id: number, current: boolean) => {
      setLoadingId(id)
      const next = !current
      try {
        const res = await fetchApi("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, is_available: next }),
        })
        if (res.ok) {
          setProducts((p) => p.map((pr) => (pr.id === id ? { ...pr, is_available: next } : pr)))
        } else {
          const data: { error?: string; message?: string } = await res.json().catch(() => ({}))
          showError(`${lbl("products.changeStatusError")}: ${data.error || data.message || String(res.status)}`)
        }
      } catch {
        showError(`${lbl("products.changeStatusError")}: ${lbl("products.networkError")}`)
      }
      setLoadingId(null)
    },
    [showError], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const startDelete = useCallback((id: number, name: string) => setDeleteTarget({ id, name }), [])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteId(id)
    try {
      const res = await fetchApi(`/api/products?id=${id}&force=1`, { method: "DELETE" })
      if (res.ok) {
        setProducts((p) => p.filter((pr) => pr.id !== id))
        showSuccess(lbl("products.deleteSuccess"))
      } else {
        const data: { error?: string; message?: string } = await res.json().catch(() => ({}))
        showError(`${lbl("products.deleteError")}: ${data.error || data.message || String(res.status)}`)
      }
    } catch {
      showError(`${lbl("products.deleteError")}: ${lbl("products.networkError")}`)
    }
    setDeleteId(null)
    setDeleteTarget(null)
  }, [deleteTarget, showError, showSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  const confirmDeleteCategory = useCallback(async () => {
    if (!catDeleteTarget) return
    const { id } = catDeleteTarget
    setCatDeleteId(id)
    try {
      const res = await fetchApi(`/api/categories?id=${id}&force=1`, { method: "DELETE" })
      if (res.ok) {
        fetchCategories()
        fetchProducts()
        showSuccess(lbl("products.catDeleteSuccess"))
      } else {
        const data: { error?: string; message?: string } = await res.json().catch(() => ({}))
        showError(`${lbl("products.catDeleteError")}: ${data.error || data.message || String(res.status)}`)
      }
    } catch {
      showError(`${lbl("products.catDeleteError")}: ${lbl("products.networkError")}`)
    }
    setCatDeleteId(null)
    setCatDeleteTarget(null)
  }, [catDeleteTarget, fetchCategories, fetchProducts, showError, showSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      clearAlert()
      setUploading(true)
      const fd = new FormData()
      fd.append("file", file)
      try {
        const res = await fetchApi("/api/upload", { method: "POST", body: fd })
        const data: { url?: string; error?: string } = await res.json()
        if (res.ok && data.url) {
          setForm((f) => ({ ...f, image_url: data.url || "" }))
        } else {
          showError(data.error || lbl("products.unknownError"))
        }
      } catch {
        showError(lbl("products.networkError"))
      }
      setUploading(false)
    },
    [clearAlert, showError], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const addSize = useCallback(() => {
    setForm((f) => ({ ...f, sizes: [...f.sizes, { code: "L", price: "" }] }))
  }, [])

  const removeSize = useCallback((idx: number) => {
    setForm((f) => ({ ...f, sizes: f.sizes.filter((_, i) => i !== idx) }))
  }, [])

  const updateSize = useCallback((idx: number, field: keyof SizeRow, value: string) => {
    setForm((f) => {
      const sizes = [...f.sizes]
      sizes[idx] = { ...sizes[idx], [field]: value }
      return { ...f, sizes }
    })
  }, [])

  const getOrCreateCategoryId = useCallback(
    async (name: string): Promise<number | null> => {
      const trimmed = (name || "").trim()
      if (!trimmed) return null
      const existing = categories.find((c) => (c.nom || "").toLowerCase() === trimmed.toLowerCase())
      if (existing) return existing.id
      try {
        const res = await fetchApi("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom: trimmed }),
        })
        const data: { id?: number; nom?: string } = await res.json()
        if (res.ok && data.id) {
          setCategories((prev) => [...prev, data as Category])
          return data.id
        }
      } catch {
        // fall through to temp id
      }
      return -(Math.abs(trimmed.length * 997) % 1000 + 100)
    },
    [categories],
  )

  const submitCategory = useCallback(async () => {
    if (!(catForm.nom || "").trim()) return
    setCatSubmitting(true)
    try {
      const res = await fetchApi("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: catForm.nom.trim(),
          description: catForm.description.trim() || undefined,
        }),
      })
      if (res.ok) {
        const newCat: { nom?: string } | null = await res.json().catch(() => null)
        setCatModalOpen(false)
        setCatForm({ nom: "", description: "" })
        showSuccess(lbl("products.categoryCreateSuccess"))
        fetchCategories()
        if (newCat?.nom) setForm((f) => ({ ...f, categoryName: String(newCat.nom) }))
      } else {
        const data: { error?: string } = await res.json().catch(() => ({}))
        showError(data.error || lbl("products.unknownError"))
      }
    } catch {
      showError(lbl("products.networkError"))
    }
    setCatSubmitting(false)
  }, [catForm, fetchCategories, showError, showSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(async () => {
    if (!(form.nom || "").trim()) {
      showError(lbl("products.enterName"))
      return
    }
    setSubmitting(true)
    clearAlert()

    try {
      const sizes: { code: string; price: number }[] = []
      const invalidCodes: string[] = []
      for (const s of form.sizes) {
        const code = (s.code || "").trim()
        const raw = (s.price || "").trim()
        if (!code || !raw) continue
        const price = Number(sanitizePrice(raw))
        if (isNaN(price) || price <= 0) {
          invalidCodes.push(code)
        } else {
          sizes.push({ code, price })
        }
      }

      if (invalidCodes.length > 0) {
        showError(`${lbl("products.invalidPrice")}: ${invalidCodes.join(", ")}`)
        setSubmitting(false)
        return
      }

      if (sizes.length === 0) {
        showError(lbl("products.addOneSize"))
        setSubmitting(false)
        return
      }

      const categorie_id = await getOrCreateCategoryId(form.categoryName)

      const body: Record<string, unknown> = {
        action: editProduct ? "update" : "create",
        nom: form.nom.trim(),
        categorie_id,
        description: form.description.trim() || null,
        image_url: form.image_url || null,
        sizes,
      }
      if (editProduct) body.id = editProduct.id

      const res = await fetchApi("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setModalOpen(false)
        showSuccess(editProduct ? lbl("products.updateSuccess") : lbl("products.createSuccess"))
        await fetchProducts()
        await fetchCategories()
      } else {
        const data: { error?: string; message?: string } = await res.json().catch(() => ({}))
        const errMsg = data.error || data.message || lbl("products.unknownError")
        logger.error("Product save failed", { status: res.status, error: errMsg })
        showError(errMsg)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : lbl("products.unknownError")
      showError(msg)
      logger.error("Submit error", e)
    }
    setSubmitting(false)
  }, [form, editProduct, getOrCreateCategoryId, fetchProducts, fetchCategories, clearAlert, showError, showSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ──────────────────────────────────────────────

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl col-span-full rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden" dir={dir}>
      <CardHeader className="p-8 pb-4 flex-row items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-black text-foreground tracking-tight">{lbl("products.title")}</CardTitle>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{lbl("products.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => { setCatForm({ nom: "", description: "" }); setCatModalOpen(true) }} className="h-12 px-6 rounded-2xl border-border/50 text-xs font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all">
            <Plus className="size-4 ms-2" />
            {lbl("products.addCategory")}
          </Button>
          <Button variant="secondary" onClick={() => setBulkOpen(true)} className="h-12 px-6 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Layers className="size-4 ms-2" />
            {lbl("products.bulk")}
          </Button>
          <Button onClick={openAdd} className="h-12 px-6 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Plus className="size-4 ms-2" />
            {lbl("products.addProduct")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <Alert alert={alert} onDismiss={dismissAlert} />
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
                <tr key={product.id} className="group hover:bg-primary/[0.02] transition-all duration-300">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center gap-4" style={{ flexDirection: dir === "rtl" ? "row-reverse" : "row" }}>
                      {product.image_url ? (
                        <div className="size-14 rounded-2xl overflow-hidden border border-border/50 shadow-sm group-hover:scale-110 transition-transform duration-500">
                          <Image src={product.image_url} alt={product.name} width={56} height={56} className="size-full object-cover" unoptimized />
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
                          {product.name || "—"}
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
                      {product.category || "—"}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className="text-sm font-black text-foreground tabular-nums">
                      {priceRange(product.prices, lang)}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-center">
                    <button
                      onClick={() => toggle(product.id, product.is_available ?? true)}
                      disabled={loadingId === product.id}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all disabled:opacity-50 shadow-sm",
                        product.is_available !== false
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
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
                        onClick={() => openEdit(product)}
                        className="size-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => startDelete(product.id, product.name)}
                        className="size-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center justify-center"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Add/Edit Product Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
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
                  onClick={() => setShowCatDropdown((v) => !v)}
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
                <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">
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
                    onChange={(v) => updateSize(idx, "code", v)}
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
                      {lang === "ar" ? "د.ج" : "DA"}
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
            <Button variant="outline" onClick={() => setModalOpen(false)}>{lbl("products.cancel")}</Button>
            <Button onClick={submit} disabled={submitting || !(form.nom || "").trim()}>
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

      {/* Delete Confirmation — Product */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        itemName={deleteTarget?.name || ""}
        onConfirm={confirmDelete}
        loading={deleteId !== null}
      />

      {/* Delete Confirmation — Category */}
      <ConfirmDeleteModal
        open={!!catDeleteTarget}
        onOpenChange={(open) => { if (!open) setCatDeleteTarget(null) }}
        itemName={catDeleteTarget?.name || ""}
        onConfirm={confirmDeleteCategory}
        loading={catDeleteId !== null}
      />

      {/* Add Category Modal */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="sm:max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{lbl("products.createCategory")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-nom">{lbl("products.categoryName")}</Label>
              <Input
                id="cat-nom"
                value={catForm.nom}
                onChange={(e) => setCatForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder={lbl("products.categoryName")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-desc">{lbl("products.description")}</Label>
              <Textarea
                id="cat-desc"
                value={catForm.description}
                onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={lbl("products.categoryDescription")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatModalOpen(false)}>{lbl("common.cancel")}</Button>
            <Button onClick={submitCategory} disabled={catSubmitting || !(catForm.nom || "").trim()}>
              {catSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {lbl("products.saving")}
                </span>
              ) : (
                lbl("products.createCategory")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkOperations
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onComplete={() => { setBulkOpen(false); fetchProducts() }}
      />
    </Card>
  )
}
