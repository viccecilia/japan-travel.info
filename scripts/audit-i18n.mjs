import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const content = JSON.parse(fs.readFileSync(path.join(root, "src/content.json"), "utf8"));
const fail = (m) => { throw new Error(m); };
const langs = { zh: "zh-cn", zhHant: "zh-tw", ja: "ja", en: "en", ko: "ko" };
const counts = Object.entries(content).map(([k, v]) => [k, v.all_spots.length, v.routes.length]);
if (new Set(counts.map((x) => x[1])).size !== 1 || counts[0][1] !== 73) fail(`spot count mismatch ${JSON.stringify(counts)}`);
if (new Set(counts.map((x) => x[2])).size !== 1 || counts[0][2] !== 5) fail(`route count mismatch ${JSON.stringify(counts)}`);
for (const [key, slug] of Object.entries(langs)) {
  for (const spot of content[key].all_spots) {
    for (const field of ["name", "intro", "audio", "classic_audio", "image"]) if (!spot[field]) fail(`missing ${key} ${spot.id} ${field}`);
    const html = fs.readFileSync(path.join(root, slug, "spots", spot.id, "index.html"), "utf8");
    if (!html.includes(`lang="${slug === "zh-cn" ? "zh-CN" : slug === "zh-tw" ? "zh-Hant" : slug}"`)) fail(`html lang mismatch ${slug}/${spot.id}`);
  }
}
for (const spot of content.zh.all_spots) {
  const tw = content.zhHant.all_spots.find((s) => s.id === spot.id);
  if (tw && tw.intro === spot.intro) fail(`zh/zhHant identical intro ${spot.id}`);
}
const nonZhChecks = [
  ["en", /分钟|第一次来|亲子|历史文化|讲解/],
  ["ja", /分钟|第一次来|亲子|历史文化|讲解/],
  ["ko", /分钟|第一次来|亲子|历史文化|讲解/]
];
for (const [key, re] of nonZhChecks) {
  for (const spot of content[key].all_spots) {
    const text = [spot.tip, spot.audio_title, spot.category, ...(spot.tags || []), ...(spot.best_for || [])].join(" ");
    if (re.test(text)) fail(`language residue ${key} ${spot.id}`);
  }
}
console.log("OK i18n audit");
