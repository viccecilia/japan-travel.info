import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const content = JSON.parse(fs.readFileSync(path.join(root, "src/content.json"), "utf8"));
const brand = JSON.parse(fs.readFileSync(path.join(root, "src/facts/brand.json"), "utf8"));
const faq = JSON.parse(fs.readFileSync(path.join(root, "src/facts/faq.json"), "utf8"));
const pageCopy = JSON.parse(fs.readFileSync(path.join(root, "src/page-copy.json"), "utf8"));
const contactCopy = JSON.parse(fs.readFileSync(path.join(root, "src/contact-copy.json"), "utf8"));
const spotSources = JSON.parse(fs.readFileSync(path.join(root, "src/facts/spot-sources.json"), "utf8"));
const mediaSourcesFile = path.join(root, "src/media-sources.json");
const mediaSources = fs.existsSync(mediaSourcesFile) ? JSON.parse(fs.readFileSync(mediaSourcesFile, "utf8")) : {};

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

const label = JSON.parse(fs.readFileSync(path.join(root, "src/ui-labels.json"), "utf8"));

const regionLocal = {
  zh: { "大阪": "大阪", "京都": "京都", "奈良": "奈良", "兵库": "兵库", "滋贺": "滋贺", "和歌山": "和歌山", "三重": "三重" },
  zhHant: { "大阪": "大阪", "京都": "京都", "奈良": "奈良", "兵库": "兵庫", "滋贺": "滋賀", "和歌山": "和歌山", "三重": "三重" },
  ja: { "大阪": "大阪", "京都": "京都", "奈良": "奈良", "兵库": "兵庫", "滋贺": "滋賀", "和歌山": "和歌山", "三重": "三重" },
  en: { "大阪": "Osaka", "京都": "Kyoto", "奈良": "Nara", "兵库": "Hyogo", "滋贺": "Shiga", "和歌山": "Wakayama", "三重": "Mie" },
  ko: { "大阪": "오사카", "京都": "교토", "奈良": "나라", "兵库": "효고", "滋贺": "시가", "和歌山": "와카야마", "三重": "미에" }
};

const routeCopy = {
  zh: ["从大阪出发，把关西代表性景点串成清晰的一日动线。", "路线内容可自由浏览；具体日期、车辆与费用请提交咨询，等待工作人员回复确认。"],
  zhHant: ["從大阪出發，把關西代表性景點串成清晰的一日動線。", "路線內容可自由瀏覽；具體日期、車輛與費用請提交諮詢，等待工作人員回覆確認。"],
  ja: ["大阪発で、関西の代表的な見どころを一日の流れにまとめました。", "ルート内容は自由に閲覧できます。日程・車両・料金は相談送信後の担当者返信でご確認ください。"],
  en: ["Start from Osaka and connect signature Kansai stops into one clear day.", "Route content is open. Send an inquiry to confirm dates, vehicles and price with our team."],
  ko: ["오사카 출발 기준으로 간사이 대표 명소를 하루 동선으로 정리했습니다.", "노선 내용은 자유롭게 볼 수 있습니다. 날짜, 차량과 요금은 문의 후 담당자의 회신으로 확인해 주세요."]
};

const servicePages = [
  { id: "airport-transfer", product: "kix-osaka", title: { zh: "机场接送服务", zhHant: "機場接送服務", ja: "空港送迎サービス", en: "Airport Transfer", ko: "공항 이동 서비스" } },
  { id: "charter", product: "charter-kansai", title: { zh: "关西包车服务", zhHant: "關西包車服務", ja: "関西貸切送迎", en: "Kansai Private Charter", ko: "간사이 전용 차량" } },
  { id: "family", product: "family-transfer", title: { zh: "家庭与亲子用车", zhHant: "家庭與親子用車", ja: "家族向け移動", en: "Family Transfer", ko: "가족 여행 차량" } },
  { id: "business", product: "business-guest", title: { zh: "商务访客接待", zhHant: "商務訪客接待", ja: "ビジネス送迎", en: "Business Guest Transport", ko: "비즈니스 의전 이동" } }
];
const vehiclePages = [
  { id: "alphard", title: { zh: "Alphard 车型", zhHant: "Alphard 車型", ja: "Alphard", en: "Alphard", ko: "알파드" } },
  { id: "hiace", title: { zh: "Hiace 车型", zhHant: "Hiace 車型", ja: "Hiace", en: "Hiace", ko: "하이에이스" } }
];
const vehicleFormCopy = {
  zh: {
    label: "车型偏好", guide: "车型容量参考", people: "建议人数", luggage: "标准行李参考", scene: "适合场景",
    review: "填写的人数或行李超过该车型的参考范围，建议选择“请工作人员推荐”或“多车或其他方案”。",
    note: "仅供咨询参考。行李尺寸、儿童座椅、婴儿车、轮椅及实际车辆配置会影响可载空间，最终以工作人员回复为准。",
    options: {
      staff_recommendation: ["请工作人员推荐", "根据填写人数判断", "根据数量与尺寸判断", "工作人员结合日期、人数和行李推荐"],
      alphard: ["Alphard", "1–4 人", "约 2–4 件标准行李", "少人数、重视舒适度"],
      hiace: ["Hiace", "5–9 人", "约 5–9 件标准行李", "人数或行李较多"],
      multiple_vehicles: ["多车或其他方案", "10 人以上", "大量或大件行李", "团体、轮椅、婴儿车或设备较多"]
    }
  },
  zhHant: {
    label: "車型偏好", guide: "車型容量參考", people: "建議人數", luggage: "標準行李參考", scene: "適合情況",
    review: "填寫的人數或行李超過此車型的參考範圍，建議選擇「請工作人員建議」或「多車或其他方案」。",
    note: "僅供諮詢參考。行李尺寸、兒童座椅、嬰兒車、輪椅及實際車輛配置會影響可載空間，最終以工作人員回覆為準。",
    options: {
      staff_recommendation: ["請工作人員建議", "依填寫人數判斷", "依數量與尺寸判斷", "工作人員會依日期、人數和行李提供建議"],
      alphard: ["Alphard", "1–4 人", "約 2–4 件標準行李", "少人數、重視舒適度"],
      hiace: ["Hiace", "5–9 人", "約 5–9 件標準行李", "人數或行李較多"],
      multiple_vehicles: ["多車或其他方案", "10 人以上", "大量或大型行李", "團體、輪椅、嬰兒車或設備較多"]
    }
  },
  ja: {
    label: "車種の希望", guide: "車種・乗車目安", people: "推奨人数", luggage: "標準サイズ荷物の目安", scene: "向いているケース",
    review: "入力された人数または荷物数が目安を超えています。「スタッフにおまかせ」または「複数台・その他」をお選びください。",
    note: "相談時の目安です。荷物の大きさ、チャイルドシート、ベビーカー、車いす、実際の車両仕様により積載可能量は変わります。最終内容は担当者の返信でご確認ください。",
    options: {
      staff_recommendation: ["スタッフにおまかせ", "入力人数から確認", "個数と大きさから確認", "日程・人数・荷物に合わせて担当者が提案"],
      alphard: ["Alphard", "1〜4名", "標準スーツケース約2〜4個", "少人数・快適性重視"],
      hiace: ["Hiace", "5〜9名", "標準スーツケース約5〜9個", "人数または荷物が多い場合"],
      multiple_vehicles: ["複数台・その他", "10名以上", "荷物が多い・大型荷物", "団体、車いす、ベビーカー、機材が多い場合"]
    }
  },
  en: {
    label: "Vehicle preference", guide: "Vehicle planning guide", people: "Suggested party", luggage: "Standard luggage guide", scene: "Best for",
    review: "The entered party or luggage exceeds this vehicle guide. Choose “Let our team recommend” or “Multiple vehicles / other”.",
    note: "For inquiry planning only. Luggage size, child seats, strollers, wheelchairs and the actual vehicle configuration affect usable capacity. Final arrangements are confirmed by our team.",
    options: {
      staff_recommendation: ["Let our team recommend", "Based on entered party", "Based on quantity and size", "Our team recommends from the date, party and luggage details"],
      alphard: ["Alphard", "1–4 guests", "About 2–4 standard suitcases", "Smaller parties prioritizing comfort"],
      hiace: ["Hiace", "5–9 guests", "About 5–9 standard suitcases", "Larger parties or more luggage"],
      multiple_vehicles: ["Multiple vehicles / other", "10+ guests", "Heavy or oversized luggage", "Groups, wheelchairs, strollers or equipment"]
    }
  },
  ko: {
    label: "차량 선호", guide: "차량 정원 참고", people: "권장 인원", luggage: "표준 수하물 기준", scene: "추천 상황",
    review: "입력한 인원 또는 수하물이 이 차량의 참고 범위를 넘습니다. ‘직원 추천 받기’ 또는 ‘여러 대·기타’를 선택해 주세요.",
    note: "상담을 위한 참고 정보입니다. 수하물 크기, 유아 시트, 유모차, 휠체어와 실제 차량 구성에 따라 적재 공간이 달라집니다. 최종 내용은 담당자 답변으로 확인해 주세요.",
    options: {
      staff_recommendation: ["직원 추천 받기", "입력 인원에 따라 확인", "수량과 크기에 따라 확인", "날짜, 인원과 수하물에 맞춰 담당자가 추천"],
      alphard: ["Alphard", "1~4명", "표준 캐리어 약 2~4개", "소규모·편안함 중시"],
      hiace: ["Hiace", "5~9명", "표준 캐리어 약 5~9개", "인원 또는 수하물이 많은 경우"],
      multiple_vehicles: ["여러 대·기타", "10명 이상", "많은 짐 또는 대형 수하물", "단체, 휠체어, 유모차 또는 장비가 많은 경우"]
    }
  }
};
const productPages = [
  { id: "kix-osaka", title: { zh: "KIX 至大阪预约指南", zhHant: "KIX 至大阪預約指南", ja: "KIX から大阪への予約ガイド", en: "KIX to Osaka Booking Guide", ko: "KIX-오사카 예약 가이드" } },
  { id: "kix-kyoto", title: { zh: "KIX 至京都预约指南", zhHant: "KIX 至京都預約指南", ja: "KIX から京都への予約ガイド", en: "KIX to Kyoto Booking Guide", ko: "KIX-교토 예약 가이드" } },
  { id: "kix-nara", title: { zh: "KIX 至奈良预约指南", zhHant: "KIX 至奈良預約指南", ja: "KIX から奈良への予約ガイド", en: "KIX to Nara Booking Guide", ko: "KIX-나라 예약 가이드" } },
  { id: "kix-kobe", title: { zh: "KIX 至神户预约指南", zhHant: "KIX 至神戶預約指南", ja: "KIX から神戸への予約ガイド", en: "KIX to Kobe Booking Guide", ko: "KIX-고베 예약 가이드" } }
];
const memberPages = ["login", "register", "verify-email", "reset-password", "profile", "favorites", "trips", "bookings", "vip", "referrals", "ambassador"];

