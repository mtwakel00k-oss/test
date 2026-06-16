import { describe, it, expect } from "vitest"
import { t } from "@/lib/translations"

describe("t()", () => {
  it("returns Arabic for lang=ar", () => {
    expect(t("common.cancel", "ar")).toBe("إلغاء")
    expect(t("login.admin", "ar")).toBe("الإدارة")
    expect(t("pos.total", "ar")).toBe("المجموع")
  })

  it("returns English for lang=en", () => {
    expect(t("common.cancel", "en")).toBe("Cancel")
    expect(t("login.admin", "en")).toBe("Admin")
    expect(t("pos.total", "en")).toBe("Total")
  })

  it("returns French for lang=fr", () => {
    expect(t("common.cancel", "fr")).toBe("Annuler")
    expect(t("login.admin", "fr")).toBe("Administration")
    expect(t("pos.total", "fr")).toBe("Total")
  })

  it("returns key for unknown keys", () => {
    expect(t("nonexistent.key", "ar")).toBe("nonexistent.key")
    expect(t("nonexistent.key", "en")).toBe("nonexistent.key")
  })

  it("defaults to Arabic when lang is missing", () => {
    expect(t("common.yes", "ar")).toBe("نعم")
  })

  it("handles nested menu keys", () => {
    expect(t("menu.burgerDelivery", "en")).toBe("Burger Delivery")
    expect(t("menu.enterName", "ar")).toBe("يرجى إدخال الاسم")
  })

  it("handles order status keys", () => {
    expect(t("order.status.pending", "ar")).toBe("قيد الانتظار")
    expect(t("order.status.preparing", "en")).toBe("Preparing")
    expect(t("order.status.onTheWay", "fr")).toBe("En route")
  })

  it("handles time keys", () => {
    expect(t("time.justNow", "ar")).toBe("الآن")
    expect(t("time.minAgo", "en")).toBe("1 minute ago")
    expect(t("time.hourAgo", "fr")).toBe("Il y a 1 heure")
  })

  it("handles products keys", () => {
    expect(t("products.title", "ar")).toBe("المنتجات")
    expect(t("products.addProduct", "en")).toBe("Add Product")
  })
})
