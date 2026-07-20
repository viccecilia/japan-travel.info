import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const content = JSON.parse(fs.readFileSync(path.join(root, "src/content.json"), "utf8"));
const langs = ["zh-cn", "zh-tw", "ja", "en", "ko"];
const langMap = { "zh-cn": "zh", "zh-tw": "zhHant", ja: "ja", en: "en", ko: "ko" };
const fail = (msg) => { throw new Error(msg); };
const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "output", "runtime"].includes(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};
const files = walk(root);
const html = files.filter((f) => f.endsWith(".html"));
const images = files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && f.includes(`${path.sep}kansai-assets${path.sep}images${path.sep}`));
const audio = files.filter((f) => /\.mp3$/i.test(f) && f.includes(`${path.sep}kansai-audio${path.sep}`));
const videos = files.filter((f) => /\.mp4$/i.test(f) && f.includes(`${path.sep}kansai-assets${path.sep}video${path.sep}`));

if (images.length !== 74) fail(`expected 74 images, got ${images.length}`);
if (audio.length !== 584) fail(`expected 584 audio, got ${audio.length}`);
if (videos.length !== 2) fail(`expected 2 videos, got ${videos.length}`);
for (const lang of langs) {
  const key = langMap[lang];
  const langSpotDirs = content[key].all_spots.map((s) => path.join(root, lang, "spots", s.id, "index.html"));
  for (const f of langSpotDirs) if (!fs.existsSync(f)) fail(`missing spot page ${f}`);
  for (const r of content[key].routes) if (!fs.existsSync(path.join(root, lang, "routes", r.id, "index.html"))) fail(`missing route ${lang}/${r.id}`);
}

const forbidden = [/Yuzu/i, /柚子/, /70\+/, /100\+/, /无限等待/, /不临时加价/, /保证中文司机/, /保证指定司机/, /localStorage\.(setItem|getItem)\((?!consentKey)/];
const smtpSecretPattern = new RegExp("SMTP_" + "PASSWORD=.+\\S");
for (const f of files.filter((x) => /\.(html|js|php|json|md|txt|xml|htaccess)$/i.test(x))) {
  const rel = path.relative(root, f).replaceAll("\\", "/");
  if (rel === "scripts/check-site.mjs") continue;
  const text = fs.readFileSync(f, "utf8");
  for (const re of forbidden) if (re.test(text)) fail(`forbidden ${re} in ${rel}`);
  if (/localhost|127\.0\.0\.1/.test(text) && !rel.startsWith("docs/") && !rel.startsWith("tests/") && !rel.startsWith(".github/")) fail(`localhost default in ${rel}`);
  if (smtpSecretPattern.test(text) && !rel.endsWith(".env.example") && !rel.startsWith("tests/") && !rel.startsWith(".github/")) fail(`possible smtp secret in ${rel}`);
}

for (const f of html) {
  const rel = path.relative(root, f).replaceAll("\\", "/");
  const text = fs.readFileSync(f, "utf8");
  const noindex = /<meta name="robots" content="noindex,follow">/.test(text);
  if (!/<title>[^<]{6,}<\/title>/.test(text)) fail(`missing title ${rel}`);
  if (!/<meta name="description" content="[^"]{20,}">/.test(text)) fail(`missing description ${rel}`);
  if (!/<h1[>\s]/.test(text)) fail(`missing h1 ${rel}`);
  if (!noindex && !/<link rel="canonical" href="https:\/\/japan-travel\.info/.test(text)) fail(`missing canonical ${rel}`);
  if (!noindex && !rel.startsWith("h5/") && !/hreflang="x-default"/.test(text)) fail(`missing x-default ${rel}`);
  if (!noindex && !rel.startsWith("h5/") && rel !== "index.html" && rel !== "404.html" && !rel.includes("/404/") && !/<script type="application\/ld\+json">/.test(text)) fail(`missing json-ld ${rel}`);
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const match of sitemap.matchAll(/https:\/\/japan-travel\.info\/([^<]*)/g)) {
  const rel = match[1].replace(/\/$/, "");
  const target = rel ? path.join(root, rel, "index.html") : path.join(root, "index.html");
  if (!fs.existsSync(target)) fail(`sitemap target missing ${match[0]}`);
}
console.log(`OK check: ${html.length} html, ${images.length} images, ${audio.length} audio, ${videos.length} videos`);
