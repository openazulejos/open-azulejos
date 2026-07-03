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
      image_fingerprint: "01".repeat(32),
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
assert(patchPayload.image_fingerprint === "01".repeat(32), "image treatment should persist its perceptual fingerprint");
assert(JSON.parse(patchBody).record.crop_points === null, "patched record should return cleared crop points");

const fingerprintUpdates = [];
global.fetch = async (url, options = {}) => {
  fingerprintUpdates.push({ url: String(url), payload: JSON.parse(options.body) });
  return { ok: true, text: async () => "" };
};
let fingerprintStatus = 200;
let fingerprintBody = "";
await handler({
  method: "PATCH",
  headers: { host: "localhost", "x-admin-key": "admin-test" },
  url: "/api/records",
  on(event, callback) {
    if (event === "data") callback(Buffer.from(JSON.stringify({
      fingerprints: [
        { id: "44444444-4444-4444-8444-444444444444", fingerprint: "0".repeat(64) },
        { id: "55555555-5555-4555-8555-555555555555", fingerprint: "1".repeat(64) },
      ],
    })));
    if (event === "end") callback();
  },
  destroy() {},
}, {
  setHeader() {},
  end(value) { fingerprintBody = value; },
  set statusCode(value) { fingerprintStatus = value; },
});
assert(fingerprintStatus === 200 && JSON.parse(fingerprintBody).updated === 2, "fingerprint batch should report persisted records");
assert(fingerprintUpdates.length === 2, "fingerprint batch should update each requested legacy record");
assert(fingerprintUpdates.every(({ payload }) => /^[01]{64}$/.test(payload.image_fingerprint)), "fingerprint updates should contain valid hashes");

let relationPayload = null;
global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("/rest/v1/physical_instances?")) {
    return {
      ok: true,
      json: async () => [
        { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", legacy_azulejo_id: "66666666-6666-4666-8666-666666666666" },
        { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", legacy_azulejo_id: "77777777-7777-4777-8777-777777777777" },
      ],
    };
  }
  if (requestUrl.includes("/rest/v1/similarity_links?")) {
    relationPayload = JSON.parse(options.body);
    return { ok: true, json: async () => [{ id: "relation-test", ...relationPayload }] };
  }
  throw new Error(`unexpected relation test fetch: ${requestUrl}`);
};
let relationStatus = 200;
let relationBody = "";
await handler({
  method: "PATCH",
  headers: { host: "localhost", "x-admin-key": "admin-test" },
  url: "/api/records",
  on(event, callback) {
    if (event === "data") callback(Buffer.from(JSON.stringify({
      id: "66666666-6666-4666-8666-666666666666",
      relatedId: "77777777-7777-4777-8777-777777777777",
      relationAction: "confirm-duplicate",
      score: 0.91,
    })));
    if (event === "end") callback();
  },
  destroy() {},
}, {
  setHeader() {},
  end(value) { relationBody = value; },
  set statusCode(value) { relationStatus = value; },
});
assert(relationStatus === 200 && JSON.parse(relationBody).relation.reviewed, "confirmed duplicate should return a reviewed relation");
assert(relationPayload.first_instance_id === "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "duplicate relation should canonicalize instance ordering");
assert(relationPayload.second_instance_id === "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "duplicate relation should retain both physical instances");
assert(relationPayload.relation === "duplicate" && relationPayload.score === 0.91, "duplicate relation should persist its type and visual score");

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
