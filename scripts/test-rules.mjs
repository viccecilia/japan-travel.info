import { execFileSync } from "node:child_process";
execFileSync("node", ["scripts/check-site.mjs"], { stdio: "inherit" });
execFileSync("node", ["scripts/audit-seo.mjs"], { stdio: "inherit" });
execFileSync("node", ["scripts/audit-i18n.mjs"], { stdio: "inherit" });
execFileSync("node", ["scripts/audit-security.mjs"], { stdio: "inherit" });
console.log("OK unit rule tests");
