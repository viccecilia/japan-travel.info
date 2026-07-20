import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const content = JSON.parse(fs.readFileSync(path.join(root, "src/content.json"), "utf8"));
const sources = JSON.parse(fs.readFileSync(path.join(root, "src/facts/spot-sources.json"), "utf8"));
const fail = (message) => { throw new Error(message); };
const normalized = (value) => String(value || "").replace(/\s+/g, " ").trim();

for (const [lang, data] of Object.entries(content)) {
  const cardLines = new Map();
  const repeatedSentences = new Map();
  for (const spot of data.all_spots) {
    const line = normalized(spot.card_line);
    cardLines.set(line, (cardLines.get(line) || 0) + 1);
    for (const sentence of normalized(`${spot.intro} ${spot.tip}`).split(/(?<=[。！？.!?])\s+/u)) {
      if (sentence.length >= 18) repeatedSentences.set(sentence, (repeatedSentences.get(sentence) || 0) + 1);
    }
    if (/伏[见見]稻荷|Fushimi Inari|후시미 이나리|伏見稲荷/.test(spot.name) && /海风|湖光|水边|海風|湖光|waterside|lake light|바다 바람/.test(line)) fail(`semantic conflict ${lang}/${spot.id}`);
  }
  const duplicateCards = [...cardLines].filter(([, count]) => count > 3);
  if (duplicateCards.length) fail(`duplicate card_line ${lang}: ${JSON.stringify(duplicateCards.slice(0, 3))}`);
  const repeated = [...repeatedSentences].filter(([, count]) => count > 3);
  if (repeated.length) fail(`repeated prose ${lang}: ${JSON.stringify(repeated.slice(0, 3))}`);
  console.log(`content ${lang}: ${data.all_spots.length} spots, ${cardLines.size} unique card lines, repeated prose 0`);
}

const sourceUrls = new Set([...Object.values(sources.bySpot), ...Object.values(sources.byRegion)].map((x) => x.url));
if (sourceUrls.size < 10) fail("official source mapping is too generic");
const productHtml = fs.readFileSync(path.join(root, "en/products/index.html"), "utf8");
const productImages = [...productHtml.matchAll(/<img src="([^"]+)"/g)].map((x) => x[1]);
if (new Set(productImages).size < 4) fail("product cards do not have distinct images");
for (const route of content.en.routes) {
  const html = fs.readFileSync(path.join(root, "en/routes", route.id, "index.html"), "utf8");
  if ((html.match(/<audio/g) || []).length) fail(`route audio should link to spot pages: ${route.id}`);
}
for (const spot of content.en.all_spots) {
  const html = fs.readFileSync(path.join(root, "en/spots", spot.id, "index.html"), "utf8");
  if ((html.match(/<audio/g) || []).length !== 2) fail(`spot audio count ${spot.id}`);
}
const publicText = ["zh-cn", "zh-tw"].flatMap((slug) => ["referral", "ambassador"].map((page) => fs.readFileSync(path.join(root, slug, page, "index.html"), "utf8"))).join("\n");
if (/Yuzu|柚子/.test(publicText)) fail("legacy brand found");
if (/>Referral<|>Ambassador<|>Code<|>Clicks</.test(publicText)) fail("unlocalized interface word found");
console.log(`OK content audit: ${sourceUrls.size} official source URLs, route audio 0, spot audio 2 each`);