const serviceDetails = {
  "airport-transfer": {
    image: "/kansai-assets/images/osaka/osa-0007-umeda-sky-building-floating-garden-observatory-cover.jpg",
    zh: ["机场与酒店、民宿之间的直接移动，适合带行李、家庭同行与深夜抵达。", "航班信息与集合方式", "行李数量与尺寸", "航班延误与等待边界", "深夜抵达与推荐车型"],
    zhHant: ["機場與飯店、民宿之間的直接移動，適合攜帶行李、家庭同行與深夜抵達。", "航班資訊與集合方式", "行李數量與尺寸", "航班延誤與等候邊界", "深夜抵達與建議車型"],
    ja: ["空港からホテル・宿泊先までの直接移動。荷物の多い方、家族旅行、深夜到着にも適しています。", "便名と待ち合わせ方法", "荷物の個数とサイズ", "遅延時の待機範囲", "深夜到着と車種の目安"],
    en: ["Direct travel between the airport and your accommodation, suited to luggage, families and late arrivals.", "Flight details and meeting method", "Luggage count and size", "Delay and waiting boundaries", "Late arrivals and vehicle guidance"],
    ko: ["공항과 호텔·숙소 사이를 바로 이동하며 수하물, 가족 여행, 심야 도착에 적합합니다.", "항공편과 미팅 방법", "수하물 개수와 크기", "지연 시 대기 범위", "심야 도착과 차량 안내"]
  },
  charter: {
    image: "/kansai-assets/images/kyoto/kyo-0001-kiyomizu-dera-temple-cover.jpg",
    zh: ["在大阪、京都、奈良、兵库及周边地区，把分散景点整理为一段更从容的行程。", "服务时长与出发地点", "途中路线调整", "远郊与停车条件", "超时和景点组合"],
    zhHant: ["在大阪、京都、奈良、兵庫及周邊地區，把分散景點整理成更從容的行程。", "服務時長與出發地點", "途中路線調整", "遠郊與停車條件", "超時和景點組合"],
    ja: ["大阪・京都・奈良・兵庫など、離れた見どころを無理のない一日にまとめます。", "利用時間と出発地", "途中のルート調整", "郊外と駐車条件", "延長とスポット構成"],
    en: ["Connect dispersed places across Osaka, Kyoto, Nara, Hyogo and beyond into a calmer day.", "Service duration and departure point", "Route adjustments", "Outlying areas and parking", "Overtime and place combinations"],
    ko: ["오사카, 교토, 나라, 효고와 주변의 떨어진 명소를 여유로운 하루로 연결합니다.", "이용 시간과 출발지", "중간 코스 조정", "교외와 주차 조건", "초과 시간과 명소 조합"]
  },
  family: {
    image: "/kansai-assets/images/nara/nar-0001-nara-park-cover.jpg",
    zh: ["为儿童、长辈和多件行李预留上下车、休息与移动节奏。", "儿童座椅提前确认", "婴儿车与行李空间", "老人儿童上下车", "休息节奏与亲子路线"],
    zhHant: ["為兒童、長輩和多件行李預留上下車、休息與移動節奏。", "兒童座椅提前確認", "嬰兒車與行李空間", "長輩兒童上下車", "休息節奏與親子路線"],
    ja: ["子ども、シニア、荷物に合わせて乗降・休憩・移動のペースを整えます。", "チャイルドシートの事前確認", "ベビーカーと荷物スペース", "子ども・シニアの乗降", "休憩と家族向けルート"],
    en: ["Plan boarding, breaks and pace around children, older guests, strollers and luggage.", "Child seats confirmed in advance", "Stroller and luggage space", "Safer boarding for family members", "Breaks and family routes"],
    ko: ["어린이, 어르신, 유모차와 수하물에 맞춰 승하차와 휴식 속도를 조정합니다.", "유아 시트 사전 확인", "유모차와 수하물 공간", "가족의 편한 승하차", "휴식과 가족 코스"]
  },
  business: {
    image: "/kansai-assets/images/hyogo/hyg-0002-kobe-port-and-harborland-cover.jpg",
    zh: ["围绕企业来宾、酒店与旅行社合作，重视时间管理、接待表达与多车协调。", "时间与接待节点", "举牌和来宾信息", "多车调度", "临时行程变更"],
    zhHant: ["圍繞企業來賓、飯店與旅行社合作，重視時間管理、接待表達與多車協調。", "時間與接待節點", "舉牌和來賓資訊", "多車調度", "臨時行程變更"],
    ja: ["企業ゲスト、ホテル、旅行会社との連携を想定し、時間管理と複数台調整を重視します。", "時間と受付ポイント", "ネームボードとゲスト情報", "複数台の調整", "行程変更への対応"],
    en: ["For corporate guests and hotel or agency coordination, with emphasis on timing and multi-vehicle planning.", "Timing and reception points", "Name board and guest details", "Multi-vehicle coordination", "Itinerary changes"],
    ko: ["기업 방문객, 호텔·여행사 협업을 위해 시간 관리와 여러 대의 차량 조정을 중시합니다.", "시간과 접객 지점", "피켓과 방문객 정보", "다차량 조정", "일정 변경 대응"]
  }
};

