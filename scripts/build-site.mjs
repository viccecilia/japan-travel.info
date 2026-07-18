import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const content = JSON.parse(fs.readFileSync(path.join(root, "src/content.json"), "utf8"));

const langs = ["zh", "ja", "en", "ko", "zhHant"];
const langLabels = { zh: "简", ja: "JP", en: "EN", ko: "KR", zhHant: "繁" };
const langSuffix = { zh: "", ja: "-ja", en: "-en", ko: "-ko", zhHant: "-zhHant" };
const regionOrder = ["大阪", "京都", "奈良", "兵库", "滋贺", "和歌山", "三重"];

const ui = {
  zh: {
    home: "首页", routes: "一日路线", spots: "景点资料", products: "交通服务", member: "加入", vip: "VIP", referral: "推荐",
    eyebrow: "Japan Travel · Kansai Guide", heroTitle: "森有静之气，海有远之意，古都有余音。",
    heroLead: "把关西的海、森林、古都、湖景和温泉，整理成游客可以慢慢浏览的中文资料页。",
    operated: "Japan Travel 由株式会社大寅／Daitora Group 运营。",
    network: "グループ全体で約100台規模の車両ネットワーク",
    networkZh: "集团整体约100台规模的车辆网络",
    routeTitle: "热门一日路线", routeLead: "公开内容可以直接浏览。日期、库存、价格和正式订单以 Rezio 页面为准。",
    spotTitle: "关西景点资料库", spotLead: "73 个景点，按地区、主题和路线关系整理。每个景点都保留文字介绍和两种语音讲解。",
    productTitle: "交通与预约导引", productLead: "页面只做内容导引和预约跳转。点击 Rezio 只记录预约跳转，不等于已付款订单。",
    joinTitle: "有些地方，适合先放进心里。", joinLead: "保存你喜欢的海、森林和古都，下次再慢慢出发。",
    ctaDetail: "查看内容", ctaRezio: "前往 Rezio", unavailable: "Rezio 入口尚未配置。", search: "搜索景点、城市、标签",
    standardAudio: "标准讲解", classicAudio: "Classic 讲解", relatedRoutes: "相关路线", nearbySpots: "附近景点",
    sourceNote: "资料为原创整理，外部官方来源可在后续数据中补充。", memberGate: "此功能需要登录后使用。",
    notConfigured: "相关接口尚未配置，页面已安全降级。"
  },
  ja: {
    home: "ホーム", routes: "日帰りルート", spots: "スポット", products: "交通サービス", member: "参加", vip: "VIP", referral: "紹介",
    eyebrow: "Japan Travel · Kansai Guide", heroTitle: "森に息づき、海にひらき、古都に還る。",
    heroLead: "関西の海、森、古都、湖、温泉を、旅行前にゆっくり読めるガイドとして整理しました。",
    operated: "Japan Travel は株式会社大寅／Daitora Group が運営しています。",
    network: "グループ全体で約100台規模の車両ネットワーク",
    networkZh: "グループ全体で約100台規模の車両ネットワーク",
    routeTitle: "人気の日帰りルート", routeLead: "公開コンテンツはログインなしで閲覧できます。日付、在庫、価格、正式予約は Rezio 側で確認します。",
    spotTitle: "関西スポット資料庫", spotLead: "73スポットを地域、テーマ、ルート関係で整理。各スポットに文章と2種類の音声ガイドを用意しています。",
    productTitle: "交通と予約案内", productLead: "このページは案内と予約ページへの導線です。Rezio へのクリックは予約遷移であり、支払い済み注文ではありません。",
    joinTitle: "心にそっと残しておきたい場所があります。", joinLead: "好きな海、森、古都を保存して、次はゆっくり出かけましょう。",
    ctaDetail: "内容を見る", ctaRezio: "Rezioへ", unavailable: "Rezioリンクは未設定です。", search: "スポット、都市、タグを検索",
    standardAudio: "標準ガイド", classicAudio: "Classic ガイド", relatedRoutes: "関連ルート", nearbySpots: "近くのスポット",
    sourceNote: "本文は独自に整理した概要です。公式ソースは今後データに追加できます。", memberGate: "この機能はログイン後に利用できます。",
    notConfigured: "関連APIは未設定です。ページは安全に縮退表示しています。"
  },
  en: {
    home: "Home", routes: "Day Routes", spots: "Spot Guide", products: "Transport", member: "Join", vip: "VIP", referral: "Referral",
    eyebrow: "Japan Travel · Kansai Guide", heroTitle: "Still forests, open seas, and echoes of old capitals.",
    heroLead: "A public Kansai travel guide for seasides, forests, old capitals, lakes, temples, hot springs, routes and audio stories.",
    operated: "Japan Travel is operated by Kabushiki Kaisha Daitora / Daitora Group.",
    network: "グループ全体で約100台規模の車両ネットワーク",
    networkZh: "Group-wide vehicle network of around 100 vehicles.",
    routeTitle: "Popular Day Routes", routeLead: "Public content is open to browse. Dates, inventory, prices, confirmed orders and payment are handled by Rezio.",
    spotTitle: "Kansai Spot Library", spotLead: "73 spots organized by area, theme and route relation. Each spot keeps text plus standard and classic audio guides.",
    productTitle: "Transport And Booking Guide", productLead: "This site guides visitors to products. A Rezio click is a reservation redirect, not a paid order.",
    joinTitle: "Some places are worth saving before you go.", joinLead: "Keep your favorite sea, forest and old-capital ideas, then come back when the trip begins.",
    ctaDetail: "View", ctaRezio: "Open Rezio", unavailable: "Rezio link is not configured yet.", search: "Search spots, cities or tags",
    standardAudio: "Standard audio", classicAudio: "Classic audio", relatedRoutes: "Related routes", nearbySpots: "Nearby spots",
    sourceNote: "Descriptions are original summaries. Official source links can be added to the data later.", memberGate: "Please sign in to use this feature.",
    notConfigured: "Related API is not configured yet. The page is safely degraded."
  },
  ko: {
    home: "홈", routes: "당일 루트", spots: "스팟 가이드", products: "교통 서비스", member: "가입", vip: "VIP", referral: "추천",
    eyebrow: "Japan Travel · Kansai Guide", heroTitle: "고요한 숲, 열린 바다, 오래된 도시의 여운.",
    heroLead: "간사이의 바다, 숲, 고도, 호수, 온천과 오디오 가이드를 여행 전 천천히 볼 수 있도록 정리했습니다.",
    operated: "Japan Travel은 주식회사 다이토라 / Daitora Group이 운영합니다.",
    network: "グループ全体で約100台規模の車両ネットワーク",
    networkZh: "그룹 전체 약 100대 규모의 차량 네트워크",
    routeTitle: "인기 당일 루트", routeLead: "공개 콘텐츠는 로그인 없이 볼 수 있습니다. 날짜, 재고, 가격, 공식 주문과 결제는 Rezio에서 처리합니다.",
    spotTitle: "간사이 스팟 자료실", spotLead: "73개 스팟을 지역, 테마, 루트 관계로 정리했습니다. 각 스팟에는 텍스트와 두 종류의 오디오 가이드가 있습니다.",
    productTitle: "교통 및 예약 안내", productLead: "이 사이트는 상품 안내와 예약 페이지 이동을 제공합니다. Rezio 클릭은 예약 이동이며 결제 완료 주문이 아닙니다.",
    joinTitle: "마음속에 먼저 담아둘 만한 장소가 있습니다.", joinLead: "좋아하는 바다, 숲, 고도를 저장하고 다음 여행 때 천천히 떠나보세요.",
    ctaDetail: "보기", ctaRezio: "Rezio 열기", unavailable: "Rezio 링크가 아직 설정되지 않았습니다.", search: "스팟, 도시, 태그 검색",
    standardAudio: "표준 오디오", classicAudio: "Classic 오디오", relatedRoutes: "관련 루트", nearbySpots: "근처 스팟",
    sourceNote: "본문은 독자적으로 정리한 개요입니다. 공식 출처 링크는 추후 데이터에 추가할 수 있습니다.", memberGate: "이 기능은 로그인 후 사용할 수 있습니다.",
    notConfigured: "관련 API가 아직 설정되지 않아 안전하게 축소 표시됩니다."
  },
  zhHant: {
    home: "首頁", routes: "一日路線", spots: "景點資料", products: "交通服務", member: "加入", vip: "VIP", referral: "推薦",
    eyebrow: "Japan Travel · Kansai Guide", heroTitle: "森有靜之氣，海有遠之意，古都有餘音。",
    heroLead: "把關西的海、森林、古都、湖景和溫泉，整理成旅客可以慢慢瀏覽的中文資料頁。",
    operated: "Japan Travel 由株式会社大寅／Daitora Group 營運。",
    network: "グループ全体で約100台規模の車両ネットワーク",
    networkZh: "集團整體約100台規模的車輛網絡",
    routeTitle: "熱門一日路線", routeLead: "公開內容可以直接瀏覽。日期、庫存、價格和正式訂單以 Rezio 頁面為準。",
    spotTitle: "關西景點資料庫", spotLead: "73 個景點，按地區、主題和路線關係整理。每個景點都保留文字介紹和兩種語音講解。",
    productTitle: "交通與預約導引", productLead: "頁面只做內容導引和預約跳轉。點擊 Rezio 只記錄預約跳轉，不等於已付款訂單。",
    joinTitle: "有些地方，適合先放進心裡。", joinLead: "保存你喜歡的海、森林和古都，下次再慢慢出發。",
    ctaDetail: "查看內容", ctaRezio: "前往 Rezio", unavailable: "Rezio 入口尚未配置。", search: "搜尋景點、城市、標籤",
    standardAudio: "標準講解", classicAudio: "Classic 講解", relatedRoutes: "相關路線", nearbySpots: "附近景點",
    sourceNote: "資料為原創整理，外部官方來源可在後續資料中補充。", memberGate: "此功能需要登入後使用。",
    notConfigured: "相關接口尚未配置，頁面已安全降級。"
  }
};

