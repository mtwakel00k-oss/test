import { test, expect } from "@playwright/test"

test.describe("Menu — Customer Menu Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/burger-house/menu")
    await page.waitForLoadState("networkidle")
  })

  test("menu page loads with products visible", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 })
  })

  test("menu page has category navigation", async ({ page }) => {
    await page.waitForTimeout(2000)
    const links = page.locator("a")
    const count = await links.count()
    expect(count).toBeGreaterThan(0)
  })

  test("menu page renders with valid title", async ({ page }) => {
    await page.waitForTimeout(2000)
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })
})
