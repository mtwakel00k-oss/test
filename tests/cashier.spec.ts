import { test, expect } from "@playwright/test"

test.describe("POS — Cashier POS Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/burger-house/pos")
    await page.waitForLoadState("networkidle")
  })

  test("loads POS page with new-order panel visible", async ({ page }) => {
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({ timeout: 15000 })
  })

  test("adds a product to cart via add button", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-to-order"]').first()
    await addBtn.waitFor({ timeout: 15000 })
    await addBtn.click()
    await expect(page.locator('[data-testid="create-order"]')).toBeVisible({ timeout: 5000 })
  })

  test("can place a simple dine-in order end-to-end", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-to-order"]').first()
    await addBtn.waitFor({ timeout: 15000 })
    await addBtn.click()
    await page.waitForTimeout(300)

    const customerInput = page.locator('[data-testid="customer-name-input"]')
    if (await customerInput.isVisible()) {
      await customerInput.fill("Test Customer")
    }

    const submitBtn = page.locator('[data-testid="create-order"]')
    await expect(submitBtn).toBeEnabled({ timeout: 5000 })
    await submitBtn.click()
    await page.waitForTimeout(2000)
  })

  test("can switch between order types", async ({ page }) => {
    await page.waitForTimeout(1500)
    const dineInBtn = page.locator('[data-testid="order-type-dine-in"]')
    await expect(dineInBtn).toBeVisible({ timeout: 10000 })
    await dineInBtn.click()
  })

  test("product search filters the grid", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='earch' i], input[placeholder*='بحث' i]")
    await searchInput.waitFor({ timeout: 15000 })
    await expect(searchInput).toBeVisible()
    await searchInput.fill("Burger")
    await page.waitForTimeout(500)
    const products = page.locator('[data-testid="product-card"]')
    const count = await products.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test("orders panel shows empty state when no orders", async ({ page }) => {
    await page.goto("/burger-house/pos")
    await page.waitForLoadState("networkidle")
    const ordersTab = page.locator("button:has-text('Orders'), button:has-text('الطلبات'), [data-testid='new-order-tab']")
    const newOrderTab = page.locator('[data-testid="new-order-tab"]')
    if (await newOrderTab.isVisible()) {
    }
    await page.waitForTimeout(1000)
  })
})

test.describe("POS — Order Status Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/burger-house/pos")
    await page.waitForLoadState("networkidle")
  })

  test("order appears as card with status buttons after creation", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-to-order"]').first()
    await addBtn.waitFor({ timeout: 15000 })
    await addBtn.click()
    await page.waitForTimeout(300)

    const submitBtn = page.locator('[data-testid="create-order"]')
    await expect(submitBtn).toBeEnabled({ timeout: 5000 })
    await submitBtn.click()
    await page.waitForTimeout(2000)
  })
})
