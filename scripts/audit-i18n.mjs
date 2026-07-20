import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const content = JSON.parse(fs.readFileSync(path.join(root, "src/content.json"), "utf8"));
const fail = (m) => { throw new Error(m); };

const langs = { zh: "zh-cn", zhHant: "zh-tw", ja: "ja", en: "en", ko: "ko" };
const spotFields = ["region", "city", "category", "duration", "tags", "best_for", "name", "intro", "card_line", "tip", "audio_title", "audio_script"];
const routeFields = ["title", "subtitle", "summary", "detail", "blogger_line", "duration", "rhythm", "photo_tip", "food_tip", "tags", "best_for", "stops"];
const simplifiedResidue = new RegExp(["\u5bfa\u5e99", "\u4e16\u754c\u9057\u4ea7", "\u4e1c\u5c71", "\u811a\u6b65", "\u8ba9", "\u4f53\u9a8c", "\u65f6\u95f4", "\u8fd9", "\u4e2a", "\u7ed9", "\u5f00", "\u8fc7", "\u8fdb", "\u5173", "\u4e0e", "\u4e50", "\u5386", "\u70b9", "\u4e3a", "\u540e", "\u7ebf", "\u8f66", "\u9986", "\u56ed", "\u6865", "\u6e7e", "\u6e29", "\u6c14", "\u5e7f", "\u573a", "\u56fd", "\u98ce", "\u9884"].join("|"));
const badEnglish = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
const badKorean = /[\u3040-\u30ff\u3400-\u9fff]/;
const badJapanese = /[\uac00-\ud7af]/;
const badByLang = { en: badEnglish, ko: badKorean, ja: badJapanese, zhHant: simplifiedResidue };
const scanCounts = {};

function flatten(value) {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value && typeof value === "object") return Object.values(value).flatMap(flatten);
  return [String(value ?? "")];
}
function checkLangField(lang, scope, id, field, value) {
  scanCounts[lang] = (scanCounts[lang] || 0) + 1;
  if (value === undefined || value === null || value === "") {
    if (["rhythm", "subtitle"].includes(field)) return;
    fail(`missing ${scope}.${id}.${field} ${lang}`);
  }
  const text = flatten(value).join(" ");
  const re = badByLang[lang];
  if (re && re.test(text)) {
    const found = text.match(re)?.[0] || "";
    fail(`language residue ${lang} ${scope}.${id}.${field} [${found}]: ${text.slice(0, 120)}`);
  }
}

const counts = Object.entries(content).map(([k, v]) => [k, v.all_spots.length, v.routes.length]);
if (new Set(counts.map((x) => x[1])).size !== 1 || counts[0][1] !== 73) fail(`spot count mismatch ${JSON.stringify(counts)}`);
if (new Set(counts.map((x) => x[2])).size !== 1 || counts[0][2] !== 5) fail(`route count mismatch ${JSON.stringify(counts)}`);

for (const [key, slug] of Object.entries(langs)) {
  for (const spot of content[key].all_spots) {
    for (const field of ["name", "intro", "audio", "classic_audio", "image"]) if (!spot[field]) fail(`missing ${key} ${spot.id} ${field}`);
    const html = fs.readFileSync(path.join(root, slug, "spots", spot.id, "index.html"), "utf8");
    const expected = slug === "zh-cn" ? "zh-CN" : slug === "zh-tw" ? "zh-Hant" : slug;
    if (!html.includes(`lang="${expected}"`)) fail(`html lang mismatch ${slug}/${spot.id}`);
    for (const field of spotFields) checkLangField(key, "spot", spot.id, field, spot[field]);
  }
  for (const route of content[key].routes) {
    for (const field of routeFields) checkLangField(key, "route", route.id, field, route[field]);
  }
}

for (const spot of content.zh.all_spots) {
  const tw = content.zhHant.all_spots.find((s) => s.id === spot.id);
  if (tw && tw.intro === spot.intro) fail(`zh/zhHant identical intro ${spot.id}`);
}

for (const [lang, count] of Object.entries(scanCounts)) {
  console.log(`i18n ${lang}: scanned ${count} fields, anomalies 0`);
}
console.log("OK i18n audit");
