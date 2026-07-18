import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8898";
const pages = [
  ["/zh-cn/", "森有静之气"],
  ["/zh-cn/spots/kyo-0001/", "清水寺"],
  ["/zh-cn/products/kix-osaka/", "KIX"],
  ["/zh-cn/contact/", "定制咨询"],
  ["/zh-cn/member/login/", "Login"],
  ["/zh-tw/", "森有靜之氣"],
  ["/zh-tw/spots/kyo-0001/", "清水寺"],
  ["/zh-tw/services/airport-transfer/", "機場"],
  ["/zh-tw/faq/", "FAQ"],
  ["/ja/", "森に息づき"],
  ["/ja/spots/kyo-0001/", "清水寺"],
  ["/ja/vehicles/alphard/", "Alphard"],
  ["/ja/contact/", "カスタム"],
  ["/en/", "Still forests"],
  ["/en/spots/kyo-0001/", "Kiyomizu"],
  ["/en/services/airport-transfer/", "Airport"],
  ["/en/faq/", "FAQ"],
  ["/ko/", "숲은"],
  ["/ko/spots/kyo-0001/", "기요"],
  ["/ko/services/airport-transfer/", "공항"],
  ["/ko/member/register/", "Register"],
  ["/en/routes/", "Popular"],
  ["/en/routes/kyoto-nara-classic/", "Kyoto"],
  ["/en/spots/", "Kansai"],
  ["/en/products/", "Rezio"],
  ["/en/vip/", "VIP"],
  ["/en/referral/", "Referral"],
  ["/en/404/", "404"],
  ["/go/rezio/not-configured", "Rezio link unavailable"]
];

fs.mkdirSync(path.join(process.cwd(), "output/playwright"), { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const errors = [];
for (const [url, text] of pages) {
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${url}: ${msg.text()}`);
  });
  const res = await page.goto(base + url, { waitUntil: "networkidle" });
  if (!res || res.status() >= 500) throw new Error(`bad status ${url}: ${res?.status()}`);
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 5000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error(`horizontal overflow ${url}`);
  await page.screenshot({ path: path.join(process.cwd(), "output/playwright", url.replaceAll("/", "_") + ".png"), fullPage: false });
  await page.close();
}
await browser.close();
if (errors.length) throw new Error(`console errors:\n${errors.join("\n")}`);
console.log(`OK browser check: ${pages.length} pages at ${base}`);
