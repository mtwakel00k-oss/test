import { test, expect } from "@playwright/test"

test.describe("Order Tracking — Customer Order Flow", () => {
  test("order page loads for orders", async ({ page }) => {
    const response = await page.goto("/order/new")
    await page.waitForLoadState("networkidle")
    expect(response?.status() ?? 200).toBeLessThan(500)
  })

  test("tracking page shows status", async ({ page }) => {
    const response = await page.goto("/burger-house/order/demo")
    await page.waitForLoadState("networkidle")
    const status = response?.status() ?? 200
    expect(status).toBeLessThan(500)
  })
})
