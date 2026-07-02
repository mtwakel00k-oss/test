import { chromium } from "@playwright/test";
import { readFileSync } from "fs";

const BASE = "supabase/migrations";
const SS_DIR = "C:\\Users\\barke\\AppData\\Local\\Temp\\opencode";

async function applyMigration(fileName) {
  const sql = readFileSync(`${BASE}/${fileName}`, "utf8");
  console.log(`Applying ${fileName} (${sql.length} chars)...`);

  const browser = await chromium.launch({
    channel: "msedge",
    headless: false,
    args: ["--no-sandbox"],
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(
    "https://supabase.com/dashboard/project/zordvqqjnlmxgtbkrspp/sql/new",
    { waitUntil: "domcontentloaded", timeout: 60000 }
  );
  await page.waitForTimeout(5000);

  const url = page.url();
  console.log(`URL: ${url}`);
  if (url.includes("sign-in")) {
    console.log("NOT LOGGED IN - need Supabase credentials");
    await page.screenshot({ path: `${SS_DIR}/login-screen.png` });
    await browser.close();
    return false;
  }

  // Try CM6 editor
  const editor = page.locator(".cm-editor .cm-content");
  try {
    await editor.waitFor({ state: "visible", timeout: 8000 });
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.waitForTimeout(200);
    await page.keyboard.type(sql, { delay: 0 });
  } catch {
    console.log("CM editor not found, trying textarea...");
    try {
      const ta = page.locator("textarea");
      await ta.first().waitFor({ state: "visible", timeout: 5000 });
      await ta.first().click();
      await page.keyboard.press("Control+A");
      await page.keyboard.type(sql, { delay: 0 });
    } catch {
      console.log("No editor found");
      await page.screenshot({ path: `${SS_DIR}/no-editor.png` });
      await browser.close();
      return false;
    }
  }

  await page.waitForTimeout(300);

  try {
    const runBtn = page.locator('button:has-text("Run")');
    await runBtn.waitFor({ state: "visible", timeout: 3000 });
    await runBtn.click();
  } catch {
    await page.keyboard.press("Control+Enter");
  }

  await page.waitForTimeout(10000);
  await page.screenshot({ path: `${SS_DIR}/${fileName.replace(".sql", ".png")}` });
  console.log(`Screenshot saved for ${fileName}`);
  await browser.close();
  return true;
}

const ok1 = await applyMigration("00005_lockdown_rls.sql");
if (ok1) {
  await applyMigration("00006_audit_log_v2.sql");
}
console.log("ALL DONE");
