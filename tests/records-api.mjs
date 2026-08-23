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

let viewportRequest = null;
global.fetch = async (url, options = {}) => {
  viewportRequest = { url: String(url), payload: JSON.parse(options.body) };
  return {
    ok: true,
    json: async () => ({
      records: [
        { id: "approved-record", moderation_status: "approved", image_url: "approved.jpg" },
        { id: "rejected-record", moderation_status: "rejected", image_url: "rejected.jpg" },
      ],
      visibleCount: 2,
      totalCount: 2,
    }),
  };
};
let viewportStatus = 200;
let viewportBody = "";
const viewportHeaders = {};
await handler({
  method: "GET",
  headers: { host: "localhost", "x-admin-key": "admin-test" },
  url: "/api/records?bbox=-9.15,38.70,-9.13,38.73&limit=100&step=30",
}, {
  setHeader(name, value) { viewportHeaders[name] = value; },
  end(value) { viewportBody = value; },
  set statusCode(value) { viewportStatus = value; },
});
const viewportPayload = JSON.parse(viewportBody);
assert(viewportStatus === 200, "viewport endpoint should succeed even when an admin session is present");
assert(viewportRequest.url.endsWith("/rest/v1/rpc/azulejos_viewport"), "bbox reads should use the public viewport RPC, not the admin read");
assert(viewportRequest.payload.p_limit === 100 && viewportRequest.payload.p_step_meters === 30, "viewport should pass bounded render parameters");
assert(viewportPayload.records.length === 1 && viewportPayload.records[0].id === "approved-record", "viewport should not expose rejected records");
assert(viewportHeaders["Cache-Control"].includes("max-age=10"), "viewport cache should be short enough for moderation checks");

let facetsRequest = null;
global.fetch = async (url, options = {}) => {
  facetsRequest = { url: String(url), method: options.method, body: options.body };
  return {
    ok: true,
    json: async () => ({
      totalCount: 12,
      combinations: [{ neighborhood: "arroios", color: "blue", count: 12 }],
    }),
  };
};
let facetsStatus = 200;
let facetsBody = "";
const facetsHeaders = {};
await handler({
  method: "GET",
  headers: { host: "localhost" },
  url: "/api/records?facets=1",
}, {
  setHeader(name, value) { facetsHeaders[name] = value; },
  end(value) { facetsBody = value; },
  set statusCode(value) { facetsStatus = value; },
});
assert(facetsStatus === 200, "public filter facets should succeed");
assert(facetsRequest.url.endsWith("/rest/v1/rpc/azulejo_filter_facets"), "facets should use the aggregate database function");
assert(facetsRequest.method === "POST" && facetsRequest.body === "{}", "facets RPC should use a bounded empty payload");
assert(JSON.parse(facetsBody).combinations[0].count === 12, "facets should preserve aggregate counts");
assert(facetsHeaders["Cache-Control"].includes("max-age=300"), "facets should be cached longer than viewport reads");

let historyRequest = null;
global.fetch = async (url, options = {}) => {
  historyRequest = { url: String(url), payload: JSON.parse(options.body) };
  return {
    ok: true,
    json: async () => [{
      legacy_azulejo_id: "11111111-1111-4111-8111-111111111111",
      observed_at: "2026-06-29T20:00:00Z",
      condition_codes: ["intact"],
    }],
  };
};
let historyStatus = 200;
let historyBody = "";
const historyHeaders = {};
await handler({
  method: "GET",
  headers: { host: "localhost" },
  url: "/api/records?history=11111111-1111-4111-8111-111111111111",
}, {
  setHeader(name, value) { historyHeaders[name] = value; },
  end(value) { historyBody = value; },
  set statusCode(value) { historyStatus = value; },
});
assert(historyStatus === 200, "public observation history should succeed");
assert(historyRequest.url.endsWith("/rest/v1/rpc/azulejo_observation_history"), "history should use the rights-filtered database function");
assert(historyRequest.payload.p_legacy_azulejo_id === "11111111-1111-4111-8111-111111111111", "history should request the selected legacy record");
assert(JSON.parse(historyBody).records[0].condition_codes[0] === "intact", "history should preserve structured condition evidence");
assert(historyHeaders["Cache-Control"].includes("stale-while-revalidate"), "public history should have bounded cache revalidation");

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

