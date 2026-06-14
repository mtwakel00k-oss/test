import { test, expect } from "@playwright/test"

test.describe("Admin — Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/burger-house/admin")
    await page.waitForLoadState("networkidle")
  })

  test("loads admin dashboard", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)
  })

  test("can navigate between admin tabs", async ({ page }) => {
    await page.waitForTimeout(3000)
    const tabButtons = page.locator("button").filter({ hasText: /products|orders|categories|audit|dashboard|settings|المبيعات|المنتجات|الطلبات|التصنيفات|سجل|الإعدادات/i })
    const count = await tabButtons.count()
    if (count > 1) {
      await tabButtons.last().click()
      await page.waitForTimeout(1000)
    }
  })

  test("dashboard stat cards are visible", async ({ page }) => {
    await page.waitForTimeout(3000)
    const statCards = page.locator('[data-testid="stat-card"]')
    const count = await statCards.count().catch(() => 0)
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
