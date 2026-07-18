import fs from "node:fs";

const file = "src/content.json";
const content = JSON.parse(fs.readFileSync(file, "utf8"));

const twMap = [
  ["这里", "這裡"], ["关西", "關西"], ["大阪", "大阪"], ["京都", "京都"], ["奈良", "奈良"],
  ["兵库", "兵庫"], ["滋贺", "滋賀"], ["和歌山", "和歌山"], ["三重", "三重"],
  ["景点", "景點"], ["路线", "路線"], ["语音", "語音"], ["讲解", "講解"], ["介绍", "介紹"],
  ["历史", "歷史"], ["文化", "文化"], ["适合", "適合"], ["游客", "遊客"], ["轻松", "輕鬆"],
  ["亲子", "親子"], ["摄影", "攝影"], ["传统", "傳統"], ["分钟", "分鐘"], ["第一次", "第一次"],
  ["出发", "出發"], ["返回", "返回"], ["城市", "城市"], ["小路", "小路"], ["温泉", "溫泉"],
  ["推荐", "推薦"], ["附近", "附近"], ["地点", "地點"], ["电话", "電話"], ["预约", "預約"]
];

function toTw(value = "") {
  let out = String(value);
  for (const [from, to] of twMap) out = out.replaceAll(from, to);
  return out;
}

function walkStrings(value, fn) {
  if (Array.isArray(value)) return value.map((x) => walkStrings(x, fn));
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) value[key] = walkStrings(value[key], fn);
    return value;
  }
  return typeof value === "string" ? fn(value) : value;
}

content.zhHant = walkStrings(content.zhHant, toTw);

const cleanByLang = {
  en: {
    replace: [
      ["第一次来", "first visit"], ["亲子", "family"], ["历史文化", "history and culture"],
      ["历史", "history"], ["文化", "culture"], ["讲解", "guide"], ["分钟", "min"],
      ["雨天", "rainy day"], ["室内", "indoor"], ["水族馆", "aquarium"]
    ],
    categoryFallback: "Kansai travel",
    tagFallback: "Kansai",
    bestForFallback: "travelers"
  },
  ja: {
    replace: [
      ["第一次来", "初めて"], ["亲子", "家族旅行"], ["历史文化", "歴史文化"],
      ["历史", "歴史"], ["讲解", "ガイド"], ["分钟", "分"],
      ["雨天", "雨の日"], ["室内", "屋内"], ["水族馆", "水族館"]
    ]
  },
  ko: {
    replace: [
      ["第一次来", "첫 방문"], ["亲子", "가족 여행"], ["历史文化", "역사 문화"],
      ["历史", "역사"], ["文化", "문화"], ["讲解", "가이드"], ["分钟", "분"],
      ["雨天", "비 오는 날"], ["室内", "실내"], ["水族馆", "수족관"]
    ],
    categoryFallback: "간사이 여행",
    tagFallback: "간사이",
    bestForFallback: "여행자"
  }
};

const chineseResidue = /第一次来|亲子|历史文化|讲解|分钟|雨天|室内|水族馆/;
const cjk = /[\u3400-\u9fff]/;

for (const [lang, rules] of Object.entries(cleanByLang)) {
  for (const spot of content[lang].all_spots) {
    const clean = (value = "") => {
      let out = String(value);
      for (const [from, to] of rules.replace) out = out.replaceAll(from, to);
      return out;
    };
    spot.category = clean(spot.category);
    spot.duration = clean(spot.duration);
    spot.tip = clean(spot.tip);
    spot.audio_title = clean(spot.audio_title || spot.name);
    spot.tags = (spot.tags || []).map(clean);
    spot.best_for = (spot.best_for || []).map(clean);
    if (lang !== "ja") {
      if (cjk.test(spot.category)) spot.category = rules.categoryFallback;
      spot.tags = spot.tags.map((x) => cjk.test(x) ? rules.tagFallback : x);
      spot.best_for = spot.best_for.map((x) => cjk.test(x) ? rules.bestForFallback : x);
    }
    if (lang === "ja") {
      if (chineseResidue.test(spot.category)) spot.category = "関西の見どころ";
      spot.tags = spot.tags.map((x) => chineseResidue.test(x) ? "関西" : x);
      spot.best_for = spot.best_for.map((x) => chineseResidue.test(x) ? "旅行者" : x);
    }
  }
  for (const route of content[lang].routes) {
    const clean = (value = "") => {
      let out = String(value);
      for (const [from, to] of rules.replace) out = out.replaceAll(from, to);
      return out;
    };
    route.duration = clean(route.duration);
    route.tags = (route.tags || []).map(clean);
    route.best_for = (route.best_for || []).map(clean);
    route.timeline = (route.timeline || []).map(clean);
  }
}

fs.writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`);
console.log("content normalized");
