import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const html = [];
const walk = (dir) => { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { if ([".git","node_modules","output","runtime"].includes(item.name)) continue; const full=path.join(dir,item.name); if(item.isDirectory()) walk(full); else if(full.endsWith(".html")) html.push(full); } };
walk(root);
const seen = new Map();
const seenTitle = new Map();
const seenDesc = new Map();
for (const file of html) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const text = fs.readFileSync(file, "utf8");
  const title = text.match(/<title>([^<]+)<\/title>/)?.[1] || "";
  const desc = text.match(/<meta name="description" content="([^"]+)">/)?.[1] || "";
  const canonical = text.match(/<link rel="canonical" href="([^"]+)">/)?.[1] || "";
  const robots = text.match(/<meta name="robots" content="([^"]+)">/)?.[1] || "";
  const isNoindex = robots.toLowerCase().includes("noindex") || rel.startsWith("h5/");
  if (!title || title.length < 8) throw new Error(`weak title ${rel}`);
  if (!desc || desc.length < 30) throw new Error(`weak description ${rel}`);
  if (!canonical) throw new Error(`missing canonical ${rel}`);
  if (!isNoindex && !/<h1[\s>]/i.test(text)) throw new Error(`missing h1 ${rel}`);
  if (rel.startsWith("h5/") && !robots.toLowerCase().includes("noindex")) throw new Error(`legacy page must be noindex ${rel}`);
  const key = `${title}||${desc}`;
  if (seen.has(key) && !rel.startsWith("h5/") && !rel.includes("/member/") && !rel.includes("/404/") && rel !== "404.html") throw new Error(`duplicate seo ${rel} and ${seen.get(key)}`);
  seen.set(key, rel);
  if (!isNoindex && seenTitle.has(title)) throw new Error(`duplicate title ${rel} and ${seenTitle.get(title)}`);
  if (!isNoindex && seenDesc.has(desc)) throw new Error(`duplicate description ${rel} and ${seenDesc.get(desc)}`);
  if (!isNoindex) {
    seenTitle.set(title, rel);
    seenDesc.set(desc, rel);
  }
  for (const ld of text.matchAll(/<script type="application\/ld\+json">(.+?)<\/script>/gs)) JSON.parse(ld[1]);
}
if (!fs.existsSync(path.join(root, "robots.txt"))) throw new Error("missing robots.txt");
if (!fs.existsSync(path.join(root, "sitemap.xml"))) throw new Error("missing sitemap.xml");
console.log(`OK seo audit: ${html.length} html`);
