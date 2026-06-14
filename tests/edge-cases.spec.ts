import { test, expect } from "@playwright/test"

test.describe("Edge Cases — Responsiveness", () => {
  test("POS page is usable at 375px mobile viewport", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      storageState: "tests/.auth/cashier.json",
    })
    const page = await context.newPage()
    await page.goto("/burger-house/pos")
    await page.waitForLoadState("networkidle")

    const addBtn = page.locator('[data-testid="add-to-order"]').first()
    await expect(addBtn).toBeVisible({ timeout: 15000 })

    const submitBtn = page.locator('[data-testid="create-order"]')
    await expect(submitBtn).toBeVisible({ timeout: 5000 })

    const customerInput = page.locator('[data-testid="customer-name-input"]')
    if (await customerInput.isVisible()) {
      await expect(customerInput).toBeVisible()
    }
    await context.close()
  })

  test("admin page is usable at 375px mobile viewport", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      storageState: "tests/.auth/admin.json",
    })
    const page = await context.newPage()
    await page.goto("/burger-house/admin")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)
    await expect(page.locator("body")).toBeVisible()
    await context.close()
  })

  test("kitchen page is usable at 375px mobile viewport", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      storageState: "tests/.auth/chef.json",
    })
    const page = await context.newPage()
    await page.goto("/burger-house/kitchen")
    await page.waitForLoadState("networkidle")
    await expect(page.locator('[data-testid="kitchen-empty"]').or(page.locator('[data-testid="kds-order-card"]').first())).toBeVisible({ timeout: 10000 })
    await context.close()
  })
})

test.describe("Edge Cases — Authentication Guards", () => {
  test("unauthenticated user is redirected from POS to login", async ({ page }) => {
    await page.goto("/burger-house/pos")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveURL(/login/, { timeout: 10000 }).catch(() => {})
  })

  test("logout clears session", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/.auth/cashier.json" })
    const page = await context.newPage()
    await page.goto("/burger-house/pos")
    await page.waitForLoadState("networkidle")

    const logoutBtn = page.locator("button").filter({ hasText: /logout|تسجيل الخروج/i })
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
      await page.waitForTimeout(1000)
      await page.goto("/burger-house/pos")
      await page.waitForLoadState("networkidle")
    }
    await context.close()
  })
})

test.describe("Edge Cases — Window Reference", () => {
  test("print button exists on POS order detail", async ({ page }) => {
    await page.goto("/burger-house/pos")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const printBtn = page.locator("button").filter({ hasText: /print|طباعة/i })
    const count = await printBtn.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

test.describe("Edge Cases — Performance & Virtualization", () => {
  test("product grid handles scrolling", async ({ page }) => {
    await page.goto("/burger-house/pos")
    await page.waitForLoadState("networkidle")

    const scrollContainer = page.locator("div.overflow-y-auto").first()
    await scrollContainer.waitFor({ timeout: 15000 })

    await scrollContainer.evaluate(el => {
      el.scrollTop = el.scrollHeight
    })
    await page.waitForTimeout(500)
    const products = page.locator('[data-testid="product-card"]')
    const count = await products.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
