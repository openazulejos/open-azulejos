import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/image.js");

const originalEnv = { SUPABASE_URL: process.env.SUPABASE_URL };
const originalFetch = global.fetch;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function invoke(url, { method = "GET" } = {}) {
  let status = 0;
  const headers = {};
  let body = null;
  return new Promise((resolve) => {
    const response = {
      setHeader(name, value) { headers[name.toLowerCase()] = value; },
      end(value) {
        body = value;
        resolve({ status, headers, body });
      },
      set statusCode(value) { status = value; },
      get statusCode() { return status; },
    };
    handler({ method, url, headers: { host: "openazulejos.test" } }, response);
  });
}

process.env.SUPABASE_URL = "https://project.supabase.co";
const transformed = handler.transformedSupabaseUrl(
  "https://project.supabase.co/storage/v1/object/public/azulejos/captures/a.jpg?v=1",
  { width: 128, height: 128, quality: 50 },
);
assert(
  transformed === "https://project.supabase.co/storage/v1/render/image/public/azulejos/captures/a.jpg?v=1&width=128&height=128&resize=cover&quality=50",
  "image proxy should request Supabase transformed public images",
);
assert(
  handler.transformedSupabaseUrl("https://evil.example/storage/v1/object/public/azulejos/a.jpg", { width: 128, height: 128, quality: 50 }) === null,
  "image proxy must reject non-project hosts",
);

let upstreamRequest = null;
global.fetch = async (url, options = {}) => {
  upstreamRequest = { url: String(url), options };
  return {
    ok: true,
    headers: { get: (name) => (name.toLowerCase() === "content-type" ? "image/jpeg" : null) },
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  };
};

const ok = await invoke(`/api/image?src=${encodeURIComponent("https://project.supabase.co/storage/v1/object/public/azulejos/captures/a.jpg")}&w=300&h=280&q=55`);
assert(ok.status === 200, "valid project image should proxy successfully");
assert(upstreamRequest.url.includes("/storage/v1/render/image/public/"), "proxy should call Supabase image transform endpoint");
assert(ok.headers["cache-control"].includes("immutable"), "proxied thumbnails should be cacheable long-term");
assert(ok.headers["content-type"] === "image/jpeg", "proxy should preserve image content type");
assert(Buffer.isBuffer(ok.body) && ok.body.length === 3, "proxy should return image bytes");

const rejected = await invoke(`/api/image?src=${encodeURIComponent("https://other.supabase.co/storage/v1/object/public/azulejos/captures/a.jpg")}`);
assert(rejected.status === 400, "other Supabase projects should be rejected");

global.fetch = originalFetch;
Object.entries(originalEnv).forEach(([key, value]) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
});

console.log("image api tests passed");