function envJson(name) {
  try { return JSON.parse(process.env[name] || "{}"); } catch { return {}; }
}

const publicConfig = {
  rezioDefaultUrl: process.env.REZIO_DEFAULT_URL || "",
  rezioRouteUrls: envJson("REZIO_ROUTE_URLS_JSON"),
  rezioProductUrls: envJson("REZIO_PRODUCT_URLS_JSON"),
  instagramUrl: process.env.INSTAGRAM_URL || "",
  tiktokUrl: process.env.TIKTOK_URL || "",
  lineUrl: process.env.LINE_URL || "",
  memberApiBase: process.env.MEMBER_API_BASE || "",
  analyticsEndpoint: process.env.ANALYTICS_ENDPOINT || "",
  daitoraGroupUrl: process.env.DAITORA_GROUP_URL || "https://daitora-jp.com/"
};

fs.writeFileSync(
  path.join(root, "assets/js/site-config.js"),
  `window.JAPAN_TRAVEL_CONFIG = ${JSON.stringify(publicConfig, null, 2)};\n`,
  "utf8"
);

function h(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stripVersion(url = "") {
  return String(url).replace(/\?.*$/, "");
}

function pageName(lang) {
  return `index${langSuffix[lang]}.html`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writePage(dir, lang, html) {
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, pageName(lang)), html, "utf8");
}

