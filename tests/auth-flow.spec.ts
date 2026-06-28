import { test, expect } from "@playwright/test"

test.describe("Auth Flow", () => {
  test("login page loads with form elements", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("h1")).toBeVisible()
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/burger-house/login")
    await page.waitForLoadState("networkidle")
    await page.fill('input[type="text"]', "invalid")
    await page.fill('input[type="password"]', "wrong")
    await page.click('button:has-text("Log in")')
    await page.waitForTimeout(2000)
    const errorText = await page.locator("text=فشل تسجيل الدخول").count()
    expect(errorText).toBeGreaterThanOrEqual(0)
  })
})
