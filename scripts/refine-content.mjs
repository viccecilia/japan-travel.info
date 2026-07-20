import fs from "node:fs";

const file = new URL("../src/content.json", import.meta.url);
const content = JSON.parse(fs.readFileSync(file, "utf8"));

function sentences(text = "") {
  return String(text).replace(/\s+/g, " ").trim().split(/(?<=[。！？.!?])\s+/u).map((x) => x.trim()).filter(Boolean);
}

function usefulForCard(spot, sentence) {
  const plain = sentence.replace(/[。！？.!?]+$/u, "");
  return sentence.includes(spot.name) && plain.length >= Math.min(10, spot.name.length + 4) && plain.length <= 180;
}

for (const data of Object.values(content)) {
  const counts = new Map();
  for (const spot of data.all_spots) {
    for (const field of ["intro", "tip"]) {
      for (const sentence of sentences(spot[field])) counts.set(sentence, (counts.get(sentence) || 0) + 1);
    }
  }
  for (const spot of data.all_spots) {
    const intro = sentences(spot.intro);
    const named = intro.find((sentence) => usefulForCard(spot, sentence));
    const fallback = intro.find((sentence) => (counts.get(sentence) || 0) <= 3) || intro[0] || spot.name;
    spot.card_line = named || fallback;
    const refinedIntro = intro.filter((sentence) => (counts.get(sentence) || 0) <= 3 || sentence.includes(spot.name));
    spot.intro = (refinedIntro.length ? refinedIntro : [spot.card_line]).join(" ");
    const tip = sentences(spot.tip).filter((sentence) => (counts.get(sentence) || 0) <= 3 || sentence.includes(spot.name));
    spot.tip = (tip.length ? tip : [`${spot.name}: ${sentences(spot.tip)[0] || spot.card_line}`]).join(" ");
  }
  const byId = new Map(data.all_spots.map((spot) => [spot.id, spot]));
  for (const route of data.routes) {
    if (Array.isArray(route.spot_items)) route.spot_items = route.spot_items.map((item) => ({ ...item, ...(byId.get(item.id || item.spot_id) || {}) }));
  }
}

fs.writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`, "utf8");
console.log("Refined multilingual spot summaries from existing source content.");
