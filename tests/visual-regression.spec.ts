import { test, expect } from "@playwright/test"

test.describe("Visual Regression", () => {
  test.describe("Login page", () => {
    test("matches baseline screenshot", async ({ page }) => {
      await page.goto("/login")
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(1000)
      await expect(page).toHaveSapshot("login-page.png", {
        maxDiffPixelRatio: 0.02,
      })
    })
  })

  test.describe("Menu page", () => {
    test("matches baseline screenshot", async ({ page }) => {
      await page.goto("/burger-house/menu")
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(2000)
      await expect(page).toHaveSapshot("menu-page.png", {
        maxDiffPixelRatio: 0.02,
      })
    })
  })

  test.describe("Admin dashboard", () => {
    test.use({ storageState: "tests/.auth/admin.json" })

    test("matches baseline screenshot", async ({ page }) => {
      await page.goto("/burger-house/admin")
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(3000)
      await expect(page).toHaveSapshot("admin-dashboard.png", {
        maxDiffPixelRatio: 0.02,
      })
    })
  })
})
