import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const php = process.env.PHP_BIN || "php";
const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "jt-http-"));
const capture = path.join(runDir, "group-contact.json");
const sharedSecret = "local-group-contact-secret-with-thirty-two-characters";
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});
const groupPort = await freePort();
const appPort = await freePort();
const common = {
  ...process.env,
  DAITORA_CONTACT_SHARED_SECRET: sharedSecret,
  GROUP_CONTACT_CAPTURE: capture
};
const appEnv = {
  ...common,
  APP_ENV: "development",
  APP_SECRET: "local-http-secret-with-more-than-thirty-two-characters",
  APP_DATA_DIR: path.join(runDir, "data"),
  MAIL_TRANSPORT: "spool",
  SITE_URL: `http://127.0.0.1:${appPort}`,
  DAITORA_CONTACT_ENDPOINT: `http://127.0.0.1:${groupPort}/tests/php/group_contact_mock.php`
};

const group = spawn(php, ["-S", `127.0.0.1:${groupPort}`, "-t", "."], {
  cwd: root,
  env: common,
  stdio: ["ignore", "pipe", "pipe"]
});
const app = spawn(php, ["-S", `127.0.0.1:${appPort}`, "-t", "."], {
  cwd: root,
  env: appEnv,
  stdio: ["ignore", "pipe", "pipe"]
});

let logs = "";
for (const proc of [group, app]) {
  proc.stdout.on("data", (chunk) => { logs += chunk; });
  proc.stderr.on("data", (chunk) => { logs += chunk; });
}

const stop = () => {
  app.kill();
  group.kill();
};
process.on("exit", stop);
process.on("SIGINT", () => { stop(); process.exit(130); });

await new Promise((resolve) => setTimeout(resolve, 1200));
const test = spawn(php, ["tests/php/http_integration.php", `http://127.0.0.1:${appPort}`], {
  cwd: root,
  env: appEnv,
  stdio: "inherit"
});
const code = await new Promise((resolve) => test.on("exit", resolve));
stop();
if (code !== 0) {
  process.stderr.write(logs);
  process.exit(code ?? 1);
}
console.log(`HTTP integration runtime: ${runDir}`);