function langLinks(lang) {
  return `<div class="lang" aria-label="Language">${langs.map((l) => `<a class="${l === lang ? "active" : ""}" href="${pageName(l)}">${langLabels[l]}</a>`).join("")}</div>`;
}

function nav(lang) {
  const t = ui[lang];
  return `<header class="topbar"><div class="wrap nav">
    <a class="brand" href="/${pageName(lang)}">japan-travel.info<small>Kansai Travel Guide</small></a>
    <nav class="nav-links">
      <a class="pill" href="/${pageName(lang)}">${h(t.home)}</a>
      <a class="pill" href="/h5/${pageName(lang)}#routes">${h(t.routes)}</a>
      <a class="pill" href="/spots/${pageName(lang)}">${h(t.spots)}</a>
      <a class="pill" href="/products/${pageName(lang)}">${h(t.products)}</a>
      <a class="pill" href="/member/${pageName(lang)}">${h(t.member)}</a>
    </nav>
    ${langLinks(lang)}
  </div></header>`;
}

function layout(lang, title, body, opts = {}) {
  return `<!doctype html>
<html lang="${lang === "zhHant" ? "zh-Hant" : lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${h(title)} | japan-travel.info</title>
  <meta name="description" content="${h(opts.description || ui[lang].heroLead)}">
  <link rel="stylesheet" href="/assets/css/site.css">
  <script defer src="/assets/js/site-config.js"></script>
  <script defer src="/assets/js/site-runtime.js"></script>
</head>
<body>
  ${nav(lang)}
  ${body}
  <footer class="footer"><div class="wrap">
    <strong>japan-travel.info</strong>
    <p>${h(ui[lang].operated)} ${h(ui[lang].networkZh)}</p>
  </div></footer>
</body>
</html>`;
}

