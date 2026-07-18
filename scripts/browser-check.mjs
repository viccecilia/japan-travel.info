import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.SITE_BASE_URL || "http://127.0.0.1:8898";
const outDir = path.join(process.cwd(), "output/playwright");
fs.mkdirSync(outDir, { recursive: true });

const pages = [
  { path: "/", name: "home", must: ["Japan Travel 由株式会社大寅／Daitora Group 运营", "グループ全体で約100台規模の車両ネットワーク", "Rezio"], minImages: 1, minVideos: 1 },
  { path: "/h5/routes/kyoto-nara-classic/", name: "route", must: ["京都奈良", "Rezio"], minImages: 1, minAudio: 2 },
  { path: "/spots/nar-0003/", name: "spot", must: ["春日大社"], minImages: 1, minAudio: 2 },
  { path: "/member/", name: "member", must: ["Japan Travel", "接口尚未配置"], minImages: 0 },
  { path: "/products/", name: "products", must: ["Rezio", "预约跳转"], minImages: 0 }
];

const errors = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });

for (const item of pages) {
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  const response = await page.goto(`${base}${item.path}`, { waitUntil: "networkidle" });
  if (!response || response.status() >= 400) errors.push(`${item.name}: HTTP ${response?.status()}`);
  const text = await page.locator("body").innerText();
  for (const must of item.must) {
    if (!text.includes(must)) errors.push(`${item.name}: missing "${must}"`);
  }
  const counts = await page.evaluate(() => ({
    images: Array.from(document.images).filter((img) => img.complete && img.naturalWidth > 0).length,
    videos: document.querySelectorAll("video").length,
    audio: document.querySelectorAll("audio").length
  }));
  if (counts.images < (item.minImages || 0)) errors.push(`${item.name}: expected images >= ${item.minImages}, got ${counts.images}`);
  if (counts.videos < (item.minVideos || 0)) errors.push(`${item.name}: expected videos >= ${item.minVideos}, got ${counts.videos}`);
  if (counts.audio < (item.minAudio || 0)) errors.push(`${item.name}: expected audio >= ${item.minAudio}, got ${counts.audio}`);
  if (consoleErrors.length) errors.push(`${item.name}: console errors ${consoleErrors.join(" | ")}`);
  await page.screenshot({ path: path.join(outDir, `${item.name}.png`), fullPage: true });
  await page.close();
}

await browser.close();

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`OK browser check: ${pages.length} pages at ${base}`);