global.fetch = async (url) => {
  const requestUrl = String(url);
  if (requestUrl.includes("/rest/v1/azulejos?")) {
    const status = requestUrl.match(/moderation_status=eq\.([^&]+)/)?.[1] || "unknown";
    return {
      ok: true,
      json: async () => status === "pending" ? [
        {
          id: "aaaaaaaa-1111-4111-8111-aaaaaaaa1111",
          created_at: "2026-06-29T22:00:00Z",
          moderation_status: "pending",
        },
        {
          id: "bbbbbbbb-2222-4222-8222-bbbbbbbb2222",
          created_at: "2026-06-29T21:00:00Z",
          moderation_status: "pending",
        },
      ] : [],
    };
  }
  if (requestUrl.includes("/rest/v1/contributions?")) {
    return {
      ok: true,
      json: async () => [
        {
          id: "cccccccc-3333-4333-8333-cccccccc3333",
          legacy_azulejo_id: "aaaaaaaa-1111-4111-8111-aaaaaaaa1111",
          contributor_id: null,
          submitted_at: "2026-06-29T22:00:00Z",
        },
        {
          id: "dddddddd-4444-4444-8444-dddddddd4444",
          legacy_azulejo_id: "bbbbbbbb-2222-4222-8222-bbbbbbbb2222",
          contributor_id: null,
          submitted_at: "2026-06-29T21:00:00Z",
        },
      ],
    };
  }
  if (requestUrl.includes("/rest/v1/moderation_events?")) {
    return { ok: true, json: async () => [] };
  }
  if (requestUrl.includes("/rest/v1/observations?")) {
    return {
      ok: true,
      json: async () => [
        {
          legacy_azulejo_id: "aaaaaaaa-1111-4111-8111-aaaaaaaa1111",
          physical_instance_id: "eeeeeeee-5555-4555-8555-eeeeeeee5555",
        },
        {
          legacy_azulejo_id: "bbbbbbbb-2222-4222-8222-bbbbbbbb2222",
          physical_instance_id: "ffffffff-6666-4666-8666-ffffffff6666",
        },
      ],
    };
  }
  if (requestUrl.includes("/rest/v1/similarity_links?")) {
    return {
      ok: true,
      json: async () => [{
        first_instance_id: "eeeeeeee-5555-4555-8555-eeeeeeee5555",
        second_instance_id: "ffffffff-6666-4666-8666-ffffffff6666",
        relation: "same-pattern",
        reviewed: true,
      }],
    };
  }
  throw new Error(`unexpected motif admin read fetch: ${requestUrl}`);
};
let motifAdminReadBody = "";
await handler({
  method: "GET",
  headers: { host: "localhost", "x-admin-key": "admin-test" },
  url: "/api/records?admin=1",
}, {
  setHeader() {},
  end(value) { motifAdminReadBody = value; },
  set statusCode(value) { void value; },
});
const motifRecords = JSON.parse(motifAdminReadBody).records;
assert(motifRecords.length === 2, "motif admin read should preserve linked records");
assert(motifRecords[0].motif_group_id && motifRecords[0].motif_group_id === motifRecords[1].motif_group_id, "linked observations should share an admin motif group");

global.fetch = async (url) => {
  const requestUrl = String(url);
  const status = requestUrl.match(/moderation_status=eq\.([^&]+)/)?.[1] || "unknown";
  return {
    ok: true,
    json: async () => status === "pending" ? [{
      id: "public-source-record",
      created_at: "2026-06-29T22:00:00Z",
      moderation_status: status,
      image_url: "https://example.supabase.co/storage/v1/object/public/azulejos/captures/public-source-edited.jpg",
      image_bucket: "azulejos",
      original_image_path: "captures/public-source-original.jpg",
      original_image_bucket: "azulejos",
      original_image_url: null,
    }] : [],
  };
};
let publicSourceBody = "";
await handler({
  method: "GET",
  headers: { host: "localhost", "x-admin-key": "admin-test" },
  url: "/api/records?admin=1",
}, {
  setHeader() {},
  end(value) { publicSourceBody = value; },
  set statusCode(value) { void value; },
});
const publicSourceRecord = JSON.parse(publicSourceBody).records[0];
assert(
  publicSourceRecord.original_image_url === "https://example.supabase.co/storage/v1/object/public/azulejos/captures/public-source-original.jpg",
  "admin records should reconstruct public original source URLs for repeat editing",
);

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
      dominant_color: "blue",
      color_metadata: { dominant: "blue", families: { blue: 0.82, grey: 0.18 } },
      condition_codes: ["crazed", "chipped"],
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
assert(patchPayload.dominant_color === "blue", "image treatment should persist recalculated dominant color");
assert(patchPayload.color_metadata.families.blue === 0.82, "image treatment should persist recalculated color metadata");
assert(patchPayload.condition_codes.join(",") === "crazed,chipped", "image treatment should persist structured condition evidence");
assert(JSON.parse(patchBody).record.crop_points === null, "patched record should return cleared crop points");