function getData(lang) {
  return content[lang] || content.zh;
}

function spotMap(lang) {
  return new Map(getData(lang).all_spots.map((spot) => [spot.id, spot]));
}

function routeImage(route, lang) {
  const map = spotMap(lang);
  const first = route.spots?.map((id) => map.get(id)).find(Boolean);
  return stripVersion(route.feature_media?.poster || first?.image || "/kansai-assets/images/kyoto/kyo-0001-kiyomizu-dera-temple-cover.jpg");
}

function chips(items = []) {
  return `<div class="chips">${items.slice(0, 5).map((item) => `<span class="chip">${h(item)}</span>`).join("")}</div>`;
}

function routeCard(route, lang) {
  const t = ui[lang];
  return `<article class="card route-card">
    <img src="${h(routeImage(route, lang))}" alt="${h(route.title)}" loading="lazy">
    <div class="card-body">
      <h3>${h(route.title)}</h3>
      <p class="muted">${h(route.summary || route.subtitle)}</p>
      ${chips(route.tags)}
      <div class="btn-row">
        <a class="btn primary" href="/h5/routes/${route.id}/${pageName(lang)}">${h(t.ctaDetail)}</a>
        <a class="btn" href="#" data-rezio-key="${h(route.id)}" data-unconfigured="${h(t.unavailable)}">${h(t.ctaRezio)}</a>
      </div>
      <p data-message class="muted"></p>
    </div>
  </article>`;
}

function spotCard(spot, lang) {
  return `<a class="card spot-card" href="/spots/${spot.id}/${pageName(lang)}" data-name="${h([spot.name, spot.city, spot.region, ...(spot.tags || [])].join(" "))}">
    <img src="${h(stripVersion(spot.image))}" alt="${h(spot.name)}" loading="lazy">
    <div class="over"><strong>${h(spot.name)}</strong><br><small>${h(spot.region)} · ${h(spot.category || "")}</small></div>
  </a>`;
}

function homeBody(lang) {
  const data = getData(lang);
  const t = ui[lang];
  const selectedSpots = data.all_spots.slice(0, 16);
  return `<main>
    <section class="hero">
      <div class="hero-media">
        <video autoplay muted loop playsinline preload="metadata" src="/kansai-assets/video/hero/sea_kansai_01_beach_only_42s.mp4"></video>
      </div>
      <div class="wrap hero-content">
        <div class="eyebrow">${h(t.eyebrow)}</div>
        <h1>${h(t.heroTitle)}</h1>
        <p class="lead">${h(t.heroLead)}</p>
        <div class="hero-badges"><span class="chip">${h(t.operated)}</span><span class="chip">${h(t.network)}</span></div>
      </div>
    </section>
    <section id="routes" class="section"><div class="wrap">
      <div class="section-head"><h2>${h(t.routeTitle)}</h2><p>${h(t.routeLead)}</p></div>
      <div class="grid">${data.routes.map((route) => routeCard(route, lang)).join("")}</div>
    </div></section>
    <section id="spots" class="section"><div class="wrap">
      <div class="section-head"><h2>${h(t.spotTitle)}</h2><p>${h(t.spotLead)}</p></div>
      <input class="searchbar" data-spot-search placeholder="${h(t.search)}">
      <div class="chips">${regionOrder.map((r) => `<span class="chip">${h(r)}</span>`).join("")}</div>
      <div class="grid" style="margin-top:22px">${selectedSpots.map((spot) => spotCard(spot, lang)).join("")}</div>
      <div class="btn-row" style="margin-top:24px"><a class="btn primary" href="/spots/${pageName(lang)}">${h(t.spots)}</a></div>
    </div></section>
    <section class="section"><div class="wrap feature">
      <div class="panel"><h2>${h(t.productTitle)}</h2><p class="muted">${h(t.productLead)}</p><div class="statline">
        <div><strong>73</strong><span>${h(t.spots)}</span></div><div><strong>5</strong><span>${h(t.routes)}</span></div><div><strong>2</strong><span>Audio styles</span></div>
      </div></div>
      <div class="panel"><h2>${h(t.joinTitle)}</h2><p class="muted">${h(t.joinLead)}</p><div class="btn-row">
        <a class="btn primary" href="/member/${pageName(lang)}">${h(t.member)}</a>
        <a class="btn" href="/vip/${pageName(lang)}">${h(t.vip)}</a>
        <a class="btn" href="/referral/${pageName(lang)}">${h(t.referral)}</a>
      </div></div>
    </div></section>
  </main>
  <script>
    document.querySelector('[data-spot-search]')?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('.spot-card').forEach(card => {
        card.style.display = card.dataset.name.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  </script>`;
}

