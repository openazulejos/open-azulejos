import fs from "node:fs";
import vm from "node:vm";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL("manifest.webmanifest", root), "utf8"));
assert(manifest.start_url === "/" && manifest.scope === "/", "PWA manifest should remain scoped to the public map");
assert(manifest.display === "standalone", "PWA manifest should support an installed mobile experience");
assert(manifest.icons.some((icon) => icon.type === "image/png"), "PWA manifest should expose a PNG icon");

const serviceWorker = fs.readFileSync(new URL("service-worker.js", root), "utf8");
assert(serviceWorker.includes('url.pathname.startsWith("/api/")'), "service worker must keep API calls out of the cache");
assert(serviceWorker.includes('url.pathname.startsWith("/admin")'), "service worker must keep admin pages out of the cache");
assert(serviceWorker.includes('url.pathname.startsWith("/dashboard")'), "service worker must keep dashboard pages out of the cache");
assert(serviceWorker.includes('caches.match("/index.html")'), "service worker should provide the public shell offline");

const queueSource = fs.readFileSync(new URL("offline-queue.js", root), "utf8");
const context = { globalThis: {} };
vm.runInNewContext(queueSource, context, { filename: "offline-queue.js" });
const queue = context.globalThis.OpenAzulejosOfflineQueue;
const payload = { uploadId: "capture-1", lat: 38.71, lng: -9.14, imageData: "data:image/jpeg;base64,test" };
const entry = queue.normalizePayload(payload);
assert(entry.id === payload.uploadId && entry.payload === payload, "offline queue should preserve the complete contribution payload");
assert(entry.attempts === 0 && entry.lastError === null, "new offline contributions should start without failed attempts");
await queue.enqueue(payload).then(
  () => { throw new Error("queue should not silently succeed without IndexedDB"); },
  (error) => assert(error.message.includes("unavailable"), "queue should report unavailable device storage clearly"),
);

console.log("pwa and offline queue tests passed");
