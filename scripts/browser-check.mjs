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
  { name: "wide", width: 2048, height: 1000, mobile: false, desktop: true },
  { name: "desktop", width: 1440, height: 1000, mobile: false, desktop: true },
  { name: "tablet", width: 1024, height: 768, mobile: true, desktop: false },
  { name: "mobile", width: 390, height: 844, mobile: true, desktop: false }
];
const representative = [
  "/", "/zh-cn/", "/zh-cn/routes/", "/zh-cn/routes/kyoto-nara-classic/",
  "/zh-cn/spots/", "/zh-cn/spots/kyo-0001/", "/zh-cn/services/airport-transfer/",
  "/zh-cn/services/charter/", "/zh-cn/products/kix-osaka/",
  "/zh-cn/vehicles/", "/zh-cn/vehicles/alphard/", "/zh-cn/vip/", "/zh-cn/referral/",
  "/zh-cn/ambassador/", "/zh-cn/member/login/", "/zh-cn/member/register/",
  "/zh-cn/member/profile/", "/zh-cn/member/bookings/", "/zh-cn/faq/",
  "/zh-cn/contact/", "/zh-cn/privacy/", "/zh-cn/terms/",
  "/ja/", "/en/", "/ko/", "/zh-tw/", "/ja/contact/", "/en/spots/", "/ko/routes/", "/zh-tw/services/family/"
];
const screenshots = new Set([
  "/", "/zh-cn/", "/ja/", "/en/", "/ko/", "/zh-tw/", "/zh-cn/routes/kyoto-nara-classic/", "/zh-cn/spots/",
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
      const logo = page.locator(url === "/" ? ".root-brand-mark" : ".brand-logo");
      assert(await logo.count() === 1, `${viewport.name} ${url}: brand logo missing`);
      assert(await logo.evaluate((image) => image.complete && image.naturalWidth > 0), `${viewport.name} ${url}: brand logo failed to load`);
      if (url !== "/") {
        const footerLogo = page.locator(".footer-logo");
        assert(await footerLogo.count() === 1, `${viewport.name} ${url}: footer logo missing`);
        assert(await footerLogo.evaluate((image) => image.complete && image.naturalWidth > 0), `${viewport.name} ${url}: footer logo failed to load`);
      }

      const metrics = await page.evaluate(() => {
        const visible = (el) => !!el && getComputedStyle(el).visibility !== "hidden" && el.getBoundingClientRect().height > 0;
        const h1 = document.querySelector("h1");
        const header = document.querySelector(".topbar");
        const nav = document.querySelector(".topbar .nav");
        const brandLogo = document.querySelector(".brand-logo");
        const navLinks = document.querySelector(".nav-links");
        const mobileMenu = document.querySelector(".mobile-menu");
        const cta = document.querySelector(".nav-cta");
        const hero = document.querySelector("#main-content .hero");
        const main = document.querySelector("#main-content") || document.querySelector("main");
        const controls = [...document.querySelectorAll("button, summary, input, select, textarea, a.btn")].filter(visible);
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          h1Visible: visible(h1), h1Size: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0,
          h1Context: h1?.closest(".root-hero,.hero,.detail-hero")?.className || "page",
          bodySize: parseFloat(getComputedStyle(document.body).fontSize),
          headerBottom: header?.getBoundingClientRect().bottom || 0,
          headerHeight: header?.getBoundingClientRect().height || 0,
          navLeft: nav?.getBoundingClientRect().left || 0,
          navRight: nav?.getBoundingClientRect().right || 0,
          logoWidth: brandLogo?.getBoundingClientRect().width || 0,
          logoHeight: brandLogo?.getBoundingClientRect().height || 0,
          logoBackground: brandLogo ? getComputedStyle(brandLogo).backgroundColor : "",
          navLinksVisible: visible(navLinks),
          mobileMenuVisible: visible(mobileMenu),
          ctaVisible: visible(cta),
          ctaHeight: cta?.getBoundingClientRect().height || 0,
          ctaWhiteSpace: cta ? getComputedStyle(cta).whiteSpace : "",
          heroHeight: hero?.getBoundingClientRect().height || 0,
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
      if (url !== "/") {
        const expectedHeaderHeight = viewport.name === "mobile" ? 68 : 76;
        assert(metrics.headerHeight >= expectedHeaderHeight - 1 && metrics.headerHeight <= 84, `${viewport.name} ${url}: header height ${metrics.headerHeight}px`);
        assert(metrics.logoWidth > 0 && metrics.logoWidth <= 260, `${viewport.name} ${url}: logo width ${metrics.logoWidth}px`);
        assert(metrics.logoHeight <= 58, `${viewport.name} ${url}: logo height ${metrics.logoHeight}px`);
        assert(metrics.logoBackground === "rgba(0, 0, 0, 0)", `${viewport.name} ${url}: logo background is not transparent`);
        const sideInset = viewport.name === "mobile" ? 12 : 24;
        assert(metrics.navLeft >= sideInset - 1 && metrics.navRight <= viewport.width - sideInset + 1, `${viewport.name} ${url}: header content touches viewport edge`);
        if (viewport.width >= 1200) {
          assert(metrics.navLinksVisible && !metrics.mobileMenuVisible, `${viewport.name} ${url}: desktop navigation mode is incorrect`);
          assert(metrics.logoWidth >= 210, `${viewport.name} ${url}: desktop logo is too small`);
        } else {
          assert(!metrics.navLinksVisible && metrics.mobileMenuVisible, `${viewport.name} ${url}: hamburger navigation mode is incorrect`);
        }
        if (metrics.ctaVisible) {
          assert(metrics.ctaHeight <= 44.5, `${viewport.name} ${url}: CTA is taller than 44px`);
          assert(metrics.ctaWhiteSpace === "nowrap", `${viewport.name} ${url}: CTA can wrap`);
        }
        if (/^\/(?:ja|en|zh-cn|zh-tw|ko)\/$/.test(url)) {
          assert(metrics.heroHeight >= Math.min(520, viewport.height * .64), `${viewport.name} ${url}: home hero no longer dominates the first screen`);
        }
      }
      if (viewport.desktop) {
        const desktopLimit = metrics.h1Context.includes("root-hero") ? 78 : metrics.h1Context.includes("hero") ? 72 : metrics.h1Context.includes("detail-hero") ? 60 : 52;
        assert(metrics.h1Size <= desktopLimit, `${url}: desktop H1 too large (${metrics.h1Size}px)`);
        assert(metrics.cards.every((n) => n <= 3), `${url}: desktop card grid exceeds 3 columns`);
      } else {
        const mobileLimit = viewport.name === "mobile" ? 44 : 64;
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
        const vehicle = page.locator("[data-vehicle-picker]");
        assert(await vehicle.count() === 1, `${url}: vehicle recommendation picker missing`);
        const selector = vehicle.locator("select[name='vehicle_preference']");
        assert(await selector.locator("option").count() === 4, `${url}: vehicle recommendation choices incomplete`);
        await selector.selectOption("alphard");
        assert((await vehicle.locator("[data-vehicle-people]").textContent() || "").includes("1"), `${url}: Alphard passenger guidance did not update`);
        assert((await vehicle.locator("[data-vehicle-luggage]").textContent() || "").includes("2"), `${url}: Alphard luggage guidance did not update`);
        await page.locator("[name='passenger_count']").fill("6");
        assert(await vehicle.locator("[data-vehicle-warning]").isVisible(), `${url}: over-capacity warning did not appear`);
        await selector.selectOption("hiace");
        assert(!(await vehicle.locator("[data-vehicle-warning]").isVisible()), `${url}: suitable vehicle still shows an over-capacity warning`);
      }
      if (/\/(?:ja|en|zh-cn|zh-tw|ko)\/$/.test(url)) {
        assert(await page.locator("main .service-grid + .boundary").count() === 0, `${url}: redundant service boundary remains on home page`);
        assert(await page.locator("main .product-card").count() === 0, `${url}: booking guide cards must remain hidden until Rezio is connected`);
        assert(await page.locator("main .home-cta .home-cta-actions").count() === 1, `${url}: centered home CTA layout missing`);
        assert((await page.locator(".nav-cta").getAttribute("href")) === `/${url.split("/")[1]}/services/airport-transfer/#transport-inquiry`, `${url}: consultation CTA does not target the merged transport page`);
        const spotActions = page.locator("main .spot-card .card-actions");
        assert(await spotActions.count() > 0, `${url}: compact spot card actions missing`);
        assert(await spotActions.count() === await page.locator("main .spot-card .card-enter").count(), `${url}: spot card entry control missing`);
        if (viewport.desktop) {
          const firstRowBottoms = await spotActions.evaluateAll((items) => items.slice(0, 3).map((item) => Math.round(item.getBoundingClientRect().bottom)));
          assert(Math.max(...firstRowBottoms) - Math.min(...firstRowBottoms) <= 2, `${url}: first-row spot card actions are not bottom-aligned`);
        }
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
        await page.locator(".lang-menu").evaluate((menu) => menu.removeAttribute("open"));
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
