import { test as setup, type Page } from "@playwright/test"
import path from "path"
import fs from "fs"

const BASE = "http://localhost:3000"

async function tryLogin(page: Page, role: string, storagePath: string) {
  const tries = [
    { username: role, password: `${role.charAt(0).toUpperCase()}${role.slice(1)}123` },
    { username: role, password: `${role.charAt(0).toUpperCase()}${role.slice(1)}1234` },
    { username: `admin`, password: `Admin123` },
    { username: `root`, password: `RootAdmin@123`, email: "root@root.app" },
  ]

  for (const cred of tries) {
    await page.goto(`${BASE}/burger-house/login`)
    await page.waitForSelector('[data-testid="role-tab-admin"], [data-testid="role-tab-cashier"]', { timeout: 10000 }).catch(() => {})
    // Click the right role tab
    const tab = page.locator(`[data-testid="role-tab-${role}"]`)
    if (await tab.isVisible()) await tab.click()
    await page.fill('[data-testid="username-input"]', cred.email || cred.username)
    await page.fill('[data-testid="password-input"]', cred.password)
    await page.click('[data-testid="login-submit"]')
    await page.waitForTimeout(1500)
    const error = page.locator("text=Invalid").or(page.locator("text=فشل")).or(page.locator("text=تعذر"))
    if (!(await error.isVisible().catch(() => true))) {
      await page.waitForURL(/burger-house\/(pos|kitchen|admin)/, { timeout: 10000 }).catch(() => {})
      await page.context().storageState({ path: storagePath })
      return
    }
  }
  fs.mkdirSync(path.dirname(storagePath), { recursive: true })
  fs.writeFileSync(storagePath, JSON.stringify({ cookies: [], origins: [] }))
}

setup("authenticate as admin", async ({ page }) => {
  await tryLogin(page, "admin", path.resolve("tests/.auth/admin.json"))
})

setup("authenticate as cashier", async ({ page }) => {
  await tryLogin(page, "cashier", path.resolve("tests/.auth/cashier.json"))
})

setup("authenticate as chef", async ({ page }) => {
  await tryLogin(page, "chef", path.resolve("tests/.auth/chef.json"))
})
