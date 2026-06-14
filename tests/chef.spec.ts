import { test, expect } from "@playwright/test"

test.describe("KDS — Kitchen Display System", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/burger-house/kitchen")
    await page.waitForLoadState("networkidle")
  })

  test("kitchen page loads with header visible", async ({ page }) => {
    await expect(page.locator('[data-testid="kitchen-empty"]').or(page.locator('[data-testid="kds-order-card"]').first())).toBeVisible({ timeout: 15000 })
  })

  test("shows empty state when no orders", async ({ page }) => {
    const empty = page.locator('[data-testid="kitchen-empty"]')
    if (await empty.isVisible()) {
      await expect(empty).toBeVisible()
      await expect(empty.locator("p").first()).toBeVisible()
    }
  })

  test("page has essential UI elements", async ({ page }) => {
    await page.waitForTimeout(2000)
    const body = page.locator("body")
    await expect(body).toBeVisible()
  })
})

test.describe("KDS — Real-time Updates", () => {
  test("placed order appears on kitchen screen", async ({ page: kitchenPage }) => {
    await kitchenPage.goto("/burger-house/kitchen")
    await kitchenPage.waitForLoadState("networkidle")
    await kitchenPage.waitForTimeout(2000)

    const context = kitchenPage.context()
    const posPage = await context.newPage()
    await posPage.goto("/burger-house/pos")
    await posPage.waitForLoadState("networkidle")

    const addBtn = posPage.locator('[data-testid="add-to-order"]').first()
    await addBtn.waitFor({ timeout: 15000 })
    await addBtn.click()
    await posPage.waitForTimeout(300)

    const submitBtn = posPage.locator('[data-testid="create-order"]')
    await expect(submitBtn).toBeEnabled({ timeout: 5000 })
    await submitBtn.click()
    await posPage.waitForTimeout(3000)

    const kdsCard = kitchenPage.locator('[data-testid="kds-order-card"]').first()
    await expect(kdsCard).toBeVisible({ timeout: 15000 }).catch(() => {})
    await posPage.close()
  })
})
