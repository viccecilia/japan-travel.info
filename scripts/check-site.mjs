import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if ([".git", "node_modules", "output"].includes(entry.name)) return [];
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const imageFiles = files.filter((file) => /kansai-assets[\\/]images[\\/].+\.(jpe?g|png|webp)$/i.test(file));
const audioFiles = files.filter((file) => /kansai-audio[\\/].+\.mp3$/i.test(file));
const videoFiles = files.filter((file) => /kansai-assets[\\/]video[\\/].+\.mp4$/i.test(file));

if (imageFiles.length !== 74) errors.push(`Expected 74 images, got ${imageFiles.length}`);
if (audioFiles.length !== 584) errors.push(`Expected 584 audio files, got ${audioFiles.length}`);
if (videoFiles.length !== 2) errors.push(`Expected 2 videos, got ${videoFiles.length}`);

const forbidden = [
  /Yuzu/i,
  /柚子/,
  /localStorage/,
  /(单独|單獨|自社|当社|某一家|1社|一家公司).{0,20}(100台|約100台|约100台)/,
  /(100台|約100台|约100台).{0,20}(保有|所有|持有)/,
  /已付款订单(确认|成立|完成)/,
  /paid order confirmed/i
];
for (const file of htmlFiles.concat(files.filter((file) => file.endsWith(".js")))) {
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(text)) errors.push(`${path.relative(root, file)} matches forbidden pattern ${pattern}`);
  }
}

const required = [
  "Japan Travel 由株式会社大寅／Daitora Group 运营",
  "グループ全体で約100台規模の車両ネットワーク",
  "Rezio"
];
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const text of required) {
  if (!home.includes(text)) errors.push(`Home missing: ${text}`);
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const refs = Array.from(html.matchAll(/\b(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)).map((match) => match[1]);
  for (const ref of refs) {
    if (!ref || ref.startsWith("http") || ref.startsWith("mailto:") || ref.startsWith("#")) continue;
    const target = ref.startsWith("/")
      ? path.join(root, ref.replace(/^\/+/, ""))
      : path.join(path.dirname(file), ref);
    const resolved = fs.existsSync(target) ? target : path.join(target, "index.html");
    if (!fs.existsSync(resolved)) errors.push(`${path.relative(root, file)} broken ref: ${ref}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`OK: ${htmlFiles.length} html, ${imageFiles.length} images, ${audioFiles.length} audio, ${videoFiles.length} videos`);
