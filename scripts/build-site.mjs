import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const content = JSON.parse(fs.readFileSync(path.join(root, "src/content.json"), "utf8"));
const brand = JSON.parse(fs.readFileSync(path.join(root, "src/facts/brand.json"), "utf8"));
const faq = JSON.parse(fs.readFileSync(path.join(root, "src/facts/faq.json"), "utf8"));

const langs = [
  { key: "zh", slug: "zh-cn", html: "zh-CN", label: "CN", name: "简体中文" },
  { key: "zhHant", slug: "zh-tw", html: "zh-Hant", label: "繁", name: "繁體中文" },
  { key: "ja", slug: "ja", html: "ja", label: "JP", name: "日本語" },
  { key: "en", slug: "en", html: "en", label: "EN", name: "English" },
  { key: "ko", slug: "ko", html: "ko", label: "KR", name: "한국어" }
];
const langByKey = new Map(langs.map((l) => [l.key, l]));
const siteUrl = (process.env.SITE_URL || "https://japan-travel.info").replace(/\/$/, "");
const generated = new Set();
const publicPages = [];

const label = {
  zh: {
    home: "首页", routes: "一日路线", spots: "景点", services: "交通服务", products: "预约导引", faq: "FAQ", about: "运营主体", contact: "咨询",
    heroTitle: "森有静之气，海有远之意，古都有余音。",
    heroLead: "把关西的海、森林、古都、湖景和温泉整理成清晰的旅行资料。公开内容可直接浏览，收藏、VIP和推荐功能登录后使用。",
    routesTitle: "热门一日路线", spotsTitle: "关西景点资料库", servicesTitle: "关西交通服务", productsTitle: "Rezio预约导引",
    view: "查看详情", rezio: "前往Rezio", consult: "定制咨询", search: "搜索景点、城市或标签", allArea: "全部地区",
    standard: "标准讲解", classic: "Classic讲解", nearby: "附近景点", relatedRoutes: "相关路线",
    source: "资料来源", unavailable: "该预约入口尚未配置，请使用咨询表单联系确认。", noLogin: "公开内容无需登录。",
    formTitle: "定制咨询", formLead: "提交后我们只表示已收到咨询，尚未确认预约。价格、库存、日期和取消规则以Rezio商品及最终预约确认为准。",
    memberLead: "会员功能用于收藏、偏好、VIP和推荐记录。公开内容与Rezio预约导引无需登录。",
    bookingBoundary: "车型、司机及个性化用品将根据预约时间、车辆情况和运营条件优先协调，具体安排以预约确认为准。",
    rezioBoundary: "价格、库存、日期和取消规则以Rezio对应商品及最终预约确认为准。"
  },
  zhHant: {
    home: "首頁", routes: "一日路線", spots: "景點", services: "交通服務", products: "預約導引", faq: "FAQ", about: "營運主體", contact: "諮詢",
    heroTitle: "森有靜之氣，海有遠之意，古都有餘音。",
    heroLead: "把關西的海、森林、古都、湖景與溫泉整理成清楚的旅行資料。公開內容可直接瀏覽，收藏、VIP與推薦功能登入後使用。",
    routesTitle: "熱門一日路線", spotsTitle: "關西景點資料庫", servicesTitle: "關西交通服務", productsTitle: "Rezio 預約導引",
    view: "查看詳情", rezio: "前往 Rezio", consult: "客製諮詢", search: "搜尋景點、城市或標籤", allArea: "全部地區",
    standard: "標準講解", classic: "Classic 講解", nearby: "附近景點", relatedRoutes: "相關路線",
    source: "資料來源", unavailable: "此預約入口尚未設定，請使用諮詢表單聯絡確認。", noLogin: "公開內容無需登入。",
    formTitle: "客製諮詢", formLead: "送出後僅代表已收到諮詢，尚未確認預約。價格、庫存、日期與取消規則以 Rezio 商品及最終預約確認為準。",
    memberLead: "會員功能用於收藏、偏好、VIP 與推薦記錄。公開內容與 Rezio 預約導引無需登入。",
    bookingBoundary: "車型、司機及個人化用品會依預約時間、車輛狀況與營運條件優先協調，具體安排以預約確認為準。",
    rezioBoundary: "價格、庫存、日期與取消規則以 Rezio 對應商品及最終預約確認為準。"
  },
  ja: {
    home: "ホーム", routes: "日帰りルート", spots: "スポット", services: "送迎サービス", products: "予約案内", faq: "FAQ", about: "運営主体", contact: "相談",
    heroTitle: "森に息づき、海にひらき、古都に還る。",
    heroLead: "関西の海、森、古都、湖、温泉を、出発前に読みやすい旅行資料として整理しています。公開コンテンツはログインなしで閲覧できます。",
    routesTitle: "人気の日帰りルート", spotsTitle: "関西スポット資料庫", servicesTitle: "関西送迎サービス", productsTitle: "Rezio予約案内",
    view: "詳しく見る", rezio: "Rezioへ", consult: "相談する", search: "スポット、都市、タグを検索", allArea: "全エリア",
    standard: "標準ガイド", classic: "Classicガイド", nearby: "近くのスポット", relatedRoutes: "関連ルート",
    source: "参照元", unavailable: "この予約入口は未設定です。相談フォームからお問い合わせください。", noLogin: "公開コンテンツはログイン不要です。",
    formTitle: "カスタム相談", formLead: "送信後は相談受付であり、予約確定ではありません。料金、在庫、日付、取消規定はRezio商品と最終確認が基準です。",
    memberLead: "会員機能は保存、好み、VIP、紹介記録に使います。公開コンテンツとRezio案内はログイン不要です。",
    bookingBoundary: "車種、ドライバー、個別用品は予約時間、車両状況、運行条件に基づき優先調整し、具体的な手配は予約確認が基準です。",
    rezioBoundary: "料金、在庫、日付、取消規定はRezioの該当商品および最終予約確認が基準です。"
  },
  en: {
    home: "Home", routes: "Day Routes", spots: "Spots", services: "Transfers", products: "Booking Guide", faq: "FAQ", about: "About", contact: "Contact",
    heroTitle: "Still forests, open seas, and echoes of old capitals.",
    heroLead: "A clear Kansai travel guide for seasides, forests, old capitals, lakes and hot springs. Public pages are open; favorites, VIP and referrals require sign-in.",
    routesTitle: "Popular Day Routes", spotsTitle: "Kansai Spot Library", servicesTitle: "Kansai Transfer Services", productsTitle: "Rezio Booking Guide",
    view: "View Details", rezio: "Open Rezio", consult: "Custom Inquiry", search: "Search spots, cities or tags", allArea: "All Areas",
    standard: "Standard Audio", classic: "Classic Audio", nearby: "Nearby Spots", relatedRoutes: "Related Routes",
    source: "Source", unavailable: "This booking link is not configured yet. Please use the inquiry form.", noLogin: "Public content does not require sign-in.",
    formTitle: "Custom Inquiry", formLead: "Submission means we received your inquiry; it is not a confirmed reservation. Prices, inventory, dates and cancellation rules follow Rezio and final confirmation.",
    memberLead: "Member features support favorites, preferences, VIP and referrals. Public content and Rezio booking guidance do not require sign-in.",
    bookingBoundary: "Vehicle type, driver and personalized items are coordinated according to reservation time, vehicle availability and operation conditions. Final arrangements follow booking confirmation.",
    rezioBoundary: "Prices, inventory, dates and cancellation rules follow the relevant Rezio product and final booking confirmation."
  },
  ko: {
    home: "홈", routes: "당일 코스", spots: "스팟", services: "전용 차량", products: "예약 안내", faq: "FAQ", about: "운영 주체", contact: "문의",
    heroTitle: "숲은 고요하고, 바다는 멀리 열리며, 고도에는 여운이 남습니다.",
    heroLead: "간사이의 바다, 숲, 고도, 호수와 온천을 여행 전 읽기 좋은 자료로 정리했습니다. 공개 콘텐츠는 로그인 없이 볼 수 있습니다.",
    routesTitle: "인기 당일 코스", spotsTitle: "간사이 스팟 자료실", servicesTitle: "간사이 전용 차량 서비스", productsTitle: "Rezio 예약 안내",
    view: "자세히 보기", rezio: "Rezio로 이동", consult: "맞춤 문의", search: "스팟, 도시, 태그 검색", allArea: "전체 지역",
    standard: "표준 오디오", classic: "Classic 오디오", nearby: "주변 스팟", relatedRoutes: "관련 코스",
    source: "자료 출처", unavailable: "이 예약 링크는 아직 설정되지 않았습니다. 문의 양식을 이용해 주세요.", noLogin: "공개 콘텐츠는 로그인 없이 이용할 수 있습니다.",
    formTitle: "맞춤 문의", formLead: "제출은 문의 접수이며 예약 확정이 아닙니다. 가격, 재고, 날짜와 취소 규정은 Rezio 상품과 최종 확인을 기준으로 합니다.",
    memberLead: "회원 기능은 저장, 선호, VIP와 추천 기록에 사용됩니다. 공개 콘텐츠와 Rezio 안내는 로그인이 필요 없습니다.",
    bookingBoundary: "차종, 기사 및 개인화 용품은 예약 시간, 차량 상황과 운영 조건에 따라 우선 조율되며 구체적인 배정은 예약 확인을 기준으로 합니다.",
    rezioBoundary: "가격, 재고, 날짜와 취소 규정은 해당 Rezio 상품 및 최종 예약 확인을 기준으로 합니다."
  }
};

