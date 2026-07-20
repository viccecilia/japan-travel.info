import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

let server;
let base = process.env.PLAYWRIGHT_BASE_URL || "";
if (!base) {
  server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!rel || rel.endsWith("/")) rel += "index.html";
    const file = path.normalize(path.join(process.cwd(), rel));
    if (!file.startsWith(process.cwd())) {
      res.writeHead(403); res.end("forbidden"); return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end("not found"); return;
    }
    const ext = path.extname(file).toLowerCase();
    const type = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".mp3": "audio/mpeg" }[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
const pages = [
  ["/zh-cn/", "森有静之气"],
  ["/zh-cn/spots/kyo-0001/", "清水寺"],
  ["/zh-cn/products/kix-osaka/", "KIX"],
  ["/zh-cn/contact/", "定制咨询"],
  ["/zh-cn/member/login/", "登录"],
  ["/zh-tw/", "森有靜之氣"],
  ["/zh-tw/spots/kyo-0001/", "清水寺"],
  ["/zh-tw/services/airport-transfer/", "機場"],
  ["/zh-tw/faq/", "FAQ"],
  ["/ja/", "森に息づき"],
  ["/ja/spots/kyo-0001/", "清水寺"],
  ["/ja/vehicles/alphard/", "Alphard"],
  ["/ja/contact/", "カスタム相談"],
  ["/en/", "Still forests"],
  ["/en/spots/kyo-0001/", "Kiyomizu"],
  ["/en/services/airport-transfer/", "Airport"],
  ["/en/faq/", "FAQ"],
  ["/ko/", "고요한 숲"],
  ["/ko/spots/kyo-0001/", "기요미즈데라"],
  ["/ko/services/airport-transfer/", "공항"],
  ["/ko/member/register/", "Japan Travel 참여"],
  ["/en/routes/", "Popular"],
  ["/en/routes/kyoto-nara-classic/", "Kyoto"],
  ["/en/spots/", "Kansai"],
  ["/en/products/", "Rezio"],
  ["/en/vip/", "VIP"],
  ["/en/referral/", "Referral"],
  ["/en/404/", "404"],
  ["/go/rezio/not-configured/", "Rezio link unavailable"]
];fs.mkdirSync(path.join(process.cwd(), "output/playwright"), { recursive: true });
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
if (server) await new Promise((resolve) => server.close(resolve));
if (errors.length) throw new Error(`console errors:\n${errors.join("\n")}`);
console.log(`OK browser check: ${pages.length} pages at ${base}`);
