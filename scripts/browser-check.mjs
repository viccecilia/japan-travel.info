import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const root = process.cwd();
const output = path.join(root, "output", "ui-review");
fs.mkdirSync(output, { recursive: true });

let server;
let base = process.env.PLAYWRIGHT_BASE_URL || "";
if (!base) {
  server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!rel || rel.endsWith("/")) rel += "index.html";
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root)) return void res.writeHead(403).end("forbidden");
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return void res.writeHead(404).end("not found");
    const type = {
      ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8", ".json": "application/json",
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
      ".mp4": "video/mp4", ".mp3": "audio/mpeg"
    }[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}

const viewports = [
  { name: "mobile", width: 390, height: 844, mobile: true },
  { name: "tablet", width: 768, height: 1024, mobile: true },
  { name: "desktop", width: 1440, height: 1000, mobile: false }
];
const representative = [
  "/", "/zh-cn/", "/zh-cn/routes/", "/zh-cn/routes/kyoto-nara-classic/",
  "/zh-cn/spots/", "/zh-cn/spots/kyo-0001/", "/zh-cn/services/airport-transfer/",
  "/zh-cn/services/charter/", "/zh-cn/products/kix-osaka/",
  "/zh-cn/vehicles/", "/zh-cn/vehicles/alphard/", "/zh-cn/vip/", "/zh-cn/referral/",
  "/zh-cn/ambassador/", "/zh-cn/member/login/", "/zh-cn/member/register/",
  "/zh-cn/member/profile/", "/zh-cn/member/bookings/", "/zh-cn/faq/",
  "/zh-cn/contact/", "/zh-cn/privacy/", "/zh-cn/terms/",
  "/ja/", "/ja/contact/", "/en/spots/", "/ko/routes/", "/zh-tw/services/family/"
];
const screenshots = new Set([
  "/", "/zh-cn/", "/zh-cn/routes/kyoto-nara-classic/", "/zh-cn/spots/",
  "/zh-cn/spots/kyo-0001/", "/zh-cn/services/airport-transfer/", "/zh-cn/faq/",
  "/zh-cn/contact/", "/ja/contact/", "/zh-cn/member/profile/", "/en/spots/"
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch();
const consoleErrors = [];
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile
    });
    await context.addCookies([{ name: "jt_cookie_consent", value: "declined", domain: "127.0.0.1", path: "/" }]);
    for (const url of representative) {
      const page = await context.newPage();
      page.on("console", (msg) => {
        if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) {
          consoleErrors.push(`${viewport.name} ${url}: ${msg.text()}`);
        }
      });
      const response = await page.goto(base + url, { waitUntil: "domcontentloaded" });
      assert(response && response.status() < 400, `${viewport.name} ${url}: HTTP ${response?.status()}`);
      await page.locator(url === "/" ? "main.root-hero" : "#main-content").waitFor();

      const metrics = await page.evaluate(() => {
        const visible = (el) => !!el && getComputedStyle(el).visibility !== "hidden" && el.getBoundingClientRect().height > 0;
        const h1 = document.querySelector("h1");
        const header = document.querySelector(".site-header");
        const main = document.querySelector("#main-content") || document.querySelector("main");
        const controls = [...document.querySelectorAll("button, summary, input, select, textarea, a.btn")].filter(visible);
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          h1Visible: visible(h1), h1Size: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0,
          h1Context: h1?.closest(".root-hero,.hero,.detail-hero")?.className || "page",
          bodySize: parseFloat(getComputedStyle(document.body).fontSize),
          headerBottom: header?.getBoundingClientRect().bottom || 0,
          mainTop: main?.getBoundingClientRect().top || 0,
          smallControls: controls.filter((el) => {
            const r = el.getBoundingClientRect();
            if (el.matches('input[type="checkbox"], input[type="radio"]')) {
              const label = el.closest("label")?.getBoundingClientRect();
              return !label || label.width < 44 || label.height < 44;
            }
            return r.width < 44 || r.height < 44;
          }).map((el) => {
            const r = el.getBoundingClientRect();
            return `${el.tagName.toLowerCase()}[${(el.getAttribute("name") || el.className || el.textContent || "").toString().trim().slice(0,24)}] ${Math.round(r.width)}x${Math.round(r.height)}`;
          }),
          cards: [...document.querySelectorAll(".cards")].map((grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length),
          fixedNav: !!document.querySelector(".bottom-nav") && getComputedStyle(document.querySelector(".bottom-nav")).display !== "none"
        };
      });
      assert(metrics.overflow <= 1, `${viewport.name} ${url}: horizontal overflow ${metrics.overflow}px`);
      assert(metrics.h1Visible, `${viewport.name} ${url}: H1 missing or clipped`);
      assert(metrics.bodySize >= 16, `${viewport.name} ${url}: body text below 16px`);
      assert(metrics.mainTop >= metrics.headerBottom - 2, `${viewport.name} ${url}: header overlaps main content`);
      assert(metrics.smallControls.length === 0, `${viewport.name} ${url}: targets below 44px: ${metrics.smallControls.join(", ")}`);
      if (viewport.name === "desktop") {
        const desktopLimit = metrics.h1Context.includes("root-hero") ? 78 : metrics.h1Context.includes("hero") ? 72 : metrics.h1Context.includes("detail-hero") ? 60 : 52;
        assert(metrics.h1Size <= desktopLimit, `${url}: desktop H1 too large (${metrics.h1Size}px)`);
        assert(metrics.cards.every((n) => n <= 3), `${url}: desktop card grid exceeds 3 columns`);
      } else {
        const mobileLimit = viewport.name === "mobile" ? 44 : 54;
        assert(metrics.h1Size <= mobileLimit, `${viewport.name} ${url}: H1 too large (${metrics.h1Size}px)`);
        if (viewport.name === "mobile" && url !== "/") assert(metrics.fixedNav, `${viewport.name} ${url}: mobile bottom navigation missing`);
      }

      if (url.includes("/routes/") && !url.endsWith("/routes/")) {
        assert(await page.locator("audio").count() === 0, `${url}: route detail must not contain audio players`);
      }
      if (/\/spots\/[a-z]{3}-\d{4}\/$/.test(url)) {
        assert(await page.locator("audio").count() === 2, `${url}: spot detail must contain exactly two audio players`);
      }
      if (url.endsWith("/faq/")) {
        const item = page.locator(".faq-list details").first();
        await item.locator("summary").focus();
        await page.keyboard.press("Enter");
        assert(await item.evaluate((el) => el.open), `${url}: FAQ is not keyboard operable`);
      }
      if (url.endsWith("/contact/") || url.endsWith("/services/airport-transfer/")) {
        const invalid = await page.locator(".contact-form input, .contact-form select, .contact-form textarea").evaluateAll((controls) => controls.filter((control) => {
          const explicit = control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`);
          return !explicit && !control.closest("label") && control.type !== "hidden" && !control.classList.contains("hp");
        }).length);
        assert(invalid === 0, `${url}: form controls are not properly labelled`);
      }
      if (url.endsWith("/services/airport-transfer/")) {
        assert(await page.locator('#transport-inquiry form[action="/api/inquiry.php"]').count() === 1, `${url}: internal transport inquiry form missing`);
      }
      if (url.includes("/member/")) {
        assert(await page.locator("form").count() <= 1, `${url}: duplicate member forms detected`);
      }
      if (url === "/zh-cn/spots/") {
        await page.locator(".filter-panel .search").fill("清水寺");
        await page.waitForTimeout(50);
        assert(await page.locator(".spot-card:visible").count() === 1, `${url}: search did not narrow results`);
      }
      if (url === "/zh-cn/routes/") {
        const second = page.locator("[data-route-filter]").nth(1);
        await second.click();
        assert(await second.getAttribute("aria-pressed") === "true", `${url}: route filter is not operable`);
      }
      if (url === "/zh-cn/") {
        await page.locator(".lang-menu summary").click();
        const en = page.locator(".lang-popover a").filter({ hasText: "EN" });
        assert(await en.getAttribute("href") === "/en/", `${url}: language switch does not preserve page route`);
      }

      if (screenshots.has(url)) {
        const name = `${viewport.name}-${url === "/" ? "gateway" : url.replace(/^\/+|\/+$/g, "").replaceAll("/", "-")}.png`;
        await page.screenshot({ path: path.join(output, name), fullPage: true });
      }
      await page.close();
    }
    await context.close();
  }
  assert(consoleErrors.length === 0, `console errors:\n${consoleErrors.join("\n")}`);
  console.log(`OK browser check: ${representative.length} pages x ${viewports.length} viewports at ${base}`);
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