let missingReasonStatus = 200;
let missingReasonBody = "";
await handler({
  method: "PATCH",
  headers: { host: "localhost", "x-admin-key": "admin-test" },
  url: "/api/records",
  on(event, callback) {
    if (event === "data") callback(Buffer.from(JSON.stringify({
      id: "33333333-3333-4333-8333-333333333333",
      moderation_status: "rejected",
    })));
    if (event === "end") callback();
  },
  destroy() {},
}, {
  setHeader() {},
  end(value) { missingReasonBody = value; },
  set statusCode(value) { missingReasonStatus = value; },
});
assert(missingReasonStatus === 400 && JSON.parse(missingReasonBody).error.includes("rejection reason"), "rejection should require a contributor-visible reason");

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
  if (requestUrl.includes("/rest/v1/observations?")) {
    return {
      ok: true,
      json: async () => [
        { id: "observation-one", legacy_azulejo_id: "66666666-6666-4666-8666-666666666666", physical_instance_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
        { id: "observation-two", legacy_azulejo_id: "77777777-7777-4777-8777-777777777777", physical_instance_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      ],
    };
  }
  if (requestUrl.includes("/rest/v1/physical_instances?")) return {
    ok: true,
    json: async () => [
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", canonical_instance_id: null },
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", canonical_instance_id: null },
    ],
  };
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

let attachedObservationPayload = null;
let canonicalizedInstancePayload = null;
global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("/rest/v1/observations?select=id%2Clegacy_azulejo_id%2Cphysical_instance_id")) {
    return {
      ok: true,
      json: async () => [
        { id: "observation-current", legacy_azulejo_id: "88888888-8888-4888-8888-888888888888", physical_instance_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
        { id: "observation-target", legacy_azulejo_id: "99999999-9999-4999-8999-999999999999", physical_instance_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
      ],
    };
  }
  if (requestUrl.includes("/rest/v1/physical_instances?select=id%2Ccanonical_instance_id")) return {
    ok: true,
    json: async () => [
      { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", canonical_instance_id: null },
      { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", canonical_instance_id: null },
    ],
  };
  if (requestUrl.includes("/rest/v1/similarity_links?")) {
    return { ok: true, json: async () => [{ id: "attachment-relation", ...JSON.parse(options.body) }] };
  }
  if (requestUrl.includes("/rest/v1/observations?id=eq.observation-current") && options.method === "PATCH") {
    attachedObservationPayload = JSON.parse(options.body);
    return { ok: true, json: async () => [{ id: "observation-current", ...attachedObservationPayload }] };
  }
  if (requestUrl.includes("/rest/v1/observations?select=id&physical_instance_id=eq.")) {
    return { ok: true, json: async () => [] };
  }
  if (requestUrl.includes("/rest/v1/physical_instances?id=eq.dddddddd-dddd-4ddd-8ddd-dddddddddddd") && options.method === "PATCH") {
    canonicalizedInstancePayload = JSON.parse(options.body);
    return { ok: true, text: async () => "" };
  }
  throw new Error(`unexpected attachment test fetch: ${requestUrl}`);
};
let attachmentStatus = 200;
let attachmentBody = "";
await handler({
  method: "PATCH",
  headers: { host: "localhost", "x-admin-key": "admin-test" },
  url: "/api/records",
  on(event, callback) {
    if (event === "data") callback(Buffer.from(JSON.stringify({
      id: "88888888-8888-4888-8888-888888888888",
      relatedId: "99999999-9999-4999-8999-999999999999",
      relationAction: "attach-observation",
      relation: "duplicate",
      score: 0.97,
    })));
    if (event === "end") callback();
  },
  destroy() {},
}, {
  setHeader() {},
  end(value) { attachmentBody = value; },
  set statusCode(value) { attachmentStatus = value; },
});
assert(attachmentStatus === 200 && JSON.parse(attachmentBody).attached, "same-tile review should attach the current observation");
assert(attachedObservationPayload.physical_instance_id === "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "attachment should target the reviewed canonical instance");
assert(canonicalizedInstancePayload.canonical_instance_id === "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "empty source instance should point to its canonical instance");

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
