import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["html"],
    ["list"],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: "auth.setup.ts",
    },
    {
      name: "admin",
      dependencies: ["setup"],
      testMatch: "admin.spec.ts",
      use: {
        storageState: "tests/.auth/admin.json",
      },
    },
    {
      name: "cashier",
      dependencies: ["setup"],
      testMatch: "cashier.spec.ts",
      use: {
        storageState: "tests/.auth/cashier.json",
      },
    },
    {
      name: "chef",
      dependencies: ["setup"],
      testMatch: "chef.spec.ts",
      use: {
        storageState: "tests/.auth/chef.json",
      },
    },
    {
      name: "edge-cases",
      dependencies: ["setup"],
      testMatch: "edge-cases.spec.ts",
      use: {
        storageState: "tests/.auth/cashier.json",
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
