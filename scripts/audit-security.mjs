import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const files = [];
const walk = (dir) => { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { if ([".git","node_modules","output","runtime"].includes(item.name)) continue; const full=path.join(dir,item.name); if(item.isDirectory()) walk(full); else files.push(full); } };
walk(root);
const bad = [/password\s*[:=]\s*['"][^'"]{8,}/i, /api[_-]?key\s*[:=]\s*['"][^'"]+/i, /secret\s*[:=]\s*['"][^'"]{12,}/i, /dev_link/i, /account-dashboard\.php/i];
for (const file of files) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (!/\.(php|js|json|html|md|env|txt|xml)$/i.test(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const re of bad) if (re.test(text) && !rel.endsWith(".env.example") && !rel.startsWith("docs/")) throw new Error(`security pattern ${re} in ${rel}`);
}
const bootstrap = fs.readFileSync(path.join(root, "api/bootstrap.php"), "utf8");
for (const required of ["httponly", "samesite", "jt_rate_limit", "token_hash", "APP_DATA_DIR"]) {
  if (!bootstrap.includes(required) && !fs.readFileSync(path.join(root, "api/member.php"), "utf8").includes(required)) throw new Error(`missing security marker ${required}`);
}
console.log("OK security audit");
