import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const media = JSON.parse(fs.readFileSync(path.join(root, "src/media-sources.json"), "utf8"));
const fail = (message) => { throw new Error(message); };
for (const [asset, record] of Object.entries(media)) {
  const file = path.join(root, asset.replace(/^\//, ""));
  if (!fs.existsSync(file)) fail(`missing reviewed media ${asset}`);
  if (!record.source_url || !record.author || !record.license || !record.reviewed_at) fail(`incomplete media provenance ${asset}`);
  if (record.clear_faces !== false) fail(`clear-face review not approved ${asset}`);
  if (fs.statSync(file).size > 460000) fail(`replacement exceeds target size ${asset}`);
}
const videos = [];
function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const full=path.join(dir,item.name); if(item.isDirectory()) walk(full); else if(/\.mp4$/i.test(full)) videos.push(full); } }
walk(path.join(root, "kansai-assets/video"));
if (videos.length !== 2) fail(`expected 2 videos, got ${videos.length}`);
const out = path.join(root, "output/media-audit");
fs.mkdirSync(out, { recursive: true });
for (const video of videos) {
  const base = path.basename(video, ".mp4");
  const result = spawnSync("ffmpeg", ["-loglevel","error","-y","-i",video,"-vf","fps=1/8,scale=480:-1,tile=3x1","-frames:v","1",path.join(out,`${base}-contact.jpg`)], { stdio: "inherit" });
  if (result.status !== 0) fail(`video frame extraction failed ${video}`);
}
console.log(`OK media audit: ${Object.keys(media).length} licensed replacements, ${videos.length} readable videos; contact sheets in output/media-audit`);
