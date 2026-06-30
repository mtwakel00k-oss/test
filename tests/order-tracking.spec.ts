import { test, expect } from "@playwright/test"

test.describe("Order Tracking — Customer Order Flow", () => {
  test("order page loads for orders", async ({ page }) => {
    const response = await page.goto("/order/new", { timeout: 15000 })
    await page.waitForLoadState("networkidle", { timeout: 15000 })
    expect(response?.status() ?? 200).toBeLessThan(500)
  })

  test("tracking page loads without crashing", async ({ page }) => {
    const response = await page.goto("/burger-house/order/demo", { timeout: 15000 })
    await page.waitForLoadState("networkidle", { timeout: 15000 })
    expect(response?.status() ?? 200).toBe(200)
  })
})
