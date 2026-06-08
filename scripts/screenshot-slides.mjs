import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const [, , htmlPath, screenshotsDir] = process.argv;

if (!htmlPath || !screenshotsDir) {
  console.error("Usage: node scripts/screenshot-slides.mjs <html> <screenshots-dir>");
  process.exit(1);
}

await fs.mkdir(screenshotsDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.resolve(htmlPath)).href);
await page.waitForLoadState("networkidle");
await page.addStyleTag({
  content: ".bespoke-marp-osc,.bespoke-progress-parent{display:none!important}"
});

const slides = await page.locator("svg.bespoke-marp-slide").count();
for (let index = 0; index < slides; index += 1) {
  await page.evaluate((slideNumber) => {
    window.location.hash = `#${slideNumber}`;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, index + 1);
  const activeSlide = page.locator("svg.bespoke-marp-slide.bespoke-marp-active");
  await activeSlide.waitFor({ state: "visible" });
  await activeSlide.screenshot({ path: path.join(screenshotsDir, `slide-${String(index + 1).padStart(2, "0")}.png`) });
}

await browser.close();