function routeBody(route, lang) {
  const t = ui[lang];
  const map = spotMap(lang);
  const spots = (route.spots || []).map((id) => map.get(id)).filter(Boolean);
  return `<main>
    <section class="route-hero"><div class="wrap detail-layout">
      <div><div class="eyebrow">${h(t.routes)}</div><h1>${h(route.title)}</h1><p class="muted">${h(route.detail || route.summary)}</p>${chips(route.tags)}</div>
      <div class="detail-image"><img src="${h(routeImage(route, lang))}" alt="${h(route.title)}"></div>
    </div></section>
    <section class="section"><div class="wrap detail-layout">
      <div class="panel"><h2>${h(t.routes)}</h2><div class="stops">${(route.stops || []).map((stop) => `<div class="stop"><div><strong>${h(stop[0])}</strong><p class="muted">${h(stop[1] || "")}</p><p>${h(stop[2] || "")}</p></div></div>`).join("")}</div></div>
      <aside class="panel"><h3>Rezio</h3><p class="muted">${h(t.productLead)}</p><a class="btn primary" href="#" data-rezio-key="${h(route.id)}" data-unconfigured="${h(t.unavailable)}">${h(t.ctaRezio)}</a><p data-message class="notice"></p></aside>
    </div></section>
    <section class="section"><div class="wrap"><div class="section-head"><h2>${h(t.spots)}</h2><p>${h(route.photo_tip || "")}</p></div>
      <div class="grid">${spots.map((spot) => `<article class="card route-card">
        <img src="${h(stripVersion(spot.image))}" alt="${h(spot.name)}" loading="lazy">
        <div class="card-body"><h3>${h(spot.name)}</h3><p class="muted">${h(spot.intro)}</p>
          <div class="audio-card"><strong>${h(t.standardAudio)}</strong><audio controls preload="none" src="${h(spot.audio)}"></audio></div>
          <div class="audio-card"><strong>${h(t.classicAudio)}</strong><audio controls preload="none" src="${h(spot.classic_audio)}"></audio></div>
          <div class="btn-row"><a class="btn" href="/spots/${spot.id}/${pageName(lang)}">${h(t.ctaDetail)}</a></div>
        </div></article>`).join("")}</div>
    </div></section>
  </main>`;
}

function routesForSpot(spotId, lang) {
  return getData(lang).routes.filter((route) => (route.spots || []).includes(spotId));
}

function nearbySpots(spot, lang) {
  return getData(lang).all_spots.filter((item) => item.id !== spot.id && item.region === spot.region).slice(0, 4);
}

function spotBody(spot, lang) {
  const t = ui[lang];
  const related = routesForSpot(spot.id, lang);
  const nearby = nearbySpots(spot, lang);
  return `<main>
    <section class="spot-hero"><div class="wrap detail-layout">
      <div><div class="eyebrow">${h(spot.region)} · ${h(spot.city)}</div><h1>${h(spot.name)}</h1><p class="muted">${h(spot.intro)}</p>${chips([spot.category, spot.duration, ...(spot.tags || [])].filter(Boolean))}</div>
      <div class="detail-image"><img src="${h(stripVersion(spot.image))}" alt="${h(spot.name)}"></div>
    </div></section>
    <section class="section"><div class="wrap detail-layout">
      <article class="panel"><h2>${h(t.spots)}</h2><p>${h(spot.audio_script || spot.intro)}</p>
        <div class="audio-card"><strong>${h(t.standardAudio)}</strong><audio controls preload="none" src="${h(spot.audio)}"></audio></div>
        <div class="audio-card"><strong>${h(t.classicAudio)}</strong><audio controls preload="none" src="${h(spot.classic_audio)}"></audio></div>
        <h3>${h(spot.tip ? "Tip" : "")}</h3><p class="muted">${h(spot.tip || "")}</p><p class="notice">${h(t.sourceNote)}</p>
      </article>
      <aside class="panel"><h3>${h(t.relatedRoutes)}</h3>${related.map((route) => `<p><a class="btn" href="/h5/routes/${route.id}/${pageName(lang)}">${h(route.title)}</a></p>`).join("") || `<p class="muted">${h(t.notConfigured)}</p>`}</aside>
    </div></section>
    <section class="section"><div class="wrap"><div class="section-head"><h2>${h(t.nearbySpots)}</h2><p>${h(spot.region)}</p></div><div class="grid">${nearby.map((s) => spotCard(s, lang)).join("")}</div></div></section>
  </main>`;
}

