import { test, expect } from "@playwright/test"

test.describe("Ratings — Customer Rating Flow", () => {
  test("rating page loads if available", async ({ page }) => {
    const response = await page.goto("/burger-house/order/rating-demo")
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test("API ratings endpoint responds", async ({ page }) => {
    const response = await page.request.get("/api/ratings")
    expect(response.status()).toBeLessThan(500)
  })

  test("rating form submits", async ({ page }) => {
    const response = await page.request.post("/api/ratings", {
      data: { rating: 5, comment: "E2E test", slug: "burger-house" },
    })
    expect(response.status()).toBeLessThan(500)
  })
})
