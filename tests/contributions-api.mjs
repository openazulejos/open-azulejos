import { Readable } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/contributions.js");
const { receiptHash } = require("../api/_contribution-receipt.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const originalFetch = global.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";

async function invoke(receipts) {
  const request = Readable.from([JSON.stringify({ receipts })]);
  request.method = "POST";
  request.headers = {};
  let responseBody = "";
  const response = {
    statusCode: 200,
    setHeader() {},
    end(value) { responseBody = value || ""; },
  };
  await handler(request, response);
  return { status: response.statusCode, body: JSON.parse(responseBody) };
}

const id = "11111111-1111-4111-8111-111111111111";
const validToken = "a".repeat(43);
global.fetch = async () => ({
  ok: true,
  json: async () => [{
    legacy_azulejo_id: id,
    status: "rejected",
    moderation_reason: "image quality: tile is out of focus",
    submitted_at: "2026-07-03T10:00:00Z",
    updated_at: "2026-07-03T11:00:00Z",
    receipt_token_hash: receiptHash(validToken),
  }],
});

const authorized = await invoke([{ id, token: validToken }]);
assert(authorized.status === 200, "valid receipt lookup should succeed");
assert(authorized.body.records.length === 1, "valid receipt should reveal its own contribution status");
assert(authorized.body.records[0].reason.includes("out of focus"), "valid receipt should reveal its moderation reason");
assert(!("receipt_token_hash" in authorized.body.records[0]), "receipt hashes must never be returned to the browser");

const denied = await invoke([{ id, token: "b".repeat(43) }]);
assert(denied.status === 200 && denied.body.records.length === 0, "incorrect receipt must not reveal whether a contribution exists");

const invalid = await invoke([{ id, token: "too-short" }]);
assert(invalid.status === 400, "malformed receipt should be rejected before database access");

global.fetch = originalFetch;
Object.entries(originalEnv).forEach(([key, value]) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
});

console.log("contribution receipt api tests passed");
