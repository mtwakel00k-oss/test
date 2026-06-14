import { test as setup, type Page } from "@playwright/test"
import path from "path"

const BASE = "http://localhost:3000"

const CREDENTIALS = {
  admin: { username: "admin", password: "Admin123", role: "admin" },
  cashier: { username: "cashier", password: "Cashier123", role: "cashier" },
  chef: { username: "chef", password: "Chef1234", role: "chef" },
}

async function loginAs(page: Page, { username, password, role }: { username: string; password: string; role: string }, storagePath: string) {
  await page.goto(`${BASE}/burger-house/login`)
  await page.waitForSelector(`[data-testid="role-tab-${role}"]`)
  await page.click(`[data-testid="role-tab-${role}"]`)
  await page.fill('[data-testid="username-input"]', username)
  await page.fill('[data-testid="password-input"]', password)
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL(/burger-house\/(pos|kitchen|admin)/, { timeout: 15000 })
  await page.context().storageState({ path: storagePath })
}

setup("authenticate as admin", async ({ page }) => {
  await loginAs(page, CREDENTIALS.admin, path.resolve("tests/.auth/admin.json"))
})

setup("authenticate as cashier", async ({ page }) => {
  await loginAs(page, CREDENTIALS.cashier, path.resolve("tests/.auth/cashier.json"))
})

setup("authenticate as chef", async ({ page }) => {
  await loginAs(page, CREDENTIALS.chef, path.resolve("tests/.auth/chef.json"))
})
