import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/records.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const originalFetch = global.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_KEY: process.env.ADMIN_KEY,
};
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
process.env.ADMIN_KEY = "admin-test";

let requestedUrl = "";
global.fetch = async (url) => {
  requestedUrl = String(url);
  return {
    ok: true,
    json: async () => [
      {
        id: "11111111-1111-4111-8111-111111111111",
        lat: 38.72001,
        lng: -9.14001,
        image_url: "near.jpg",
        created_at: "2026-06-29T20:00:00Z",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        lat: 38.721,
        lng: -9.14,
        image_url: "far.jpg",
        created_at: "2026-06-29T19:00:00Z",
      },
    ],
  };
};

const headers = {};
let responseStatus = 200;
let responseBody = "";
const request = {
  method: "GET",
  headers: { host: "localhost", "x-admin-key": "admin-test" },
  url: "/api/records?nearLat=38.72&nearLng=-9.14&radius=60&exclude=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};
const response = {
  setHeader(name, value) { headers[name] = value; },
  end(value) { responseBody = value; },
  set statusCode(value) { responseStatus = value; },
};

await handler(request, response);
const payload = JSON.parse(responseBody);
assert(responseStatus === 200, "nearby endpoint should succeed for an admin");
assert(payload.records.length === 1 && payload.records[0].image_url === "near.jpg", "nearby endpoint should remove records outside the requested radius");
assert(payload.records[0].distance_m > 0 && payload.records[0].distance_m < 2, "nearby endpoint should return meter-scale distances");
assert(requestedUrl.includes("lat=gte.") && requestedUrl.includes("lng=lte."), "nearby endpoint should send a bounded query to Supabase");
assert(requestedUrl.includes("id=neq."), "nearby endpoint should exclude the current contribution");
assert(headers["Cache-Control"] === "private, no-store", "nearby admin results should not be publicly cached");

const statusCalls = [];
global.fetch = async (url) => {
  const requestUrl = String(url);
  statusCalls.push(requestUrl);
  const status = requestUrl.match(/moderation_status=eq\.([^&]+)/)?.[1] || "unknown";
  return {
    ok: true,
    json: async () => [{
      id: `${status}-record`,
      created_at: status === "pending" ? "2026-06-29T22:00:00Z" : "2026-06-29T21:00:00Z",
      moderation_status: status,
    }],
  };
};
let adminStatusReadStatus = 200;
let adminStatusReadBody = "";
await handler({
  method: "GET",
  headers: { host: "localhost", "x-admin-key": "admin-test" },
  url: "/api/records?admin=1",
}, {
  setHeader() {},
  end(value) { adminStatusReadBody = value; },
  set statusCode(value) { adminStatusReadStatus = value; },
});
const adminStatusReadPayload = JSON.parse(adminStatusReadBody);
assert(adminStatusReadStatus === 200, "admin segmented status read should succeed");
assert(adminStatusReadPayload.records.length === 3, "admin segmented status read should merge pending, approved and rejected records");
assert(statusCalls.some((url) => url.includes("moderation_status=eq.pending")), "admin read should request pending records explicitly");
assert(statusCalls.some((url) => url.includes("moderation_status=eq.approved")), "admin read should request approved records explicitly");
assert(statusCalls.some((url) => url.includes("moderation_status=eq.rejected")), "admin read should request rejected records explicitly");

let patchPayload = null;
let patchStatus = 200;
let patchBody = "";
global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("/rest/v1/azulejos?select=id,original_image_path,original_image_url")) {
    return {
      ok: true,
      json: async () => [{ id: "33333333-3333-4333-8333-333333333333", original_image_path: null, original_image_url: null }],
    };
  }
  if (requestUrl.includes("/storage/v1/object/")) {
    return { ok: true, text: async () => "" };
  }
  if (options.method === "PATCH") {
    patchPayload = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => [{ id: "33333333-3333-4333-8333-333333333333", ...patchPayload }],
    };
  }
  throw new Error(`unexpected patch test fetch: ${requestUrl}`);
};
await handler({
  method: "PATCH",
  headers: { host: "localhost", "x-admin-key": "admin-test" },
  url: "/api/records",
  on(event, callback) {
    if (event === "data") callback(Buffer.from(JSON.stringify({
      id: "33333333-3333-4333-8333-333333333333",
      imageData: "data:image/jpeg;base64,AA==",
      crop_points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }],
      edit_settings: { warmth: 40, tint: 20 },
    })));
    if (event === "end") callback();
  },
  destroy() {},
}, {
  setHeader() {},
  end(value) { patchBody = value; },
  set statusCode(value) { patchStatus = value; },
});
assert(patchStatus === 200, "published-only image edit should succeed");
assert(patchPayload.crop_points === null, "published-only image edit should clear crop points to avoid double crop");
assert(patchPayload.edit_settings.warmth === 0 && patchPayload.edit_settings.tint === 0, "published-only image edit should clear baked color adjustments");
assert(JSON.parse(patchBody).record.crop_points === null, "patched record should return cleared crop points");

let rejectedStatus = 200;
let rejectedBody = "";
await handler({
  method: "GET",
  headers: { host: "localhost", "x-admin-key": "wrong-key" },
  url: "/api/records",
}, {
  setHeader() {},
  end(value) { rejectedBody = value; },
  set statusCode(value) { rejectedStatus = value; },
});
assert(rejectedStatus === 401 && JSON.parse(rejectedBody).error === "invalid admin key", "admin reads should reject an invalid key explicitly");

let missingKeyStatus = 200;
let missingKeyBody = "";
await handler({
  method: "GET",
  headers: { host: "localhost" },
  url: "/api/records?admin=1",
}, {
  setHeader() {},
  end(value) { missingKeyBody = value; },
  set statusCode(value) { missingKeyStatus = value; },
});
assert(missingKeyStatus === 401 && JSON.parse(missingKeyBody).error === "admin key required", "admin reads should require an admin key when admin=1 is requested");

global.fetch = originalFetch;
Object.entries(originalEnv).forEach(([key, value]) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
});

console.log("records api tests passed");
