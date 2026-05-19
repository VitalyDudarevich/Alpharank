import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const version =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
  process.env.BUILD_ID ??
  createHash("sha256")
    .update(String(Date.now()))
    .digest("hex")
    .slice(0, 12);

const sw = `/* Сгенерировано scripts/generate-sw.mjs — не редактировать вручную */
const SW_VERSION = ${JSON.stringify(version)};

self.addEventListener("install", (event) => {
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
`;

writeFileSync("public/sw.js", sw, "utf8");
writeFileSync(
  "public/app-version.json",
  JSON.stringify({ version }, null, 0),
  "utf8"
);

console.log(`[pwa] sw.js version=${version}`);
