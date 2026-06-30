import { z } from "zod"

export const phoneRegex = /^0(5|6|7)\d{8}$/
export const phoneSchema = z.string().regex(phoneRegex, "رقم الهاتف غير صحيح")
export const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/

// ── Auth ───────────────────────────────────────────────────────
export const loginSchema = z.object({
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
  slug: z.string().regex(slugRegex, "Invalid slug").optional().or(z.literal("__root__")),
})

export const setupRootSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const checkoutFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional(),
  table: z.string().optional(),
  deliveryAddress: z.string().optional(),
})

export const setupTenantUsersSchema = z.object({
  slug: z.string().regex(slugRegex, "Invalid slug"),
  passwords: z.record(z.string(), z.string().min(6, "Each password must be at least 6 characters")),
})

// ── Orders ────────────────────────────────────────────────────
const orderItemSchema = z.object({
  product_id: z.union([z.number(), z.string()]),
  product_name: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  subtotal: z.number().nonnegative().optional(),
  size: z.string().optional().nullable(),
  sauce: z.string().optional().nullable(),
})

export const createOrderSchema = z.object({
  customer_name: z.string().min(1, "Customer name required"),
  customer_phone: phoneSchema.optional().nullable().or(z.literal("")),
  table_number: z.union([z.number(), z.string()]).optional().nullable(),
  status: z.enum(["pending", "preparing", "ready", "completed", "cancelled", "out_for_delivery"]).optional(),
  order_type: z.enum(["dine_in", "takeaway", "delivery"]).optional(),
  payment_status: z.enum(["unpaid", "paid"]).optional(),
  items: z.array(orderItemSchema).min(1, "At least one item required"),
  processed_by_staff_name: z.string().optional().nullable(),
  processed_by_staff_id: z.string().optional().nullable(),
  cashier_name: z.string().optional().nullable(),
  cashier_id: z.string().optional().nullable(),
  delivery_address: z.string().optional().nullable(),
  delivery_lat: z.number().optional().nullable(),
  delivery_lng: z.number().optional().nullable(),
  idempotency_key: z.string().optional(),
})

export const updateOrderSchema = z.object({
  status: z.enum(["pending", "preparing", "ready", "completed", "cancelled", "out_for_delivery"]).optional(),
  customer_name: z.string().optional(),
  customer_phone: phoneSchema.optional().nullable().or(z.literal("")),
  table_number: z.union([z.number(), z.string()]).optional().nullable(),
  order_type: z.enum(["dine_in", "takeaway", "delivery"]).optional(),
  payment_status: z.enum(["unpaid", "paid"]).optional(),
  total: z.number().nonnegative().optional(),
  items: z.array(orderItemSchema).optional(),
})

export const customerLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

// ── Products ──────────────────────────────────────────────────
const priceEntrySchema = z.object({
  taille_id: z.union([z.number(), z.string()]).nullable().optional(),
  base_sauce_id: z.union([z.number(), z.string()]).nullable().optional(),
  prix: z.union([z.number(), z.string()]),
  disponible: z.boolean().optional(),
})

export const createProductSchema = z.object({
  nom: z.string().min(1, "Product name required"),
  categorie_id: z.union([z.number(), z.string()]),
  description: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  est_speciale: z.boolean().optional(),
  is_available: z.boolean().optional(),
  sizes: z.array(priceEntrySchema).min(1, "At least one price required"),
})

export const updateProductSchema = z.object({
  nom: z.string().min(1).optional(),
  categorie_id: z.union([z.number(), z.string()]).optional(),
  description: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  est_speciale: z.boolean().optional(),
  is_available: z.boolean().optional(),
  sizes: z.array(priceEntrySchema).optional(),
})

export const toggleAvailabilitySchema = z.object({
  is_available: z.boolean(),
})

// ── Categories ────────────────────────────────────────────────
export const createCategorySchema = z.object({
  nom: z.string().min(1, "Category name required"),
  description: z.string().optional().nullable(),
})

export const updateCategorySchema = z.object({
  nom: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
})

// ── Ratings ───────────────────────────────────────────────────
export const createRatingSchema = z.object({
  order_id: z.string().uuid("Invalid order ID"),
  product_id: z.union([z.number(), z.string()]),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional().nullable(),
})

// ── Tenant ────────────────────────────────────────────────────
export const createTenantSchema = z.object({
  name: z.string().min(1, "Tenant name required"),
  slug: z.string().regex(slugRegex, "Invalid slug"),
  supabase_url: z.string().url("Valid Supabase URL required"),
  supabase_anon_key: z.string().min(1, "Anon key required"),
  is_active: z.boolean().optional(),
  is_open: z.boolean().optional(),
  logo_url: z.string().optional().nullable(),
  plan_type: z.enum(["starter", "pro", "elite"]).optional(),
})

export const updateTenantSchema = z.object({
  name: z.string().optional(),
  supabase_url: z.string().url().optional(),
  supabase_anon_key: z.string().optional(),
  is_active: z.boolean().optional(),
  is_open: z.boolean().optional(),
  logo_url: z.string().optional().nullable(),
  plan_type: z.enum(["starter", "pro", "elite"]).optional(),
})

// ── Staff / Drivers / Cashiers ────────────────────────────────
export const createStaffSchema = z.object({
  name: z.string().min(1, "Staff name required"),
  role: z.enum(["cashier", "chef"]).optional(),
  whatsapp_number: z.string().optional().nullable(),
})

export const updateStaffSchema = z.object({
  name: z.string().optional(),
  role: z.enum(["cashier", "chef"]).optional(),
})

export const createDriverSchema = z.object({
  name: z.string().min(1, "Driver name required"),
  whatsapp_number: z.string().min(1, "WhatsApp number required"),
})

export const assignDeliverySchema = z.object({
  order_id: z.string().uuid("Invalid order ID"),
  delivery_man_id: z.string().uuid("Invalid delivery man ID"),
})

// ── Admin ─────────────────────────────────────────────────────
export const bulkUpdateSchema = z.object({
  product_ids: z.array(z.union([z.number(), z.string()])).min(1),
  action: z.enum(["set_availability", "set_price", "set_category"]),
  is_available: z.boolean().optional(),
  price: z.union([z.number(), z.string()]).optional(),
  size_code: z.string().optional(),
  sauce_id: z.union([z.number(), z.string()]).optional(),
  categorie_id: z.union([z.number(), z.string()]).optional(),
})

// ── Helper: consistent error response ─────────────────────────
export function validationError(error: z.ZodError) {
  return Response.json(
    { error: "Validation failed", issues: error.issues },
    { status: 400 },
  )
}
