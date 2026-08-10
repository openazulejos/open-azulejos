import { Readable } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/uploads.js");
const contributorAuth = require("../api/_contributor-auth.js");
const originalFetch = global.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
};
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
process.env.ADMIN_SESSION_SECRET = "test-session-secret-with-enough-entropy";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function invoke(body, cookie = "") {
  const request = Readable.from([JSON.stringify(body)]);
  request.method = "POST";
  request.headers = cookie ? { cookie } : {};
  let responseBody = "";
  const response = {
    statusCode: 200,
    setHeader() {},
    end(value) { responseBody = value || ""; },
  };
  await handler(request, response);
  return { status: response.statusCode, body: JSON.parse(responseBody) };
}

const uploadId = "11111111-1111-4111-8111-111111111111";
const signedRequests = [];
global.fetch = async (url) => {
  signedRequests.push(String(url));
  return {
    ok: true,
    json: async () => ({ url: `/object/upload/sign/mock?token=${signedRequests.length}` }),
    text: async () => "",
  };
};
const prepared = await invoke({
  action: "prepare",
  uploadId,
  squareMime: "image/jpeg",
  sourceMime: "image/webp",
  lat: 38.72,
  lng: -9.14,
  gpsAccuracy: 12,
  gpsTimestamp: Date.now(),
  locationSource: "browser",
});
assert(prepared.status === 200, "signed upload preparation should succeed");
assert(prepared.body.square.bucket === "azulejos", "published derivative should use public bucket");
assert(prepared.body.source.bucket === "azulejos-originals", "source should use private bucket");
assert(signedRequests.some((url) => url.includes("azulejos-originals")), "source upload must be signed for private bucket");

const missingRights = await invoke({
  action: "finalize",
  uploadId,
  squarePath: `captures/${uploadId}.jpg`,
  lat: 38.72,
  lng: -9.14,
  gpsAccuracy: 12,
  gpsTimestamp: Date.now(),
  locationSource: "browser",
});
assert(missingRights.status === 400, "finalization must reject a contribution without explicit photo rights");

let insertedRecord = null;
let contributionPatch = null;
global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("/storage/v1/object/info/")) {
    return { ok: true, json: async () => ({ size: 1234 }), text: async () => "" };
  }
  if (requestUrl.includes("/rest/v1/azulejos") && options.method === "POST") {
    insertedRecord = JSON.parse(options.body);
    return { ok: true, json: async () => [insertedRecord], text: async () => "" };
  }
  if (requestUrl.includes("/rest/v1/contributions?") && options.method === "PATCH") {
    contributionPatch = JSON.parse(options.body);
    return { ok: true, json: async () => [{ id: "contribution-test" }], text: async () => "" };
  }
  throw new Error(`unexpected request ${requestUrl}`);
};
const contributorId = "22222222-2222-4222-8222-222222222222";
const contributorSession = contributorAuth.createContributorSession({
  userId: contributorId,
  email: "contributor@example.org",
  pseudonym: "contributor",
});
const finalized = await invoke({
  action: "finalize",
  uploadId,
  squarePath: `captures/${uploadId}.jpg`,
  sourcePath: `captures/${uploadId}-source.webp`,
  lat: 38.72,
  lng: -9.14,
  gpsAccuracy: 12,
  gpsTimestamp: Date.now(),
  locationSource: "browser",
  cropPoints: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }],
  photographerCredit: "Test contributor",
  photoLicense: "CC-BY-4.0",
  contributorConsent: true,
  contributorConsentAt: "2026-07-02T10:00:00Z",
  dominant_color: "blue",
  color_metadata: { dominant: "blue", families: { blue: 0.9, grey: 0.1 }, source: "capture" },
}, `open_azulejos_contributor=${contributorSession}`);
assert(finalized.status === 200, "finalization should succeed after object verification");
assert(insertedRecord.moderation_status === "pending", "new contribution must be pending");
assert(insertedRecord.original_image_bucket === "azulejos-originals", "database must retain private source bucket");
assert(insertedRecord.original_image_url === null, "private source URL must not be persisted publicly");
assert(insertedRecord.photographer_credit === "Test contributor", "finalization should retain photographer attribution");
assert(insertedRecord.photo_license === "CC-BY-4.0", "finalization should retain explicit photo rights");
assert(insertedRecord.dominant_color === "blue", "finalization should retain capture color classification");
assert(insertedRecord.color_metadata.source === "capture", "finalization should identify capture analysis provenance");
assert(/^[A-Za-z0-9_-]{43}$/.test(finalized.body.receiptToken), "finalization should issue a private contribution receipt");
assert(contributionPatch.contributor_id === contributorId, "signed-in uploads should attach to the contributor account");

global.fetch = originalFetch;
for (const [key, value] of Object.entries(originalEnv)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
console.log("uploads api tests passed");
