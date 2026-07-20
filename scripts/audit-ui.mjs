import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const css = fs.readFileSync(path.join(root, "assets/css/site.css"), "utf8");
const fail = (message) => { throw new Error(message); };
for (const token of ["--content: 1180px", "--reading: 760px", "html[lang=\"zh-CN\"]", "html[lang=\"zh-Hant\"]", "html[lang=\"ja\"]", "html[lang=\"ko\"]", ".bottom-nav", ".lang-menu"]) if (!css.includes(token)) fail(`missing UI rule ${token}`);
if (/font-weight:\s*(850|900|950)/.test(css)) fail("excessive font weight remains");
const samples = ["en/index.html","en/routes/index.html","en/routes/kyoto-nara-classic/index.html","en/spots/index.html","en/spots/kyo-0001/index.html","en/services/airport-transfer/index.html","en/products/index.html","en/vehicles/index.html","en/member/profile/index.html","en/faq/index.html","en/contact/index.html"];
for (const rel of samples) {
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  if (!html.includes("lang-menu") || !html.includes("bottom-nav")) fail(`missing responsive navigation ${rel}`);
  if (!html.includes('id="main-content"')) fail(`missing skip target ${rel}`);
}
if ((fs.readFileSync(path.join(root,"en/routes/kyoto-nara-classic/index.html"),"utf8").match(/<audio/g)||[]).length) fail("route page still expands audio");
if ((fs.readFileSync(path.join(root,"en/spots/kyo-0001/index.html"),"utf8").match(/<audio/g)||[]).length !== 2) fail("spot detail audio regression");
console.log(`OK UI audit: tokens, navigation and ${samples.length} representative page templates`);
