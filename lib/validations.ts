import { z } from "zod"

export const phoneRegex = /^0(5|6|7)\d{8}$/

export const phoneSchema = z.string().regex(phoneRegex, "رقم الهاتف غير صحيح")

export const checkoutFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional(),
  table: z.string().optional(),
  deliveryAddress: z.string().optional(),
})