function spotsIndexBody(lang) {
  const data = getData(lang);
  const t = ui[lang];
  return `<main><section class="section"><div class="wrap">
    <div class="section-head"><h1>${h(t.spotTitle)}</h1><p>${h(t.spotLead)}</p></div>
    <input class="searchbar" data-spot-search placeholder="${h(t.search)}">
    <div class="grid" style="margin-top:22px">${data.all_spots.map((spot) => spotCard(spot, lang)).join("")}</div>
  </div></section></main>
  <script>
    document.querySelector('[data-spot-search]')?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('.spot-card').forEach(card => card.style.display = card.dataset.name.toLowerCase().includes(q) ? '' : 'none');
    });
  </script>`;
}

function memberLikeBody(lang, kind) {
  const t = ui[lang];
  const titles = {
    member: t.joinTitle,
    vip: "VIP",
    referral: t.referral,
    ambassador: "Travel Ambassador",
    products: t.productTitle
  };
  const isProducts = kind === "products";
  return `<main><section class="section"><div class="wrap feature">
    <div class="panel"><div class="eyebrow">${h(t.operated)}</div><h1>${h(titles[kind])}</h1><p class="muted">${h(isProducts ? t.productLead : t.joinLead)}</p>
      <p class="notice">${h(isProducts ? t.unavailable : t.memberGate)} ${h(t.notConfigured)}</p>
      <div class="btn-row">
        <a class="btn primary" href="#" ${isProducts ? `data-rezio-key="default" data-unconfigured="${h(t.unavailable)}"` : `data-requires-login data-login-message="${h(t.memberGate)}"`}>${h(isProducts ? t.ctaRezio : t.member)}</a>
        <a class="btn" href="/${pageName(lang)}">${h(t.home)}</a>
      </div><p data-message class="muted"></p>
    </div>
    <form class="panel" data-member-form data-unconfigured="${h(t.notConfigured)}">
      <h3>${h(t.member)}</h3>
      <label>Email<br><input class="searchbar" required type="email" name="email" placeholder="you@example.com"></label><br><br>
      <label>Nickname<br><input class="searchbar" name="nickname"></label><br><br>
      <button class="btn primary" type="submit">${h(t.member)}</button>
      <p data-message class="muted"></p>
    </form>
  </div></section></main>`;
}

for (const lang of langs) {
  const data = getData(lang);
  writePage(root, lang, layout(lang, "Kansai Travel Guide", homeBody(lang)));
  writePage(path.join(root, "h5"), lang, layout(lang, "Kansai Travel Guide", homeBody(lang)));
  writePage(path.join(root, "spots"), lang, layout(lang, ui[lang].spotTitle, spotsIndexBody(lang)));
  for (const route of data.routes) {
    writePage(path.join(root, "h5/routes", route.id), lang, layout(lang, route.title, routeBody(route, lang), { description: route.summary }));
  }
  for (const spot of data.all_spots) {
    writePage(path.join(root, "spots", spot.id), lang, layout(lang, spot.name, spotBody(spot, lang), { description: spot.intro }));
  }
  for (const kind of ["member", "vip", "referral", "ambassador", "products"]) {
    writePage(path.join(root, kind), lang, layout(lang, kind, memberLikeBody(lang, kind)));
  }
}

console.log(`Generated ${langs.length} languages, ${content.zh.routes.length} routes, ${content.zh.all_spots.length} spots.`);
