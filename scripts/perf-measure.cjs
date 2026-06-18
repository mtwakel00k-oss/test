const { chromium } = require("playwright");
const { writeFileSync } = require("fs");

const BASE = "http://localhost:3000";
const SLUG = "burger-house";
const URL = `${BASE}/${SLUG}/menu`;

async function measure() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ar",
  });

  const page = await context.newPage();
  const coldMetrics = {};

  const start = Date.now();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  coldMetrics.totalTime = Date.now() - start;

  coldMetrics.cold = await page.evaluate(() => {
    return new Promise((resolve) => {
      const nav = performance.getEntriesByType("navigation")[0];
      const paint = performance.getEntriesByType("paint");
      let lcpValue = null;
      try {
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          lcpValue = entries.length > 0 ? entries[entries.length - 1].startTime : null;
        });
        obs.observe({ type: "largest-contentful-paint", buffered: true });
      } catch (e) {}
      setTimeout(() => {
        resolve({
          ttfb: nav ? nav.responseStart - nav.requestStart : null,
          fcp: paint.find((p) => p.name === "first-contentful-paint")?.startTime ?? null,
          domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
          loadEvent: nav ? nav.loadEventEnd : null,
          lcp: lcpValue,
          transferSize: nav ? nav.transferSize : null,
        });
      }, 3000);
    });
  });

  coldMetrics.images = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    return {
      total: imgs.length,
      loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
      failed: imgs.filter((i) => !i.complete || i.naturalWidth === 0).length,
      sources: imgs.map((i) => ({
        src: (i.src || "").slice(0, 120),
        w: i.naturalWidth,
        h: i.naturalHeight,
        alt: (i.alt || "").slice(0, 40),
      })),
    };
  });

  const start2 = Date.now();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  coldMetrics.warmTime = Date.now() - start2;

  coldMetrics.warm = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint");
    return {
      ttfb: nav ? nav.responseStart - nav.requestStart : null,
      fcp: paint.find((p) => p.name === "first-contentful-paint")?.startTime ?? null,
      transferSize: nav ? nav.transferSize : null,
    };
  });

  await page.screenshot({
    path: "scripts/menu-screenshot.png",
    fullPage: true,
  });

  const requests = await page.evaluate(() => {
    const entries = performance.getEntriesByType("resource");
    const byType = {};
    let totalSize = 0;
    for (const e of entries) {
      const ext = (e.name.split(".").pop() || "other").split("?")[0];
      if (!byType[ext]) byType[ext] = { count: 0, size: 0, time: 0 };
      byType[ext].count++;
      byType[ext].size += e.transferSize || 0;
      byType[ext].time += e.duration || 0;
      totalSize += e.transferSize || 0;
    }
    return { byType, totalSize };
  });
  coldMetrics.network = requests;

  coldMetrics.jsBundles = await page.evaluate(() => {
    const entries = performance.getEntriesByType("resource");
    return entries
      .filter((e) => e.name.endsWith(".js") || e.name.includes("/_next/static/chunks/"))
      .map((e) => ({
        name: e.name.split("/").pop(),
        size: e.transferSize,
        duration: e.duration,
      }))
      .sort((a, b) => (b.size || 0) - (a.size || 0));
  });

  await browser.close();
  return coldMetrics;
}

measure()
  .then((m) => {
    const report = JSON.stringify(m, null, 2);
    writeFileSync("scripts/perf-report.json", report);
    console.log(report);
  })
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });
