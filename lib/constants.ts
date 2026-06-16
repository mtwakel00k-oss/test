export const SIZES = ["L", "XL", "XXL"] as const

export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const

export const ORDER_STATUS_LABELS: Record<string, { ar: string; en: string; fr: string }> = {
  pending:          { ar: "طلب جديد",      en: "New Order",        fr: "Nouvelle commande" },
  preparing:        { ar: "قيد التحضير",   en: "Preparing",        fr: "En préparation" },
  ready:            { ar: "جاهز",           en: "Ready",            fr: "Prêt" },
  out_for_delivery: { ar: "في الطريق",     en: "Out for Delivery", fr: "En livraison" },
  completed:        { ar: "مكتمل",          en: "Completed",        fr: "Terminé" },
  cancelled:        { ar: "ملغي",           en: "Cancelled",        fr: "Annulé" },
}

export const DB_STATUS_TO_POS: Record<string, string> = {
  pending:          "pending",
  preparing:        "preparing",
  ready:            "ready",
  on_the_way:       "out_for_delivery",
  out_for_delivery: "out_for_delivery",
  completed:        "completed",
  cancelled:        "cancelled",
}

export const POS_STATUS_TO_DB: Record<string, string> = {
  pending:          "pending",
  preparing:        "preparing",
  ready:            "ready",
  out_for_delivery: "out_for_delivery",
  completed:        "completed",
  cancelled:        "cancelled",
}

export const DB_STATUS_TO_KITCHEN: Record<string, string> = {
  pending:   "pending",
  preparing: "preparing",
  ready:     "ready",
}

export const SAUCES = [
  { id: 1, label: "Sauce Tomate" },
  { id: 2, label: "Crème Fraîche" },
] as const