const productMedia = {
  "kix-osaka": "/kansai-assets/images/osaka/osa-0001-osaka-castle-park-cover.jpg",
  "kix-kyoto": "/kansai-assets/images/kyoto/kyo-0001-kiyomizu-dera-temple-cover.jpg",
  "kix-nara": "/kansai-assets/images/nara/nar-0001-nara-park-cover.jpg",
  "kix-kobe": "/kansai-assets/images/hyogo/hyg-0002-kobe-port-and-harborland-cover.jpg"
};

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
function serviceHref(lang, serviceId) {
  return relUrl(lang, `services/${serviceId}`);
}
function contactHref(lang) {
  return `${serviceHref(lang, "airport-transfer")}#transport-inquiry`;
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
function nav(lang, rest = "") {
  const t = label[lang.key];
  const c = pageCopy[lang.key];
  const links = [[t.home, "", relUrl(lang)], [t.routes, "routes", relUrl(lang, "routes")], [t.spots, "spots", relUrl(lang, "spots")], [t.services, "services/airport-transfer", serviceHref(lang, "airport-transfer")]];
  const current = `/${rest}`;
  const navLinks = links.map(([name, target, href]) => `<a href="${h(href)}" ${current === `/${target}` ? 'aria-current="page"' : ""}>${h(name)}</a>`).join("");
  const languageLinks = langs.map((l) => `<a class="${l.key === lang.key ? "active" : ""}" href="${relUrl(l, rest)}"><span>${h(l.name)}</span><strong>${l.label}</strong></a>`).join("");
  return `<a class="skip-link" href="#main-content">Skip to content</a><header class="topbar"><div class="wrap nav">
    <a class="brand" href="${relUrl(lang)}">Japan Travel<small>株式会社大寅 / Daitora Group</small></a>
    <nav class="nav-links" aria-label="Main">${navLinks}</nav>
    <div class="nav-actions"><a class="nav-member" href="${relUrl(lang, "member")}">${h(c.nav.member)}</a><a class="nav-cta" href="${contactHref(lang)}">${h(c.nav.cta)}</a>
      <details class="lang-menu"><summary aria-label="${h(c.nav.language)}">${lang.label}</summary><div class="lang-popover">${languageLinks}</div></details>
      <details class="mobile-menu"><summary aria-label="${h(c.nav.menu)}">☰</summary><nav class="mobile-popover">${navLinks}<a href="${relUrl(lang, "member")}">${h(c.nav.member)}</a><a href="${contactHref(lang)}">${h(c.nav.cta)}</a></nav></details>
    </div>
  </div></header>`;
}
function footer(lang) {
  const t = label[lang.key];
  const c = pageCopy[lang.key];
  const social = ["instagramUrl", "tiktokUrl", "lineUrl"].map((key) => `<span data-social="${key}"></span>`).join("");
  return `<footer class="footer"><div class="wrap footer-grid">
    <div><strong>Japan Travel</strong><p>${h(brand.operated_by_text)}</p><p>${h(brand.vehicle_network_text[lang.key])}</p></div>
    <div><strong>${h(t.services)}</strong>${servicePages.map((s) => `<a href="${h(serviceHref(lang, s.id))}">${h(s.title[lang.key])}</a>`).join("")}</div>
    <div><strong>${h(t.routes)}</strong><a href="${relUrl(lang, "routes")}">${h(t.routesTitle)}</a><a href="${relUrl(lang, "spots")}">${h(t.spotsTitle)}</a><a href="${contactHref(lang)}">${h(contactCopy[lang.key].navContact)}</a><a href="${relUrl(lang, "member")}">${h(c.nav.member)}</a></div>
    <div><strong>Japan Travel</strong><a href="${h(brand.daitora_url)}" rel="noopener" target="_blank">Daitora Group</a><a href="${relUrl(lang, "faq")}">FAQ</a><a href="${relUrl(lang, "privacy")}">${h(c.info.privacy)}</a><a href="${relUrl(lang, "terms")}">${h(c.info.terms)}</a><div class="social-links">${social}</div></div>
  </div><div class="wrap footer-legal"><p>${h(t.bookingBoundary)}</p></div></footer>
  <nav class="bottom-nav" aria-label="Mobile">${[[t.home, relUrl(lang)], [t.routes, relUrl(lang, "routes")], [t.spots, relUrl(lang, "spots")], [contactCopy[lang.key].navContact, contactHref(lang)], [c.nav.my, relUrl(lang, "member")]].map(([n, href]) => `<a href="${href}">${h(n)}</a>`).join("")}</nav>`;
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
  <script>window.JT_I18N=${JSON.stringify(label[lang.key]).replace(/</g, "\\u003c")};</script>
  <script defer src="/assets/js/site-runtime.js"></script>
  ${ld}
</head>
<body data-page="${h(rest || "home")}" data-lang="${lang.slug}">
${nav(lang, rest)}
<div id="main-content">${body}</div>
${footer(lang)}
</body>
</html>`;
}
function breadcrumb(lang, items) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb">${items.map((it, i) => it.href ? `<a href="${it.href}">${h(it.name)}</a>` : `<span>${h(it.name)}</span>`).join("<span>/</span>")}</nav>`;
}
function card(routeOrSpot, img, href, text, chips = [], meta = [], className = "") {
  const title = routeOrSpot.title || routeOrSpot.name;
  const chipList = `<div class="chips">${chips.slice(0, 4).map((c) => `<span>${h(c)}</span>`).join("")}</div>`;
  const action = className.split(/\s+/).includes("spot-card")
    ? `<div class="card-actions">${chipList}<a class="card-enter" href="${href}" aria-label="${h(title)}">→</a></div>`
    : `${chipList}<a class="btn-link" href="${href}">→</a>`;
  return `<article class="card ${h(className)}"><a href="${href}"><img src="${h(img)}" alt="${h(title)}" loading="lazy"></a><div class="card-body">${meta.length ? `<div class="card-meta">${meta.map((x) => `<span>${h(x)}</span>`).join("")}</div>` : ""}<h3><a href="${href}">${h(title)}</a></h3><p>${h(text)}</p>${action}</div></article>`;
}
function audioBlock(lang, spot) {
  const s = pageCopy[lang.key].spot;
  return `<section class="audio-guide"><h2>${h(s.audio)}</h2><details open><summary>${h(s.standard)}<span>01</span></summary><audio controls preload="none" src="${h(cleanAsset(spot.audio))}"></audio></details><details><summary>${h(s.deep)}<span>02</span></summary><audio controls preload="none" src="${h(cleanAsset(spot.classic_audio))}"></audio></details></section>`;
}
function routeGrid(lang, limit) {
  const c = pageCopy[lang.key].route;
  return `<div class="grid cards">${routes(lang).slice(0, limit || 99).map((r) => {
    const rs = (r.spots || []).map((id) => spotById(lang, id)).filter(Boolean);
    const areas = [...new Set(rs.map((s) => s.region))].slice(0, 3).join(" · ");
    return card(r, imageForRoute(r, lang), relUrl(lang, `routes/${r.id}`), r.summary || routeCopy[lang.key][0], r.tags || [], [r.duration || c.duration, areas || c.areas, (r.best_for || []).slice(0, 2).join(" · ")], "route-card");
  }).join("")}</div>`;
}
function spotGrid(lang, limit) {
  const c = pageCopy[lang.key].spot;
  const source = spots(lang).slice(0, limit || 99);
  const categories = [...new Set(spots(lang).map((s) => s.category).filter(Boolean))];
  return `<div class="filter-panel"><input class="search" type="search" placeholder="${h(label[lang.key].search)}" aria-label="${h(label[lang.key].search)}"><div class="filters" data-filter-group="region"><button class="active" data-filter="all" aria-pressed="true">${h(label[lang.key].allArea)}</button>${Object.values(regionLocal[lang.key]).map((r) => `<button data-filter="${h(r)}" aria-pressed="false">${h(r)}</button>`).join("")}</div><div class="filters" data-filter-group="category"><button class="active" data-category="all" aria-pressed="true">${h(c.allTypes)}</button>${categories.map((x) => `<button data-category="${h(x)}" aria-pressed="false">${h(x)}</button>`).join("")}</div><p class="result-count"><strong data-result-count>${source.length}</strong> ${h(c.results)}</p></div>
  <div class="grid spot-grid">${source.map((s) => {
    const reg = regionLocal[lang.key][s.region] || s.region;
    return card(s, cleanAsset(s.image), relUrl(lang, `spots/${s.id}`), s.card_line || s.intro || "", (s.tags || []).slice(0, 2), [reg, s.category, s.duration], "spot-card")
      .replace('class="card spot-card"', `class="card spot-card" data-region="${h(reg)}" data-category="${h(s.category || "")}" data-search="${h([s.name, s.city, reg, s.category, ...(s.tags || [])].join(" "))}"`);
  }).join("")}</div>`;
}
function homePage(lang) {
  const t = label[lang.key];
  const c = pageCopy[lang.key];
  const body = `<main>
    <section class="hero">
      <video autoplay muted loop playsinline poster="/kansai-assets/images/nara/nar-0003-kasuga-taisha-shrine-cover.jpg"><source src="/kansai-assets/video/hero/sea_kansai_01_beach_only_42s.mp4" type="video/mp4"></video>
      <div class="hero-overlay wrap"><p class="eyebrow">${h(c.home.kicker)}</p><h1>${h(c.home.title)}</h1><p class="lead">${h(c.home.lead)}</p><div class="hero-actions"><a class="btn primary" href="${contactHref(lang)}">${h(contactCopy[lang.key].navContact)}</a><a class="btn" href="${relUrl(lang, "routes")}">${h(t.routes)}</a></div></div>
    </section>
    <section class="trust-strip wrap"><div class="trust-grid">${c.home.trust.map(([a,b]) => `<div class="trust-item"><strong>${h(a)}</strong><span>${h(b)}</span></div>`).join("")}</div></section>
    <section class="wrap section"><div class="section-head"><div><p class="eyebrow">01 · ${h(t.services)}</p><h2>${h(t.servicesTitle)}</h2></div></div><div class="service-grid">${servicePages.map((s, i) => { const d=serviceDetails[s.id][lang.key]; return `<a class="service-card" href="${h(serviceHref(lang, s.id))}"><span class="number">0${i+1}</span><h3>${h(s.title[lang.key])}</h3><p>${h(d[0])}</p><span class="btn-link">${h(t.view)} →</span></a>`; }).join("")}</div></section>
    <section class="wrap section"><div class="section-head"><div><p class="eyebrow">02 · ${h(t.routes)}</p><h2>${h(c.home.routes)}</h2></div><a class="btn-link" href="${relUrl(lang, "routes")}">${h(t.view)} →</a></div>${routeGrid(lang, 3)}</section>
    <section class="warm-band"><div class="wrap section"><div class="section-head"><div><p class="eyebrow">03 · ${h(t.spots)}</p><h2>${h(c.home.areas)}</h2></div><a class="btn-link" href="${relUrl(lang, "spots")}">${h(t.view)} →</a></div>${spotGrid(lang, 9)}</div></section>
    <section class="wrap section two-col"><div><p class="eyebrow">04 · Daitora Group</p><h2>${h(c.home.operation)}</h2><p class="lead">${h(brand.operated_by_text)}</p><p>${h(brand.vehicle_network_text[lang.key])}</p><a class="btn-link" href="${h(brand.daitora_url)}" rel="noopener" target="_blank">Daitora Group →</a></div><ol class="process">${c.service.steps.map((x) => `<li>${h(x)}</li>`).join("")}</ol></section>
    <section class="surface-band"><div class="wrap section"><div class="section-head"><div><p class="eyebrow">05 · FAQ</p><h2>${h(c.home.faq)}</h2></div><a class="btn-link" href="${relUrl(lang, "faq")}">FAQ →</a></div><div class="faq-list">${faq[lang.key].slice(0,4).map((f) => `<details><summary>${h(f.q)}</summary><p>${h(f.a)}</p></details>`).join("")}</div></div></section>
    <section class="wrap section"><div class="panel two-col home-cta"><div><p class="eyebrow">Japan Travel</p><h2>${h(c.home.ctaTitle)}</h2></div><div class="home-cta-actions"><a class="btn primary" href="${contactHref(lang)}">${h(contactCopy[lang.key].navContact)}</a><a class="btn secondary" href="${relUrl(lang, "spots")}">${h(t.spots)}</a></div></div></section>
  </main>`;
  return layout(lang, "", { title: `Japan Travel | ${c.home.title}`, description: c.home.lead }, body, { ld: baseLd(lang, "", "WebSite") });
}
function routesIndex(lang) {
  const t = label[lang.key];
  const c = pageCopy[lang.key].route;
  const body = `<main class="wrap page">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: t.routes }])}<p class="eyebrow">Kansai day routes</p><h1>${h(t.routesTitle)}</h1><p class="lead">${h(routeCopy[lang.key][1])}</p><div class="filters" data-route-filters>${c.filters.map((x,i) => `<button class="${i===0?"active":""}" data-route-filter="${i===0?"all":h(x)}" aria-pressed="${i===0?"true":"false"}">${h(x)}</button>`).join("")}</div>${routeGrid(lang)}</main>`;
  return layout(lang, "routes", { title: `${t.routesTitle} | Japan Travel`, description: routeCopy[lang.key][1] }, body, { ld: baseLd(lang, "routes", "CollectionPage") });
}
function routeDetail(lang, id) {
  const r = routeById(lang, id);
  const t = label[lang.key];
  const routeSpots = (r.spots || []).map((sid) => spotById(lang, sid)).filter(Boolean);
  const c = pageCopy[lang.key].route;
  const areas = [...new Set(routeSpots.map((s) => s.region))].join(" · ");
  const body = `<main>
    <section class="detail-hero" style="--hero:url('${h(imageForRoute(r, lang))}')"><div class="wrap">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: t.routes, href: relUrl(lang, "routes") }, { name: r.title }])}<h1>${h(r.title)}</h1><p>${h(r.summary || r.subtitle || routeCopy[lang.key][0])}</p><div class="chips">${(r.tags || []).map((x) => `<span>${h(x)}</span>`).join("")}</div></div></section>
    <section class="wrap page"><div class="route-summary"><div><strong>${h(c.duration)}</strong>${h(r.duration || "")}</div><div><strong>${h(c.areas)}</strong>${h(areas)}</div><div><strong>${h(c.bestFor)}</strong>${h((r.best_for || []).join(" · "))}</div><div><strong>${h(c.walking)}</strong>${h(c.walkValue)}</div></div><div class="btn-row"><a class="btn primary" href="${contactHref(lang)}">${h(contactCopy[lang.key].navContact)}</a></div><div class="reading"><h2>${h(c.summary)}</h2><p>${h(r.detail || r.summary || "")}</p></div><h2>${h(c.timeline)}</h2><div class="timeline">${routeSpots.map((s, i) => `<article data-step="${String(i+1).padStart(2,"0")}"><img src="${h(cleanAsset(s.image))}" alt="${h(s.name)}" loading="lazy"><div><h3>${h(s.name)}</h3><p>${h(s.card_line || s.intro || "")}</p><p class="meta-note">${h(s.duration || "")}</p><a class="btn-link" href="${relUrl(lang, `spots/${s.id}`)}">${h(c.spotCta)} →</a></div></article>`).join("")}</div>
    <section class="panel"><h2>${h(contactCopy[lang.key].panelTitle)}</h2><p>${h(contactCopy[lang.key].notConfirmed)}</p><a class="btn primary" href="${contactHref(lang)}">${h(contactCopy[lang.key].navContact)}</a></section></section><div class="sticky-booking"><a class="btn primary" href="${contactHref(lang)}">${h(contactCopy[lang.key].navContact)}</a></div>
  </main>`;
  return layout(lang, `routes/${id}`, { title: `${r.title} | Japan Travel`, description: r.summary || routeCopy[lang.key][0] }, body, { ld: [...baseLd(lang, `routes/${id}`, "Article"), faqLd(lang, 4)] });
}
function spotsIndex(lang) {
  const t = label[lang.key];
  const body = `<main class="wrap page">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: t.spots }])}<p class="eyebrow">73 Kansai places</p><h1>${h(t.spotsTitle)}</h1><p class="lead">${h(t.noLogin)}</p>${spotGrid(lang)}</main>`;
  return layout(lang, "spots", { title: `${t.spotsTitle} | Japan Travel`, description: `${spots(lang).length} Kansai spots with text and audio guides.` }, body, { ld: baseLd(lang, "spots", "CollectionPage") });
}
function spotDetail(lang, id) {
  const s = spotById(lang, id);
  const t = label[lang.key];
  const related = routes(lang).filter((r) => (r.spots || []).includes(id));
  const near = spots(lang).filter((x) => x.id !== id && x.region === s.region).slice(0, 4);
  const c = pageCopy[lang.key].spot;
  const media = mediaSources[cleanAsset(s.image)] || {};
  const originalRegion = spotById(langByKey.get("zh"), id)?.region;
  const source = spotSources.bySpot[id] || spotSources.byRegion[originalRegion] || {};
  const sourceName = s.source_name || source.name || media.official_name || brand.default_source_name;
  const sourceUrl = s.source_url || source.url || media.official_url || brand.default_source_url;
  const best = [...(s.best_for || []), ...(s.tags || [])].slice(0, 4);
  const body = `<main>
    <section class="detail-hero" style="--hero:url('${h(cleanAsset(s.image))}')"><div class="wrap">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: t.spots, href: relUrl(lang, "spots") }, { name: s.name }])}<h1>${h(s.name)}</h1><p>${h(s.card_line || "")}</p><div class="chips">${(s.tags || []).map((x) => `<span>${h(x)}</span>`).join("")}</div></div></section>
    <section class="wrap page"><div class="facts-grid"><div class="fact"><strong>${h(c.type)}</strong>${h(s.category || "")}</div><div class="fact"><strong>${h(c.stay)}</strong>${h(s.duration || "")}</div><div class="fact"><strong>${h(c.bestFor)}</strong>${h(best.join(" · "))}</div></div><div class="two-col"><div class="reading"><p class="lead">${h(s.intro || "")}</p><h2>${h(c.family)}</h2><p>${h(s.tip || c.before)}</p><h2>${h(c.combine)}</h2><p>${h(related.map((r) => r.title).join(" · ") || c.before)}</p></div>${audioBlock(lang, s)}</div><section class="source-box"><h2>${h(c.official)}</h2><p><a href="${h(sourceUrl)}" rel="nofollow noopener" target="_blank">${h(sourceName)}</a> · ${h(c.checked)}: ${h(brand.last_reviewed_at)}</p><p>${h(c.before)}</p></section>
    <h2>${h(t.relatedRoutes)}</h2><div class="grid cards">${related.map((r) => card(r, imageForRoute(r, lang), relUrl(lang, `routes/${r.id}`), r.summary || "", r.tags || [])).join("") || `<p>${h(t.unavailable)}</p>`}</div>
    <h2>${h(t.nearby)}</h2><div class="grid cards">${near.map((x) => card(x, cleanAsset(x.image), relUrl(lang, `spots/${x.id}`), x.card_line || "", x.tags || [])).join("")}</div></section>
  </main>`;
  return layout(lang, `spots/${id}`, { title: `${s.name} | Japan Travel`, description: `${s.name} (${s.city || s.region || id}): ${s.card_line || s.intro || ""}` }, body, { ld: [...baseLd(lang, `spots/${id}`, "TouristAttraction"), touristLd(lang, s)] });
}
function servicesIndex(lang, page) {
  const t = label[lang.key];
  const c = pageCopy[lang.key];
  const title = page.title[lang.key];
  const d = serviceDetails[page.id];
  const points = d[lang.key];
  const hasInlineInquiry = page.id === "airport-transfer";
  const inquiryHref = hasInlineInquiry ? "#transport-inquiry" : contactHref(lang);
  const inquirySection = hasInlineInquiry ? `    <section class="surface-band" id="transport-inquiry"><div class="wrap section contact-page"><p class="eyebrow">Japan Travel · Daitora Group</p><h2>${h(contactCopy[lang.key].title)}</h2><p class="lead">${h(contactCopy[lang.key].help)}</p>${contactFormV2(lang, "airport_transfer")}</div></section>\n` : "";
  const planningSection = hasInlineInquiry ? "" : `    <section class="wrap section two-col"><div><h2>${h(c.service.vehicles)}</h2><p>${h(brand.vehicle_boundary[lang.key])}</p><a class="btn-link" href="${relUrl(lang, "vehicles")}">${h(pageCopy[lang.key].vehicles.title)} →</a></div><div><h2>${h(contactCopy[lang.key].panelTitle)}</h2><p>${h(contactCopy[lang.key].notConfirmed)}</p><a class="btn primary" href="${inquiryHref}">${h(contactCopy[lang.key].navContact)}</a></div></section>\n`;
  const body = `<main><section class="detail-hero" style="--hero:url('${h(d.image)}')"><div class="wrap">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: t.services, href: relUrl(lang, "services/airport-transfer") }, { name: title }])}<p class="eyebrow">Japan Travel · Daitora Group</p><h1>${h(title)}</h1><p>${h(points[0])}</p><div class="btn-row"><a class="btn primary" href="${inquiryHref}">${h(contactCopy[lang.key].navContact)}</a></div></div></section>
    <section class="wrap section"><div class="section-head"><div><h2>${h(c.service.scenes)}</h2><p>${h(points[0])}</p></div></div><ul class="feature-list">${points.slice(1).map((p) => `<li><strong>${h(p)}</strong></li>`).join("")}</ul></section>
    <section class="surface-band"><div class="wrap section"><h2>${h(c.service.process)}</h2><ol class="process">${c.service.steps.map((x) => `<li>${h(x)}</li>`).join("")}</ol></div></section>
${planningSection}${inquirySection}    <section class="warm-band"><div class="wrap section"><h2>${h(c.service.faq)}</h2><div class="faq-list">${faq[lang.key].slice(0, 5).map((f) => `<details><summary>${h(f.q)}</summary><p>${h(f.a)}</p></details>`).join("")}</div><p class="boundary">${h(t.bookingBoundary)}</p></div></section></main>`;
  return layout(lang, `services/${page.id}`, { title: `${title} | Japan Travel`, description: `${title}: ${points.join(" ")}` }, body, { ld: [...baseLd(lang, `services/${page.id}`, "Service"), faqLd(lang, 5)] });
}
function vehiclePage(lang, page) {
  const t = label[lang.key];
  const c = pageCopy[lang.key];
  const title = page.title[lang.key];
  const types = page.id === "index" ? vehiclePages : [page];
  const body = `<main class="wrap page">${breadcrumb(lang, [{ name: t.home, href: relUrl(lang) }, { name: c.vehicles.title, href: relUrl(lang, "vehicles") }, ...(page.id === "index" ? [] : [{ name: title }])])}<p class="eyebrow">Vehicle planning</p><h1>${h(title)}</h1><p class="lead">${h(c.vehicles.lead)}</p><div class="grid cards">${types.map((v) => `<article class="card"><div class="vehicle-visual" role="img" aria-label="${h(v.title[lang.key])}">${h(v.title[lang.key])}</div><div class="card-body"><h2>${h(v.title[lang.key])}</h2><div class="card-meta"><span>${h(c.vehicles.people)}</span><span>${h(c.vehicles.luggage)}</span></div><p>${h(brand.vehicle_boundary[lang.key])}</p>${page.id === "index" ? `<a class="btn-link" href="${relUrl(lang, `vehicles/${v.id}`)}">${h(t.view)} →</a>` : ""}</div></article>`).join("")}</div><section class="section"><h2>${h(c.vehicles.compare)}</h2><table class="comparison"><thead><tr><th>${h(c.vehicles.title)}</th><th>${h(c.vehicles.people)}</th><th>${h(c.vehicles.luggage)}</th><th>${h(c.vehicles.scene)}</th></tr></thead><tbody><tr><td>Alphard</td><td>1–4</td><td>${h(c.vehicles.luggage)}</td><td>${h(c.vehicles.child)}</td></tr><tr><td>Hiace</td><td>5–9</td><td>${h(c.vehicles.large)}</td><td>${h(c.vehicles.scene)}</td></tr></tbody></table><p class="boundary">${h(c.vehicles.pending)}</p><a class="btn primary" href="${contactHref(lang)}">${h(c.nav.cta)}</a></section></main>`;
  return layout(lang, page.id === "index" ? "vehicles" : `vehicles/${page.id}`, { title: `${title} | Japan Travel`, description: `${title}: ${brand.vehicle_boundary?.[lang.key] || t.bookingBoundary} ${t.bookingBoundary}` }, body, { ld: baseLd(lang, page.id === "index" ? "vehicles" : `vehicles/${page.id}`, "WebPage") });
}
function productCards(lang) {
  const t = label[lang.key];
  const c = pageCopy[lang.key].product;
  return `<div class="grid cards">${productPages.map((p) => card({ title: p.title[lang.key] }, productMedia[p.id], relUrl(lang, `products/${p.id}`), c.traffic, [c.people, c.vehicle], ["KIX", p.id.replace("kix-", "").toUpperCase()], "product-card")).join("")}</div>`;
}
function productsIndex(lang, page) {
  const t = label[lang.key];
  const c = pageCopy[lang.key];
  if (!page) {
    const body = `<main class="wrap page"><p class="eyebrow">Kansai airport transfer</p><h1>${h(t.productsTitle)}</h1><p class="lead">${h(t.rezioBoundary)}</p>${productCards(lang)}<p class="boundary">${h(c.product.traffic)} ${h(c.product.specialNote)}</p></main>`;
    return layout(lang, "products", { title: `${t.productsTitle} | Japan Travel`, description: `${t.productsTitle}: ${t.rezioBoundary}` }, body, { ld: baseLd(lang, "products", "CollectionPage") });
  }
  const title = page.title[lang.key];
  const dest = page.id.replace("kix-", "").toUpperCase();
  const body = `<main class="wrap page"><div class="product-hero"><img src="${h(productMedia[page.id])}" alt="${h(title)}"><div><p class="eyebrow">KIX → ${h(dest)}</p><h1>${h(title)}</h1><p>${h(c.product.traffic)}</p><a class="btn primary" href="${contactHref(lang)}">${h(contactCopy[lang.key].navContact)}</a></div></div><section class="section"><div class="facts-grid"><div class="fact"><strong>${h(c.product.fromTo)}</strong>KIX → ${h(dest)}</div><div class="fact"><strong>${h(c.product.time)}</strong>${h(c.product.traffic)}</div><div class="fact"><strong>${h(c.product.people)}</strong>${h(brand.luggage_boundary[lang.key])}</div></div><div class="two-col"><div><h2>${h(c.product.scene)}</h2><p>${h(t.bookingBoundary)}</p><h2>${h(c.product.vehicle)}</h2><p>${h(brand.vehicle_boundary[lang.key])}</p></div><div class="panel"><h2>${h(contactCopy[lang.key].panelTitle)}</h2><p>${h(contactCopy[lang.key].notConfirmed)}</p><a class="btn primary" href="${contactHref(lang)}">${h(contactCopy[lang.key].navContact)}</a></div></div><p class="boundary">${h(c.product.specialNote)}</p></section></main>`;
  return layout(lang, `products/${page.id}`, { title: `${title} | Japan Travel`, description: `${title}: ${contactCopy[lang.key].notConfirmed}` }, body, { ld: baseLd(lang, `products/${page.id}`, "WebPage") });
}
function faqPage(lang) {
  const t = label[lang.key];
  const c = pageCopy[lang.key];
  const groups = c.faqCategories.map((name, i) => ({ name, items: faq[lang.key].filter((_, n) => n % c.faqCategories.length === i) })).filter((g) => g.items.length);
  const body = `<main class="wrap page"><p class="eyebrow">Japan Travel guide</p><h1>FAQ</h1><nav class="faq-directory" aria-label="FAQ categories">${groups.map((g,i) => `<a href="#faq-${i}">${h(g.name)}</a>`).join("")}</nav>${groups.map((g,i) => `<section class="faq-group" id="faq-${i}"><h2>${h(g.name)}</h2><div class="faq-list">${g.items.map((f) => `<details><summary>${h(f.q)}</summary><p>${h(f.a)}</p></details>`).join("")}</div></section>`).join("")}</main>`;
  return layout(lang, "faq", { title: `FAQ | Japan Travel`, description: faq[lang.key].slice(0, 3).map((x) => x.q).join(" / ") }, body, { ld: [...baseLd(lang, "faq", "FAQPage"), faqLd(lang, 32)] });
}
function contactPage(lang) {
  return legacyPage(contactHref(lang));
}
function vehicleSelector(lang) {
  const copy = vehicleFormCopy[lang.key];
  const limits = {
    staff_recommendation: [0, 0],
    alphard: [4, 4],
    hiace: [9, 9],
    multiple_vehicles: [0, 0]
  };
  const options = Object.entries(copy.options).map(([value, details]) => {
    const [maxPeople, maxLuggage] = limits[value];
    return `<option value="${h(value)}" data-people="${h(details[1])}" data-luggage="${h(details[2])}" data-scene="${h(details[3])}" data-max-people="${maxPeople}" data-max-luggage="${maxLuggage}">${h(details[0])}</option>`;
  }).join("");
  const initial = copy.options.staff_recommendation;
  return `<div class="vehicle-picker full" id="vehicle-selection" data-vehicle-picker>
    <label for="contact-vehicle_preference">${h(copy.label)}<select id="contact-vehicle_preference" name="vehicle_preference">${options}</select></label>
    <div class="vehicle-guidance" data-vehicle-guidance aria-live="polite">
      <div class="vehicle-guidance-head"><strong data-vehicle-name>${h(initial[0])}</strong><span>${h(copy.guide)}</span></div>
      <div class="vehicle-guidance-metrics">
        <div><small>${h(copy.people)}</small><strong data-vehicle-people>${h(initial[1])}</strong></div>
        <div><small>${h(copy.luggage)}</small><strong data-vehicle-luggage>${h(initial[2])}</strong></div>
        <div><small>${h(copy.scene)}</small><strong data-vehicle-scene>${h(initial[3])}</strong></div>
      </div>
      <p class="vehicle-guidance-warning" data-vehicle-warning hidden>${h(copy.review)}</p>
      <p class="vehicle-guidance-note">${h(copy.note)}</p>
    </div>
  </div>`;
}
function contactFormV2(lang, selectedService = "") {
  const t = label[lang.key];
  const copy = contactCopy[lang.key];
  const fields = copy.fields;
  const input = (name, options = {}) => {
    const id = `contact-${name}`;
    const type = options.type || (name === "email" ? "email" : name.includes("date") ? "date" : name.includes("time") ? "time" : options.number ? "number" : "text");
    const required = options.required ? " required" : "";
    const attrs = options.number ? ' min="0" max="100" inputmode="numeric"' : '';
    return `<label for="${id}" class="${options.full ? "full" : ""}">${h(fields[name])}${options.required ? ' <span class="required" aria-hidden="true"></span>' : ''}${options.textarea ? `<textarea id="${id}" name="${name}" maxlength="4000"${required}></textarea>` : `<input id="${id}" name="${name}" type="${type}" maxlength="${options.number ? 3 : 500}"${attrs}${required}>`}</label>`;
  };
  const serviceOptions = Object.entries(copy.services).map(([value, text]) => `<option value="${h(value)}"${selectedService && value === selectedService ? " selected" : ""}>${h(text)}</option>`).join("");
  return `<form class="contact-form" method="post" action="/api/inquiry.php" data-enhanced-form>
    <input type="hidden" name="language" value="${h(lang.slug)}"><input type="hidden" name="source_url" value=""><input type="hidden" name="idempotency_key" value="">
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="form-sections">
      <fieldset class="form-section"><legend>${h(copy.contactSection)}</legend><div class="form-grid">${input("name",{required:true})}${input("email",{required:true})}${input("phone")}<label for="contact-method">${h(fields.contact_method)}<select id="contact-method" name="contact_method"><option value="email">Email</option><option value="phone">${h(fields.phone)}</option><option value="line">LINE</option><option value="wechat">WeChat</option><option value="whatsapp">WhatsApp</option></select></label></div></fieldset>
      <fieldset class="form-section"><legend>${h(copy.transportSection)}</legend><div class="form-grid"><label for="contact-service">${h(fields.service_type)} <span class="required" aria-hidden="true"></span><select id="contact-service" name="service_type" required>${serviceOptions}</select></label>${input("travel_date")}${input("travel_time")}${input("flight_number")}${input("pickup_location",{required:true})}${input("dropoff_location",{required:true})}${input("passenger_count",{number:true})}${input("luggage_count",{number:true})}${vehicleSelector(lang)}</div></fieldset>
      <fieldset class="form-section"><legend>${h(copy.requestSection)}</legend><div class="form-grid">${input("itinerary",{textarea:true,full:true,required:true})}</div></fieldset>
    </div>
    <label class="check"><input type="checkbox" name="privacy_consent" value="1" required> ${h(t.form.privacy)}</label>
    <button class="btn primary" type="submit">${h(copy.submit)}</button><p class="form-status" data-form-status aria-live="polite"></p>
  </form>`;
}
function contactForm(lang) {
  const t = label[lang.key];
  const c = pageCopy[lang.key];
  const formLabels = {
    zh: { name: "姓名", email: "邮箱", phone: "电话", line_id: "LINE", wechat: "微信", whatsapp: "WhatsApp", service_type: "服务类型", travel_date: "出行日期", travel_time: "出行时间", flight_number: "航班号", pickup_location: "上车地点", dropoff_location: "下车地点", passenger_count: "乘客人数", luggage_count: "行李数量", vehicle_preference: "车型偏好", child_seat: "儿童座椅", itinerary: "行程", notes: "备注" },
    zhHant: { name: "姓名", email: "信箱", phone: "電話", line_id: "LINE", wechat: "微信", whatsapp: "WhatsApp", service_type: "服務類型", travel_date: "出行日期", travel_time: "出行時間", flight_number: "航班號", pickup_location: "上車地點", dropoff_location: "下車地點", passenger_count: "乘客人數", luggage_count: "行李數量", vehicle_preference: "車型偏好", child_seat: "兒童座椅", itinerary: "行程", notes: "備註" },
    ja: { name: "お名前", email: "メール", phone: "電話", line_id: "LINE", wechat: "WeChat", whatsapp: "WhatsApp", service_type: "サービス種別", travel_date: "利用日", travel_time: "利用時間", flight_number: "便名", pickup_location: "乗車地", dropoff_location: "降車地", passenger_count: "人数", luggage_count: "荷物数", vehicle_preference: "車種希望", child_seat: "チャイルドシート", itinerary: "行程", notes: "備考" },
    en: { name: "Name", email: "Email", phone: "Phone", line_id: "LINE", wechat: "WeChat", whatsapp: "WhatsApp", service_type: "Service type", travel_date: "Travel date", travel_time: "Travel time", flight_number: "Flight number", pickup_location: "Pickup location", dropoff_location: "Drop-off location", passenger_count: "Passengers", luggage_count: "Luggage", vehicle_preference: "Vehicle preference", child_seat: "Child seat", itinerary: "Itinerary", notes: "Notes" },
    ko: { name: "이름", email: "이메일", phone: "전화", line_id: "LINE", wechat: "WeChat", whatsapp: "WhatsApp", service_type: "서비스 종류", travel_date: "이용일", travel_time: "이용 시간", flight_number: "항공편", pickup_location: "승차 장소", dropoff_location: "하차 장소", passenger_count: "인원", luggage_count: "수하물", vehicle_preference: "차종 희망", child_seat: "유아 시트", itinerary: "일정", notes: "메모" }
  }[lang.key];
  const field = (name, options = {}) => { const id = `contact-${name}`; const type = options.type || (name === "email" ? "email" : name.includes("date") ? "date" : name.includes("time") ? "time" : "text"); return `<label for="${id}" class="${options.full ? "full" : ""}">${h(formLabels[name] || name)}${options.required ? ` <span class="required" aria-hidden="true"></span>` : ""}${options.textarea ? `<textarea id="${id}" name="${name}" maxlength="2000"></textarea>` : `<input id="${id}" name="${name}" type="${type}" ${options.required ? "required" : ""} maxlength="500">`}</label>`; };
  return `<form class="contact-form" method="post" action="/api/inquiry.php" data-enhanced-form>
    <input type="hidden" name="language" value="${h(lang.slug)}"><input type="hidden" name="source_url" value=""><input type="hidden" name="idempotency_key" value="">
    <input class="hp" name="website" tabindex="-1" autocomplete="off">
    <div class="form-sections"><fieldset class="form-section"><legend>${h(c.contact.contact)}</legend><div class="form-grid">${field("name",{required:true})}${field("email",{required:true})}<label for="contact-method">${h(c.contact.method)}<select id="contact-method" name="contact_method" data-contact-method><option value="email">Email</option><option value="phone">${h(formLabels.phone)}</option><option value="line_id">LINE</option><option value="wechat">WeChat</option><option value="whatsapp">WhatsApp</option></select></label><div class="contact-method-fields">${["phone","line_id","wechat","whatsapp"].map((x) => `<div data-contact-field="${x}">${field(x,{full:true})}</div>`).join("")}</div></div></fieldset>
    <fieldset class="form-section"><legend>${h(c.contact.transport)}</legend><div class="form-grid">${field("service_type")}${field("travel_date")}${field("travel_time")}${field("flight_number")}${field("pickup_location",{required:true})}${field("dropoff_location",{required:true})}${field("passenger_count")}${field("luggage_count")}</div></fieldset>
    <fieldset class="form-section"><legend>${h(c.contact.special)}</legend><div class="form-grid">${field("vehicle_preference")}${field("child_seat")}${field("itinerary",{textarea:true,full:true})}${field("notes",{textarea:true,full:true})}</div></fieldset></div>
    <label class="check"><input type="checkbox" name="privacy_consent" value="1" required> ${h(t.form.privacy)}</label>
    <button class="btn primary" type="submit">${h(t.consult)}</button><p class="form-status" data-form-status></p>
  </form>`;
}
function memberPage(lang, slug) {
  const t = label[lang.key];
  const m = t.member;
  const memberTitles = m;
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
  const emailField = ["register", "login", "reset-password"].includes(slug) ? `<label>${h(m.email)}<input name="email" type="email" autocomplete="email" required></label>` : "";
  const passwordField = ["register", "login"].includes(slug) ? `<label>${h(m.password)}<input name="password" type="password" autocomplete="${slug === "login" ? "current-password" : "new-password"}" ${slug === "register" ? "minlength=\"10\"" : ""} required></label>` : "";
  const resetTokenFields = slug === "reset-password" ? `<label>${h(m.token)}<input name="token" autocomplete="one-time-code"></label><label>${h(m.newPassword)}<input name="new_password_display" type="password" autocomplete="new-password" minlength="10" oninput="this.form.password.value=this.value"></label><input type="hidden" name="password">` : "";
  const verifyTokenField = slug === "verify-email" ? `<label>${h(m.token)}<input name="token" autocomplete="one-time-code" required></label>` : "";
  const nicknameField = ["register", "profile"].includes(slug) ? `<label>${h(m.nickname)}<input name="nickname" maxlength="80" autocomplete="nickname"></label>` : "";
  const ambassadorField = slug === "ambassador" ? `<label>${h(m.message)}<textarea name="message" maxlength="2000"></textarea></label>` : "";
  const actionField = `<input type="hidden" name="action" value="${h(action)}">`;
  const publicAuth = ["login", "register", "verify-email", "reset-password"].includes(slug);
  const formNeeded = publicAuth || ["profile", "ambassador"].includes(slug);
  const form = formNeeded ? `<section class="panel"><form class="member-form" method="post" action="/api/member.php" data-member-form>${actionField}<input type="hidden" name="language" value="${h(lang.slug)}">${emailField}${passwordField}${verifyTokenField}${resetTokenFields}${nicknameField}${ambassadorField}<button class="btn primary" type="submit">${h(title)}</button><p data-member-status></p></form></section>` : "";
  const authedTools = !publicAuth ? `<section class="panel member-data" data-member-panel data-member-page="${h(slug)}"><p data-member-status></p><div data-member-content></div></section>` : "";
  const body = `<main class="wrap page member-shell" data-member-shell data-member-page="${h(slug)}"><p class="eyebrow">Japan Travel member</p><h1>${h(title)}</h1><p class="lead">${h(t.memberLead)}</p><div class="${publicAuth ? "reading" : "sidebar-layout"}">${publicAuth ? "" : memberSideNav(lang, slug)}<div>${form}${authedTools}</div></div></main>`;
  return layout(lang, `member/${slug}`, { title: `${title} | Japan Travel`, description: `${title}. ${t.memberLead}` }, body, { noindex: true, ld: baseLd(lang, `member/${slug}`, "WebPage") });
}
function memberDashboard(lang) {
  const t = label[lang.key];
  const m = t.member;
  const body = `<main class="wrap page member-shell" data-member-shell data-member-page="dashboard"><p class="eyebrow">Japan Travel member</p><h1>${h(m.dashboard)}</h1><p class="lead">${h(t.memberLead)}</p><div class="sidebar-layout">${memberSideNav(lang, "dashboard")}<div><section class="panel member-data" data-member-panel data-member-page="dashboard"><p data-member-status></p><div data-member-content></div></section></div></div></main>`;
  return layout(lang, "member", { title: `${m.dashboard} | Japan Travel`, description: `${m.dashboard}. ${t.memberLead}` }, body, { noindex: true, ld: baseLd(lang, "member", "WebPage") });
}
function memberSideNav(lang, current) {
  const m = label[lang.key].member;
  return `<nav class="side-nav" aria-label="Member">${["dashboard","profile","favorites","trips","bookings","referrals","vip","ambassador"].map((slug) => `<a href="${relUrl(lang, slug === "dashboard" ? "member" : `member/${slug}`)}" ${slug === current ? 'aria-current="page"' : ""}>${h(m[slug])}</a>`).join("")}<button class="btn-link" type="button" data-member-logout>${h(m.logout)}</button></nav>`;
}
function infoPage(lang, slug) {
  const t = label[lang.key];
  const c = pageCopy[lang.key];
  const titles = {
    about: c.info.about,
    privacy: c.info.privacy,
    terms: c.info.terms,
    vip: c.info.vip,
    referral: c.info.referral,
    ambassador: c.info.ambassador
  };
  const lead = slug === "vip" ? c.info.vipLead : slug === "referral" ? c.info.referralLead : slug === "ambassador" ? c.info.ambassadorLead : brand.operated_by_text;
  const body = `<main class="wrap page"><p class="eyebrow">Japan Travel · Daitora Group</p><h1>${h(titles[slug])}</h1><p class="lead">${h(lead)}</p>${slug === "about" ? aboutText(lang) : ""}${slug === "privacy" ? privacyText(lang) : ""}${slug === "terms" ? termsText(lang) : ""}${slug === "vip" ? vipText(lang) : ""}${slug === "referral" ? referralText(lang, false) : ""}${slug === "ambassador" ? referralText(lang, true) : ""}</main>`;
  return layout(lang, slug, { title: `${titles[slug]} | Japan Travel`, description: `${titles[slug]}. ${brand.operated_by_text}. ${lang.name}.` }, body, { ld: baseLd(lang, slug, "WebPage") });
}
function aboutText(lang) {
  const t = label[lang.key];
  const c = pageCopy[lang.key];
  return `<div class="two-col"><section><h2>${h(c.info.about)}</h2><p>${h(brand.operated_by_text)}</p><p>${h(brand.service_area_text[lang.key])}</p><p>${h(brand.vehicle_network_text[lang.key])}</p><a class="btn-link" href="${h(brand.daitora_url)}" rel="noopener" target="_blank">Daitora Group →</a></section><section class="panel"><h2>${h(c.home.operation)}</h2><ol class="process">${c.service.steps.map((x) => `<li>${h(x)}</li>`).join("")}</ol></section></div><p class="boundary">${h(t.bookingBoundary)} ${h(t.rezioBoundary)}</p>`;
}
function privacyText(lang) {
  const c = pageCopy[lang.key];
  const headings = [c.contact.contact, "Cookie", "Meta / TikTok", "Email", c.info.about];
  return `<section class="reading">${headings.map((x,i) => `<h2>${h(x)}</h2><p>${h(brand.privacy_summary[lang.key])}${i===1 ? ` ${h(label[lang.key].cookie.message)}` : ""}</p>`).join("")}<p class="meta-note">${h(c.spot.checked)}: ${h(brand.last_reviewed_at)}</p></section>`;
}
function termsText(lang) {
  const c = pageCopy[lang.key];
  const headings = [c.info.terms, c.product.book, c.product.inventory, c.product.special, c.info.referral, c.contact.contact];
  return `<section class="reading">${headings.map((x) => `<h2>${h(x)}</h2><p>${h(brand.terms_summary[lang.key])}</p>`).join("")}<p class="meta-note">${h(c.spot.checked)}: ${h(brand.last_reviewed_at)}</p></section>`;
}
function vipText(lang) {
  const c = pageCopy[lang.key];
  const tiers = ["Member", "VIP Friend", "Circle Host", "Premier Host"];
  return `<section><h2>${h(c.info.vip)}</h2><div class="grid cards">${tiers.map((x,i) => `<article class="panel"><p class="eyebrow">0${i+1}</p><h3>${x}</h3><p>${h(brand.vip_rules[lang.key][Math.min(i, brand.vip_rules[lang.key].length-1)])}</p></article>`).join("")}</div><p class="boundary">${h(label[lang.key].bookingBoundary)}</p><div class="btn-row"><a class="btn primary" href="${relUrl(lang, "member/vip")}">${h(c.info.login)}</a><a class="btn secondary" href="${contactHref(lang)}">${h(contactCopy[lang.key].navContact)}</a></div></section>`;
}
function referralText(lang, ambassador = false) {
  const c = pageCopy[lang.key];
  const title = ambassador ? c.info.ambassador : c.info.referral;
  const rules = ambassador ? [c.info.ambassadorLead, ...brand.referral_rules[lang.key].slice(0, 2)] : brand.referral_rules[lang.key];
  return `<section><h2>${h(title)}</h2><ul class="feature-list">${rules.map((x) => `<li>${h(x)}</li>`).join("")}</ul><p class="boundary">${h(c.contact.help)}</p><a class="btn primary" href="${relUrl(lang, ambassador ? "member/ambassador" : "member/referrals")}">${h(c.info.login)}</a></section>`;
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Japan Travel | Kansai travel and transport</title><meta name="description" content="Kansai airport transfers, private charters, day routes and guides to 73 places, operated by Daitora Group."><link rel="canonical" href="${siteUrl}/">${pageLangAlternates("")}<link rel="stylesheet" href="/assets/css/site.css"></head><body><main class="root-hero"><video autoplay muted loop playsinline poster="/kansai-assets/images/nara/nar-0003-kasuga-taisha-shrine-cover.jpg"><source src="/kansai-assets/video/hero/sea_kansai_01_beach_only_42s.mp4" type="video/mp4"></video><div class="root-inner wrap"><p class="eyebrow">Kansai · Japan</p><h1>Japan Travel</h1><p>Kansai travel content, airport transfers, private charters and day routes. Operated by 株式会社大寅 / Daitora Group, supported by a group-wide vehicle network of about 100 vehicles.</p><div class="language-grid">${langs.map((l) => `<a href="${relUrl(l)}"><span>${l.label}</span><small>${h(l.name)}</small></a>`).join("")}</div></div></main></body></html>`;
}
function legacyPage(to) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="description" content="This old Japan Travel URL has moved to the new language directory structure."><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0; url=${h(to)}"><link rel="canonical" href="${siteUrl}${to}"><title>Japan Travel Page Moved</title></head><body><h1>Japan Travel Page Moved</h1><p><a href="${h(to)}">Continue to the new page</a></p></body></html>`;
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
    memberApiBase: process.env.MEMBER_API_BASE || ""
  };
  writeFile("assets/js/site-config.js", `window.JAPAN_TRAVEL_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`);
}
function cleanGenerated() {
  for (const l of langs) fs.rmSync(path.join(root, l.slug), { recursive: true, force: true });
  for (const item of ["index-ja.html", "index-en.html", "index-ko.html", "index-zhHant.html", "h5", "spots", "member", "products", "vip", "referral", "ambassador", "go"]) {
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
    for (const p of productPages) writeLangPage(lang, `products/${p.id}`, productsIndex(lang, p));
    writeLangPage(lang, "faq", faqPage(lang));
    writeLangPage(lang, "contact", contactPage(lang));
    writeLangPage(lang, "privacy", infoPage(lang, "privacy"));
    writeLangPage(lang, "terms", infoPage(lang, "terms"));
    writeLangPage(lang, "vip", infoPage(lang, "vip"));
    writeLangPage(lang, "referral", infoPage(lang, "referral"));
    writeLangPage(lang, "ambassador", infoPage(lang, "ambassador"));
    writeLangPage(lang, "404", notFound(lang));
    writeLangPage(lang, "member", memberDashboard(lang));
    for (const p of memberPages) writeLangPage(lang, `member/${p}`, memberPage(lang, p));
  }
  writeFile("robots.txt", `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /runtime/\nSitemap: ${siteUrl}/sitemap.xml\n`);
  writeFile("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicPages.filter((p) => !p.rest.startsWith("member/") && !["404", "contact"].includes(p.rest)).map((p) => `  <url><loc>${canonical(p.lang, p.rest)}</loc></url>`).join("\n")}\n</urlset>\n`);
  writeFile(".htaccess", `DirectoryIndex index.html\nRewriteEngine On\nRewriteRule ^runtime/private/ - [F,L]\nRewriteRule ^h5/?$ /zh-cn/ [R=301,L]\nRewriteRule ^h5/routes/([^/]+)/?$ /zh-cn/routes/$1/ [R=301,L]\nRewriteRule ^spots/([^/]+)/?$ /zh-cn/spots/$1/ [R=301,L]\nRewriteRule ^(ja|en|zh-cn|zh-tw|ko)/contact/?$ /$1/services/airport-transfer/ [R=301,L]\nRewriteRule ^(ja|en|zh-cn|zh-tw|ko)/products/?$ /$1/services/airport-transfer/ [R=301,L]\nRewriteRule ^(ja|en|zh-cn|zh-tw|ko)/about/?$ /$1/ [R=301,L]\nRewriteRule ^go/rezio/.*$ /ja/services/airport-transfer/ [R=302,L]\n<FilesMatch "^(\\.env|.*\\.sqlite|.*\\.log)$">\n  Require all denied\n</FilesMatch>\n`);
  const sha = crypto.createHash("sha256")
    .update(JSON.stringify(content))
    .update(JSON.stringify(brand))
    .update(JSON.stringify(faq))
    .update([...generated].sort().join("\n"))
    .digest("hex");
  const manifestFile = path.join(root, "src/generated-manifest.json");
  let previous = {};
  if (fs.existsSync(manifestFile)) {
    try { previous = JSON.parse(fs.readFileSync(manifestFile, "utf8")); } catch (_) { previous = {}; }
  }
  const manifest = {
    generatedAt: previous.sha === sha && previous.generatedAt ? previous.generatedAt : new Date().toISOString(),
    pages: publicPages.length + 3,
    sha
  };
  writeFile("src/generated-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Generated ${manifest.pages} html targets for ${langs.length} languages, ${spots(langs[0]).length} spots, ${routes(langs[0]).length} routes.`);
}

build();
