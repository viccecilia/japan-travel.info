import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const html = [];
const walk = (dir) => { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { if ([".git","node_modules","output","runtime"].includes(item.name)) continue; const full=path.join(dir,item.name); if(item.isDirectory()) walk(full); else if(full.endsWith(".html")) html.push(full); } };
walk(root);
const seen = new Map();
for (const file of html) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const text = fs.readFileSync(file, "utf8");
  const title = text.match(/<title>([^<]+)<\/title>/)?.[1] || "";
  const desc = text.match(/<meta name="description" content="([^"]+)">/)?.[1] || "";
  const key = `${title}||${desc}`;
  if (seen.has(key) && !rel.startsWith("h5/") && !rel.includes("/member/") && !rel.includes("/404/") && rel !== "404.html") throw new Error(`duplicate seo ${rel} and ${seen.get(key)}`);
  seen.set(key, rel);
  for (const ld of text.matchAll(/<script type="application\/ld\+json">(.+?)<\/script>/gs)) JSON.parse(ld[1]);
}
if (!fs.existsSync(path.join(root, "robots.txt"))) throw new Error("missing robots.txt");
if (!fs.existsSync(path.join(root, "sitemap.xml"))) throw new Error("missing sitemap.xml");
console.log(`OK seo audit: ${html.length} html`);