const regionLocal = {
  zh: { 大阪: "大阪", 京都: "京都", 奈良: "奈良", 兵库: "兵库", 滋贺: "滋贺", 和歌山: "和歌山", 三重: "三重" },
  zhHant: { 大阪: "大阪", 京都: "京都", 奈良: "奈良", 兵库: "兵庫", 滋贺: "滋賀", 和歌山: "和歌山", 三重: "三重" },
  ja: { 大阪: "大阪", 京都: "京都", 奈良: "奈良", 兵库: "兵庫", 滋贺: "滋賀", 和歌山: "和歌山", 三重: "三重" },
  en: { 大阪: "Osaka", 京都: "Kyoto", 奈良: "Nara", 兵库: "Hyogo", 滋贺: "Shiga", 和歌山: "Wakayama", 三重: "Mie" },
  ko: { 大阪: "오사카", 京都: "교토", 奈良: "나라", 兵库: "효고", 滋贺: "시가", 和歌山: "와카야마", 三重: "미에" }
};

const routeCopy = {
  zh: ["从大阪出发，把经典景点串成容易理解的一天。", "路线内容可直接浏览，预约与库存以Rezio最终确认为准。"],
  zhHant: ["從大阪出發，把經典景點串成容易理解的一天。", "路線內容可直接瀏覽，預約與庫存以 Rezio 最終確認為準。"],
  ja: ["大阪発で、定番スポットを一日で分かりやすくつなぎます。", "内容は自由に閲覧でき、予約と在庫はRezioの最終確認が基準です。"],
  en: ["Start from Osaka and connect signature Kansai stops into one clear day.", "Route content is open; booking and inventory follow final Rezio confirmation."],
  ko: ["오사카 출발 기준으로 간사이의 대표 스팟을 하루 코스로 연결합니다.", "코스 내용은 공개되어 있으며 예약과 재고는 Rezio 최종 확인을 기준으로 합니다."]
};

