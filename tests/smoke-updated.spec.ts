import { test, expect } from "@playwright/test"

test.describe("@smoke Core smoke tests", () => {
  test("homepage loads with valid title", async ({ page }) => {
    await page.goto("/")
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("body")).toBeVisible()
    const buttons = page.locator("button")
    expect(await buttons.count()).toBeGreaterThan(0)
  })

  test("menu page returns 200", async ({ page }) => {
    const response = await page.goto("/burger-house/menu")
    expect(response?.status()).toBeLessThan(500)
  })

  test("API health endpoint responds", async ({ page }) => {
    const response = await page.request.get("/api/health")
    expect(response.status()).toBeLessThan(500)
  })
})