const servicePages = [
  { id: "airport-transfer", product: "kix-osaka", title: { zh: "机场接送服务", zhHant: "機場接送服務", ja: "空港送迎サービス", en: "Airport Transfer", ko: "공항 송영" } },
  { id: "charter", product: "charter-kansai", title: { zh: "关西包车服务", zhHant: "關西包車服務", ja: "関西貸切車サービス", en: "Kansai Private Charter", ko: "간사이 전용 차량" } },
  { id: "family", product: "family-transfer", title: { zh: "家庭与亲子用车", zhHant: "家庭與親子用車", ja: "家族旅行向け送迎", en: "Family Transfer", ko: "가족 여행 차량" } },
  { id: "business", product: "business-guest", title: { zh: "商务及来宾接待", zhHant: "商務及來賓接待", ja: "ビジネス・来賓対応", en: "Business Guest Transport", ko: "비즈니스 의전 차량" } }
];
const vehiclePages = [
  { id: "alphard", title: { zh: "Alphard车型", zhHant: "Alphard 車型", ja: "Alphard", en: "Alphard", ko: "알파드" } },
  { id: "hiace", title: { zh: "Hiace车型", zhHant: "Hiace 車型", ja: "Hiace", en: "Hiace", ko: "하이에이스" } }
];
const productPages = [
  { id: "kix-osaka", title: { zh: "KIX ⇄ 大阪预约导引", zhHant: "KIX ⇄ 大阪預約導引", ja: "KIX ⇄ 大阪 予約案内", en: "KIX ⇄ Osaka Booking Guide", ko: "KIX ⇄ 오사카 예약 안내" } },
  { id: "kix-kyoto", title: { zh: "KIX ⇄ 京都预约导引", zhHant: "KIX ⇄ 京都預約導引", ja: "KIX ⇄ 京都 予約案内", en: "KIX ⇄ Kyoto Booking Guide", ko: "KIX ⇄ 교토 예약 안내" } },
  { id: "kix-nara", title: { zh: "KIX ⇄ 奈良预约导引", zhHant: "KIX ⇄ 奈良預約導引", ja: "KIX ⇄ 奈良 予約案内", en: "KIX ⇄ Nara Booking Guide", ko: "KIX ⇄ 나라 예약 안내" } },
  { id: "kix-kobe", title: { zh: "KIX ⇄ 神户预约导引", zhHant: "KIX ⇄ 神戶預約導引", ja: "KIX ⇄ 神戸 予約案内", en: "KIX ⇄ Kobe Booking Guide", ko: "KIX ⇄ 고베 예약 안내" } }
];
const memberPages = ["login", "register", "verify-email", "reset-password", "profile", "favorites", "trips", "bookings", "vip", "referrals", "ambassador"];

function h(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function cleanAsset(value = "") {
  return String(value).replace(/\?.*$/, "");
}
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function writeFile(rel, data) {
  const file = path.join(root, rel);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, data, "utf8");
  generated.add(rel.replaceAll("\\", "/"));
}
function relUrl(lang, rest = "") {
  const clean = rest.replace(/^\/+|\/+$/g, "");
  return `/${lang.slug}/${clean ? `${clean}/` : ""}`;
}
function canonical(lang, rest = "") {
  return siteUrl + relUrl(lang, rest);
}
function data(lang) {
  return content[lang.key] || content.zh;
}
function spots(lang) {
  return data(lang).all_spots;
}
function routes(lang) {
  return data(lang).routes;
}
function spotById(lang, id) {
  return spots(lang).find((s) => s.id === id) || spots(langByKey.get("zh")).find((s) => s.id === id);
}
function routeById(lang, id) {
  return routes(lang).find((r) => r.id === id) || routes(langByKey.get("zh")).find((r) => r.id === id);
}
function imageForRoute(route, lang) {
  const spot = route.spots?.map((id) => spotById(lang, id)).find(Boolean);
  return cleanAsset(route.feature_media?.poster || spot?.image || "/kansai-assets/images/kyoto/kyo-0001-kiyomizu-dera-temple-cover.jpg");
}
function pageLangAlternates(rest = "") {
  return langs.map((l) => `<link rel="alternate" hreflang="${l.html}" href="${canonical(l, rest)}">`).join("\n  ") +
    `\n  <link rel="alternate" hreflang="x-default" href="${siteUrl}/">`;
}
function nav(lang) {
  const t = label[lang.key];
  const links = [
    [t.home, relUrl(lang)],
    [t.routes, relUrl(lang, "routes")],
    [t.spots, relUrl(lang, "spots")],
    [t.services, relUrl(lang, "services/airport-transfer")],
    [t.products, relUrl(lang, "products")],
    [t.contact, relUrl(lang, "contact")]
  ];
  return `<header class="topbar"><div class="wrap nav">
    <a class="brand" href="${relUrl(lang)}">Japan Travel<small>Operated by 株式会社大寅 / Daitora Group</small></a>
    <nav class="nav-links" aria-label="Main">${links.map(([n, u]) => `<a href="${u}">${h(n)}</a>`).join("")}</nav>
    <div class="lang" aria-label="Language">${langs.map((l) => `<a class="${l.key === lang.key ? "active" : ""}" href="${relUrl(l)}">${l.label}</a>`).join("")}</div>
  </div></header>`;
}
function footer(lang) {
  const t = label[lang.key];
  const social = ["instagramUrl", "tiktokUrl", "lineUrl"].map((key) => `<span data-social="${key}"></span>`).join("");
  return `<footer class="footer"><div class="wrap footer-grid">
    <div><strong>Japan Travel</strong><p>${h(brand.operated_by_text)}</p><p>${h(t.bookingBoundary)}</p></div>
    <div><strong>${h(t.services)}</strong><a href="${relUrl(lang, "services/airport-transfer")}">${h(servicePages[0].title[lang.key])}</a><a href="${relUrl(lang, "services/charter")}">${h(servicePages[1].title[lang.key])}</a></div>
    <div><strong>${h(t.faq)}</strong><a href="${relUrl(lang, "faq")}">FAQ</a><a href="${relUrl(lang, "privacy")}">Privacy Policy</a><a href="${relUrl(lang, "terms")}">Terms</a></div>
    <div><strong>Social</strong><div class="social-links">${social}</div></div>
  </div></footer>
  <nav class="bottom-nav" aria-label="Mobile">${[[t.home, relUrl(lang)], [t.routes, relUrl(lang, "routes")], [t.spots, relUrl(lang, "spots")], [t.contact, relUrl(lang, "contact")]].map(([n, u]) => `<a href="${u}">${h(n)}</a>`).join("")}</nav>`;
}
function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
}
function layout(lang, rest, meta, body, options = {}) {
  const title = `${meta.title || "Japan Travel"} (${lang.label})`;
  const description = `${meta.description || label[lang.key].heroLead} ${lang.name}.`;
  const noindex = options.noindex ? `<meta name="robots" content="noindex,follow">` : `<meta name="robots" content="index,follow">`;
  const ld = (options.ld || []).map(jsonLd).join("\n  ");
  return `<!doctype html>
<html lang="${lang.html}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${h(title)}</title>
  <meta name="description" content="${h(description)}">
  ${noindex}
  <link rel="canonical" href="${canonical(lang, rest)}">
  ${pageLangAlternates(rest)}
  <meta property="og:type" content="website">
  <meta property="og:title" content="${h(title)}">
  <meta property="og:description" content="${h(description)}">
  <meta property="og:url" content="${canonical(lang, rest)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/assets/css/site.css">
  <script defer src="/assets/js/site-config.js"></script>
  <script defer src="/assets/js/site-runtime.js"></script>
  ${ld}
</head>
<body data-page="${h(rest || "home")}" data-lang="${lang.slug}">
${nav(lang)}
${body}
${footer(lang)}
</body>
</html>`;
}
function breadcrumb(lang, items) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb">${items.map((it, i) => it.href ? `<a href="${it.href}">${h(it.name)}</a>` : `<span>${h(it.name)}</span>`).join("<span>/</span>")}</nav>`;
}
function card(routeOrSpot, img, href, text, chips = []) {
  return `<article class="card"><a href="${href}"><img src="${h(img)}" alt="${h(routeOrSpot.title || routeOrSpot.name)}" loading="lazy"></a><div class="card-body"><h3><a href="${href}">${h(routeOrSpot.title || routeOrSpot.name)}</a></h3><p>${h(text)}</p><div class="chips">${chips.slice(0, 4).map((c) => `<span>${h(c)}</span>`).join("")}</div></div></article>`;
}
function audioBlock(lang, spot) {
  const t = label[lang.key];
  return `<section class="panel"><h2>${h(t.standard)}</h2><audio controls preload="none" src="${h(cleanAsset(spot.audio))}"></audio><h2>${h(t.classic)}</h2><audio controls preload="none" src="${h(cleanAsset(spot.classic_audio))}"></audio></section>`;
}
function routeGrid(lang, limit) {
  return `<div class="grid cards">${routes(lang).slice(0, limit || 99).map((r) => card(r, imageForRoute(r, lang), relUrl(lang, `routes/${r.id}`), r.summary || routeCopy[lang.key][0], r.tags || [])).join("")}</div>`;
}
function spotGrid(lang, limit) {
  return `<div class="spot-tools"><input class="search" type="search" placeholder="${h(label[lang.key].search)}" aria-label="${h(label[lang.key].search)}"><div class="filters"><button data-filter="all">${h(label[lang.key].allArea)}</button>${Object.values(regionLocal[lang.key]).map((r) => `<button data-filter="${h(r)}">${h(r)}</button>`).join("")}</div></div>
  <div class="grid spot-grid">${spots(lang).slice(0, limit || 99).map((s) => {
    const reg = regionLocal[lang.key][s.region] || s.region;
    return `<a class="spot-tile" href="${relUrl(lang, `spots/${s.id}`)}" data-region="${h(reg)}" data-search="${h([s.name, s.city, reg, ...(s.tags || [])].join(" "))}"><img src="${h(cleanAsset(s.image))}" alt="${h(s.name)}" loading="lazy"><span>${h(s.name)}</span></a>`;
  }).join("")}</div>`;
}
function homePage(lang) {
  const t = label[lang.key];
  const body = `<main>
    <section class="hero">
      <video autoplay muted loop playsinline poster="/kansai-assets/images/nara/nar-0003-kasuga-taisha-shrine-cover.jpg"><source src="/kansai-assets/video/hero/sea_kansai_01_beach_only_42s.mp4" type="video/mp4"></video>
      <div class="hero-overlay wrap"><p class="eyebrow">Japan Travel</p><h1>${h(t.heroTitle)}</h1><p>${h(t.heroLead)}</p><div class="hero-actions"><a class="btn primary" href="${relUrl(lang, "routes")}">${h(t.routes)}</a><a class="btn" href="${relUrl(lang, "services/airport-transfer")}">${h(t.services)}</a></div></div>
    </section>
    <section class="wrap section"><h2>${h(t.servicesTitle)}</h2><div class="quick">${servicePages.map((s) => `<a href="${relUrl(lang, `services/${s.id}`)}"><strong>${h(s.title[lang.key])}</strong><span>${h(t.bookingBoundary)}</span></a>`).join("")}</div></section>
    <section class="wrap section"><h2>${h(t.routesTitle)}</h2>${routeGrid(lang, 5)}</section>
    <section class="wrap section"><h2>${h(t.spotsTitle)}</h2>${spotGrid(lang, 16)}<p><a class="btn primary" href="${relUrl(lang, "spots")}">${h(t.view)}</a></p></section>
  </main>`;
  return layout(lang, "", { title: `Japan Travel | ${t.heroTitle}`, description: t.heroLead }, body, { ld: baseLd(lang, "", "WebSite") });
}
function routesIndex(lang) {
  const t = label[lang.key];
  const body = `<main class="wrap page">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: t.routes }])}<h1>${h(t.routesTitle)}</h1><p class="lead">${h(routeCopy[lang.key][1])}</p>${routeGrid(lang)}</main>`;
  return layout(lang, "routes", { title: `${t.routesTitle} | Japan Travel`, description: routeCopy[lang.key][1] }, body, { ld: baseLd(lang, "routes", "CollectionPage") });
}
function routeDetail(lang, id) {
  const r = routeById(lang, id);
  const t = label[lang.key];
  const routeSpots = (r.spots || []).map((sid) => spotById(lang, sid)).filter(Boolean);
  const body = `<main>
    <section class="detail-hero" style="--hero:url('${h(imageForRoute(r, lang))}')"><div class="wrap">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: t.routes, href: relUrl(lang, "routes") }, { name: r.title }])}<h1>${h(r.title)}</h1><p>${h(r.summary || r.subtitle || routeCopy[lang.key][0])}</p><div class="chips">${(r.tags || []).map((x) => `<span>${h(x)}</span>`).join("")}</div></div></section>
    <section class="wrap page"><h2>${h(t.routes)}</h2><p>${h(r.detail || r.summary || "")}</p><p><strong>${h(r.duration || "")}</strong></p><div class="timeline">${(r.stops || []).map((s, i) => `<article><strong>${i + 1}. ${h(Array.isArray(s) ? s[0] : s)}</strong><p>${h(Array.isArray(s) ? `${s[1] || ""} ${s[2] || ""}` : "")}</p></article>`).join("")}</div>
    <h2>${h(t.spots)}</h2><div class="stack">${routeSpots.map((s) => `<article class="media-block"><img src="${h(cleanAsset(s.image))}" alt="${h(s.name)}" loading="lazy"><div><h3><a href="${relUrl(lang, `spots/${s.id}`)}">${h(s.name)}</a></h3><p>${h(s.intro || s.card_line || "")}</p>${audioBlock(lang, s)}</div></article>`).join("")}</div>
    <section class="panel"><h2>${h(t.rezio)}</h2><p>${h(t.rezioBoundary)}</p><a class="btn primary" href="/go/rezio/${h(r.id)}" data-server-rezio="${h(r.id)}">${h(t.rezio)}</a><a class="btn" href="${relUrl(lang, "contact")}">${h(t.consult)}</a></section></section>
  </main>`;
  return layout(lang, `routes/${id}`, { title: `${r.title} | Japan Travel`, description: r.summary || routeCopy[lang.key][0] }, body, { ld: [...baseLd(lang, `routes/${id}`, "Article"), faqLd(lang, 4)] });
}
function spotsIndex(lang) {
  const t = label[lang.key];
  const body = `<main class="wrap page">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: t.spots }])}<h1>${h(t.spotsTitle)}</h1><p class="lead">${h(t.noLogin)}</p>${spotGrid(lang)}</main>`;
  return layout(lang, "spots", { title: `${t.spotsTitle} | Japan Travel`, description: `${spots(lang).length} Kansai spots with text and audio guides.` }, body, { ld: baseLd(lang, "spots", "CollectionPage") });
}
function spotDetail(lang, id) {
  const s = spotById(lang, id);
  const t = label[lang.key];
  const related = routes(lang).filter((r) => (r.spots || []).includes(id));
  const near = spots(lang).filter((x) => x.id !== id && x.region === s.region).slice(0, 4);
  const sourceName = s.source_name || brand.default_source_name;
  const sourceUrl = s.source_url || brand.default_source_url;
  const body = `<main>
    <section class="detail-hero" style="--hero:url('${h(cleanAsset(s.image))}')"><div class="wrap">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: t.spots, href: relUrl(lang, "spots") }, { name: s.name }])}<h1>${h(s.name)}</h1><p>${h(s.card_line || "")}</p><div class="chips">${(s.tags || []).map((x) => `<span>${h(x)}</span>`).join("")}</div></div></section>
    <section class="wrap page"><p class="lead">${h(s.intro || "")}</p>${audioBlock(lang, s)}<section class="panel"><h2>${h(t.source)}</h2><p><a href="${h(sourceUrl)}" rel="nofollow noopener" target="_blank">${h(sourceName)}</a> · ${h(brand.last_reviewed_at)}</p></section>
    <h2>${h(t.relatedRoutes)}</h2><div class="grid cards">${related.map((r) => card(r, imageForRoute(r, lang), relUrl(lang, `routes/${r.id}`), r.summary || "", r.tags || [])).join("") || `<p>${h(t.unavailable)}</p>`}</div>
    <h2>${h(t.nearby)}</h2><div class="grid cards">${near.map((x) => card(x, cleanAsset(x.image), relUrl(lang, `spots/${x.id}`), x.card_line || "", x.tags || [])).join("")}</div></section>
  </main>`;
  return layout(lang, `spots/${id}`, { title: `${s.name} | Japan Travel`, description: `${s.name} (${s.city || s.region || id}): ${s.card_line || s.intro || ""}` }, body, { ld: [...baseLd(lang, `spots/${id}`, "TouristAttraction"), touristLd(lang, s)] });
}
function servicesIndex(lang, page) {
  const t = label[lang.key];
  const title = page.title[lang.key];
  const points = [t.bookingBoundary, t.rezioBoundary, brand.vehicle_network_text[lang.key], brand.service_area_text[lang.key]];
  const body = `<main class="wrap page">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: t.services, href: relUrl(lang, "services/airport-transfer") }, { name: title }])}<h1>${h(title)}</h1><p class="lead">${h(points[0])}</p>
    <div class="two-col"><section class="panel"><h2>${h(t.servicesTitle)}</h2><ul>${points.map((p) => `<li>${h(p)}</li>`).join("")}</ul><a class="btn primary" href="/go/rezio/${h(page.product)}">${h(t.rezio)}</a><a class="btn" href="${relUrl(lang, "contact")}">${h(t.consult)}</a></section>
    <section class="panel"><h2>FAQ</h2>${faq[lang.key].slice(0, 6).map((f) => `<details><summary>${h(f.q)}</summary><p>${h(f.a)}</p></details>`).join("")}</section></div>
    <h2>${h(t.relatedRoutes)}</h2>${routeGrid(lang, 3)}</main>`;
  return layout(lang, `services/${page.id}`, { title: `${title} | Japan Travel`, description: `${title}: ${points.join(" ")}` }, body, { ld: [...baseLd(lang, `services/${page.id}`, "Service"), faqLd(lang, 6)] });
}
function vehiclePage(lang, page) {
  const t = label[lang.key];
  const title = page.title[lang.key];
  const body = `<main class="wrap page">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: "Vehicles", href: relUrl(lang, "vehicles") }, { name: title }])}<h1>${h(title)}</h1><p class="lead">${h(t.bookingBoundary)}</p><div class="panel"><ul><li>${h(brand.vehicle_boundary[lang.key])}</li><li>${h(brand.luggage_boundary[lang.key])}</li><li>${h(t.rezioBoundary)}</li></ul><a class="btn primary" href="${relUrl(lang, "contact")}">${h(t.consult)}</a></div></main>`;
  return layout(lang, page.id === "index" ? "vehicles" : `vehicles/${page.id}`, { title: `${title} | Japan Travel`, description: `${title}: ${brand.vehicle_boundary?.[lang.key] || t.bookingBoundary} ${t.bookingBoundary}` }, body, { ld: baseLd(lang, page.id === "index" ? "vehicles" : `vehicles/${page.id}`, "WebPage") });
}
function productsIndex(lang, page) {
  const t = label[lang.key];
  if (!page) {
    const body = `<main class="wrap page"><h1>${h(t.productsTitle)}</h1><p class="lead">${h(t.rezioBoundary)}</p><div class="grid cards">${productPages.map((p) => card({ title: p.title[lang.key] }, "/kansai-assets/images/osaka/osa-0007-umeda-sky-building-floating-garden-observatory-cover.jpg", relUrl(lang, `products/${p.id}`), t.rezioBoundary, ["Rezio"])).join("")}</div></main>`;
    return layout(lang, "products", { title: `${t.productsTitle} | Japan Travel`, description: `${t.productsTitle}: ${t.rezioBoundary}` }, body, { ld: baseLd(lang, "products", "CollectionPage") });
  }
  const title = page.title[lang.key];
  const body = `<main class="wrap page"><h1>${h(title)}</h1><p class="lead">${h(t.rezioBoundary)}</p><section class="panel"><h2>Rezio</h2><p>${h(t.bookingBoundary)}</p><a class="btn primary" href="/go/rezio/${h(page.id)}">${h(t.rezio)}</a><a class="btn" href="${relUrl(lang, "contact")}">${h(t.consult)}</a></section>${routeGrid(lang, 2)}</main>`;
  return layout(lang, `products/${page.id}`, { title: `${title} | Japan Travel`, description: `${title}: ${t.rezioBoundary}` }, body, { ld: baseLd(lang, `products/${page.id}`, "WebPage") });
}
function faqPage(lang) {
  const t = label[lang.key];
  const body = `<main class="wrap page"><h1>FAQ</h1><div class="faq-list">${faq[lang.key].map((f) => `<article class="panel"><h2>${h(f.q)}</h2><p>${h(f.a)}</p></article>`).join("")}</div></main>`;
  return layout(lang, "faq", { title: `FAQ | Japan Travel`, description: faq[lang.key].slice(0, 3).map((x) => x.q).join(" / ") }, body, { ld: [...baseLd(lang, "faq", "FAQPage"), faqLd(lang, 32)] });
}
function contactPage(lang) {
  const t = label[lang.key];
  const body = `<main class="wrap page"><h1>${h(t.formTitle)}</h1><p class="lead">${h(t.formLead)}</p>${contactForm(lang)}</main>`;
  return layout(lang, "contact", { title: `${t.formTitle} | Japan Travel`, description: t.formLead }, body, { ld: baseLd(lang, "contact", "ContactPage") });
}
function contactForm(lang) {
  const t = label[lang.key];
  const fields = ["name", "email", "phone", "line_id", "wechat", "whatsapp", "service_type", "travel_date", "travel_time", "flight_number", "pickup_location", "dropoff_location", "passenger_count", "luggage_count", "vehicle_preference", "child_seat", "itinerary", "notes"];
  return `<form class="contact-form" method="post" action="/api/inquiry.php" data-enhanced-form>
    <input type="hidden" name="language" value="${h(lang.slug)}"><input type="hidden" name="source_url" value=""><input type="hidden" name="idempotency_key" value="">
    <input class="hp" name="website" tabindex="-1" autocomplete="off">
    <div class="form-grid">${fields.map((f) => `<label>${h(f.replaceAll("_", " "))}<input name="${h(f)}" ${f === "email" ? "type=\"email\" required" : f.includes("date") ? "type=\"date\"" : f.includes("time") ? "type=\"time\"" : ""} maxlength="500"></label>`).join("")}</div>
    <label class="check"><input type="checkbox" name="privacy_consent" value="1" required> Privacy consent</label>
    <button class="btn primary" type="submit">${h(t.consult)}</button><p class="form-status" data-form-status>${h(t.unavailable)}</p>
  </form>`;
}
function memberPage(lang, slug) {
  const t = label[lang.key];
  const memberTitles = {
    login: "Sign in",
    register: "Join Japan Travel",
    "verify-email": "Verify email",
    "reset-password": "Reset password",
    profile: "Member profile",
    favorites: "Favorites",
    trips: "Saved trips",
    bookings: "Booking references",
    vip: "VIP",
    referrals: "Referrals",
    ambassador: "Ambassador"
  };
  const title = memberTitles[slug] || slug;
  const actionMap = {
    favorites: "favorite-list",
    trips: "saved-trip-list",
    bookings: "booking-reference-list",
    vip: "vip-summary",
    referrals: "referral-summary",
    ambassador: "ambassador-apply"
  };
  const action = slug === "verify-email" ? "verify-email" : slug === "reset-password" ? "reset-password" : actionMap[slug] || slug;
  const emailField = ["register", "login", "reset-password"].includes(slug) ? `<label>Email<input name="email" type="email" autocomplete="email" required></label>` : "";
  const passwordField = ["register", "login"].includes(slug) ? `<label>Password<input name="password" type="password" autocomplete="${slug === "login" ? "current-password" : "new-password"}" ${slug === "register" ? "minlength=\"10\"" : ""} required></label>` : "";
  const resetTokenFields = slug === "reset-password" ? `<label>Reset token<input name="token" autocomplete="one-time-code"></label><label>New password<input name="new_password_display" type="password" autocomplete="new-password" minlength="10" oninput="this.form.password.value=this.value"></label><input type="hidden" name="password">` : "";
  const verifyTokenField = slug === "verify-email" ? `<label>Verification token<input name="token" autocomplete="one-time-code" required></label>` : "";
  const nicknameField = ["register", "profile"].includes(slug) ? `<label>Nickname<input name="nickname" maxlength="80" autocomplete="nickname"></label>` : "";
  const ambassadorField = slug === "ambassador" ? `<label>Message<textarea name="message" maxlength="2000"></textarea></label>` : "";
  const actionField = `<input type="hidden" name="action" value="${h(action)}">`;
  const body = `<main class="wrap page member-shell"><h1>${h(title)}</h1><p class="lead">${h(t.memberLead)}</p><section class="panel"><p>${h(t.noLogin)}</p><form class="member-form" method="post" action="/api/member.php" data-member-form>${actionField}<input type="hidden" name="language" value="${h(lang.slug)}">${emailField}${passwordField}${verifyTokenField}${resetTokenFields}${nicknameField}${ambassadorField}<button class="btn primary" type="submit">${h(title)}</button><p data-member-status>${h(t.unavailable)}</p></form></section></main>`;
  return layout(lang, `member/${slug}`, { title: `${title} | Japan Travel`, description: `${title}. ${t.memberLead}` }, body, { noindex: true, ld: baseLd(lang, `member/${slug}`, "WebPage") });
}
function infoPage(lang, slug) {
  const t = label[lang.key];
  const titles = {
    about: t.about,
    privacy: "Privacy Policy",
    terms: "Terms",
    vip: "VIP",
    referral: "Referral",
    ambassador: "Ambassador"
  };
  const body = `<main class="wrap page"><h1>${h(titles[slug])}</h1><div class="panel"><p>${h(brand.operated_by_text)}</p><p>${h(brand.vehicle_network_text[lang.key])}</p><p>${h(t.bookingBoundary)}</p><p>${h(t.rezioBoundary)}</p></div>${slug === "privacy" ? privacyText(lang) : ""}${slug === "terms" ? termsText(lang) : ""}${slug === "vip" ? vipText(lang) : ""}${slug === "referral" || slug === "ambassador" ? referralText(lang) : ""}</main>`;
  return layout(lang, slug, { title: `${titles[slug]} | Japan Travel`, description: `${titles[slug]}. ${brand.operated_by_text}. ${lang.name}.` }, body, { ld: baseLd(lang, slug, "WebPage") });
}
function privacyText(lang) {
  return `<section class="panel"><h2>Privacy</h2><p>${h(brand.privacy_summary[lang.key])}</p></section>`;
}
function termsText(lang) {
  return `<section class="panel"><h2>Terms</h2><p>${h(brand.terms_summary[lang.key])}</p></section>`;
}
function vipText(lang) {
  return `<section class="panel"><h2>VIP</h2><ul>${brand.vip_rules[lang.key].map((x) => `<li>${h(x)}</li>`).join("")}</ul></section>`;
}
function referralText(lang) {
  return `<section class="panel"><h2>Referral</h2><ul>${brand.referral_rules[lang.key].map((x) => `<li>${h(x)}</li>`).join("")}</ul></section>`;
}
function baseLd(lang, rest, type) {
  return [{
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Japan Travel",
    url: siteUrl,
    parentOrganization: { "@type": "Organization", name: "Daitora Group", url: brand.daitora_url }
  }, {
    "@context": "https://schema.org",
    "@type": type || "WebPage",
    name: "Japan Travel",
    url: canonical(lang, rest)
  }];
}
function faqLd(lang, count) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq[lang.key].slice(0, count).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}
function touristLd(lang, s) {
  return { "@context": "https://schema.org", "@type": "TouristAttraction", name: s.name, image: siteUrl + cleanAsset(s.image), url: canonical(lang, `spots/${s.id}`), address: `${s.city || ""} ${s.region || ""}` };
}
function rootPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Japan Travel</title><meta name="description" content="Choose your language for Japan Travel Kansai guide."><link rel="canonical" href="${siteUrl}/">${pageLangAlternates("")}<link rel="stylesheet" href="/assets/css/site.css"></head><body><main class="language-gate wrap"><h1>Japan Travel</h1><p>Operated by 株式会社大寅 / Daitora Group</p><div class="grid cards">${langs.map((l) => `<a class="card lang-card" href="${relUrl(l)}"><div class="card-body"><h2>${l.label}</h2><p>${h(l.name)}</p></div></a>`).join("")}</div></main></body></html>`;
}
function legacyPage(to) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="description" content="This old Japan Travel URL has moved to the new language directory structure."><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0; url=${h(to)}"><link rel="canonical" href="${siteUrl}${to}"><title>Japan Travel Page Moved</title></head><body><h1>Japan Travel Page Moved</h1><p><a href="${h(to)}">Continue to the new page</a></p></body></html>`;
}
function rezioFallbackPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,follow"><title>Rezio link unavailable</title><meta name="description" content="This Japan Travel Rezio product link is not configured yet. No reservation has been made."><link rel="canonical" href="${siteUrl}/go/rezio/not-configured/"><link rel="stylesheet" href="/assets/css/site.css"></head><body><main class="wrap page"><h1>Rezio link unavailable</h1><p class="lead">This booking product is not configured yet. No reservation has been made.</p><a class="btn primary" href="/en/contact/">Contact Japan Travel</a></main></body></html>`;
}
function notFound(lang) {
  return layout(lang, "404", { title: "404 | Japan Travel", description: "The requested Japan Travel page was not found." }, `<main class="wrap page"><h1>404</h1><p>Page not found.</p><a class="btn primary" href="${relUrl(lang)}">${h(label[lang.key].home)}</a></main>`, { noindex: true });
}
function buildConfig() {
  const cfg = {
    siteUrl,
    appEnv: process.env.APP_ENV || "production",
    instagramUrl: process.env.INSTAGRAM_URL || "",
    tiktokUrl: process.env.TIKTOK_URL || "",
    lineUrl: process.env.LINE_URL || "",
    analyticsEndpoint: process.env.ANALYTICS_ENDPOINT || "",
    metaPixelId: process.env.META_PIXEL_ID || "",
    tiktokPixelId: process.env.TIKTOK_PIXEL_ID || "",
    memberApiBase: process.env.MEMBER_API_BASE || "",
    rezioConfigured: Boolean(process.env.REZIO_DEFAULT_URL || process.env.REZIO_ROUTE_URLS_JSON || process.env.REZIO_PRODUCT_URLS_JSON)
  };
  writeFile("assets/js/site-config.js", `window.JAPAN_TRAVEL_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`);
}
function cleanGenerated() {
  for (const l of langs) fs.rmSync(path.join(root, l.slug), { recursive: true, force: true });
  for (const item of ["index-ja.html", "index-en.html", "index-ko.html", "index-zhHant.html", "h5", "spots", "member", "products", "vip", "referral", "ambassador"]) {
    fs.rmSync(path.join(root, item), { recursive: true, force: true });
  }
}
function writeLangPage(lang, rest, html) {
  writeFile(path.join(lang.slug, rest, "index.html"), html);
  publicPages.push({ lang, rest });
}
function build() {
  cleanGenerated();
  buildConfig();
  writeFile("index.html", rootPage());
  writeFile("h5/index.html", legacyPage("/zh-cn/"));
  writeFile("404.html", notFound(langs[0]));
  for (const lang of langs) {
    writeLangPage(lang, "", homePage(lang));
    writeLangPage(lang, "routes", routesIndex(lang));
    for (const r of routes(lang)) writeLangPage(lang, `routes/${r.id}`, routeDetail(lang, r.id));
    writeLangPage(lang, "spots", spotsIndex(lang));
    for (const s of spots(lang)) writeLangPage(lang, `spots/${s.id}`, spotDetail(lang, s.id));
    for (const p of servicePages) writeLangPage(lang, `services/${p.id}`, servicesIndex(lang, p));
    writeLangPage(lang, "vehicles", vehiclePage(lang, { id: "index", title: { [lang.key]: lang.key === "en" ? "Vehicle Guide" : "车型选择" } }));
    for (const p of vehiclePages) writeLangPage(lang, `vehicles/${p.id}`, vehiclePage(lang, p));
    writeLangPage(lang, "products", productsIndex(lang));
    for (const p of productPages) writeLangPage(lang, `products/${p.id}`, productsIndex(lang, p));
    writeLangPage(lang, "faq", faqPage(lang));
    writeLangPage(lang, "about", infoPage(lang, "about"));
    writeLangPage(lang, "contact", contactPage(lang));
    writeLangPage(lang, "privacy", infoPage(lang, "privacy"));
    writeLangPage(lang, "terms", infoPage(lang, "terms"));
    writeLangPage(lang, "vip", infoPage(lang, "vip"));
    writeLangPage(lang, "referral", infoPage(lang, "referral"));
    writeLangPage(lang, "ambassador", infoPage(lang, "ambassador"));
    writeLangPage(lang, "404", notFound(lang));
    for (const p of memberPages) writeLangPage(lang, `member/${p}`, memberPage(lang, p));
  }
  writeFile(path.join("go", "rezio", "not-configured", "index.html"), rezioFallbackPage());
  writeFile("robots.txt", `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /runtime/\nSitemap: ${siteUrl}/sitemap.xml\n`);
  writeFile("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicPages.filter((p) => !p.rest.startsWith("member/") && p.rest !== "404").map((p) => `  <url><loc>${canonical(p.lang, p.rest)}</loc></url>`).join("\n")}\n</urlset>\n`);
  writeFile(".htaccess", `DirectoryIndex index.html\nRewriteEngine On\nRewriteRule ^runtime/private/ - [F,L]\nRewriteRule ^h5/?$ /zh-cn/ [R=301,L]\nRewriteRule ^h5/routes/([^/]+)/?$ /zh-cn/routes/$1/ [R=301,L]\nRewriteRule ^spots/([^/]+)/?$ /zh-cn/spots/$1/ [R=301,L]\nRewriteRule ^go/rezio/([^/]+)/?$ /api/rezio.php?product_key=$1 [QSA,L]\n<FilesMatch "^(\\.env|.*\\.sqlite|.*\\.log)$">\n  Require all denied\n</FilesMatch>\n`);
  const manifest = { generatedAt: new Date().toISOString(), pages: publicPages.length + 3, sha: crypto.createHash("sha256").update([...generated].sort().join("\n")).digest("hex") };
  writeFile("src/generated-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Generated ${manifest.pages} html targets for ${langs.length} languages, ${spots(langs[0]).length} spots, ${routes(langs[0]).length} routes.`);
}

build();
