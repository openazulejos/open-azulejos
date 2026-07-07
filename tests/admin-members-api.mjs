import { Readable } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const auth = require("../api/_admin-auth.js");
const handler = require("../api/admin-members.js");
const originalFetch = global.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
};

Object.assign(process.env, {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-test",
  ADMIN_SESSION_SECRET: "test-session-secret-with-enough-entropy",
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function invoke(method = "GET", body = null, cookie = "") {
  const request = body == null ? Readable.from([]) : Readable.from([JSON.stringify(body)]);
  request.method = method;
  request.url = "/api/admin-members?limit=999";
  request.headers = { host: "openazulejos.test", ...(cookie ? { cookie } : {}) };
  const headers = {};
  let responseBody = "";
  const response = {
    statusCode: 200,
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(value) { responseBody = value || ""; },
  };
  await handler(request, response);
  return { status: response.statusCode, headers, body: JSON.parse(responseBody) };
}

const adminCookie = `open_azulejos_admin=${auth.createAdminSession({ actor: "owner", role: "owner", method: "account" })}`;
let requestedListUrl = "";
global.fetch = async (url, options = {}) => {
  requestedListUrl = String(url);
  assert(options.headers.Authorization === "Bearer service-test", "admin members should use service role");
  return {
    ok: true,
    status: 200,
    json: async () => [{
      user_id: "11111111-1111-4111-8111-111111111111",
      pseudonym: "orson",
      joined_at: "2026-07-03T12:00:00Z",
      approved_count: 99,
      pending_count: 2,
      total_count: 101,
      last_contribution_at: "2026-07-04T12:00:00Z",
    }],
  };
};

const listed = await invoke("GET", null, adminCookie);
assert(listed.status === 200, "admin member list should succeed for admins");
assert(requestedListUrl.includes("limit=500"), "admin member list should cap large limits");
assert(listed.body.members[0].userId === "11111111-1111-4111-8111-111111111111", "admin member list may expose member ids to admins");
assert(listed.body.members[0].totalCount === 101, "admin member list should normalize counts");

let updatePayload = null;
global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("contributor_profiles?select=user_id")) {
    return { ok: true, status: 200, json: async () => [] };
  }
  if (requestUrl.includes("contributor_profiles?user_id=eq.") && options.method === "PATCH") {
    updatePayload = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => [{ user_id: "11111111-1111-4111-8111-111111111111", pseudonym: updatePayload.pseudonym }],
      text: async () => "",
    };
  }
  throw new Error(`unexpected member update request: ${requestUrl}`);
};

const updated = await invoke("PATCH", {
  userId: "11111111-1111-4111-8111-111111111111",
  pseudonym: "Orson Lisbon",
}, adminCookie);
assert(updated.status === 200 && updated.body.member.pseudonym === "Orson Lisbon", "admin should update contributor pseudonyms");
assert(updatePayload.normalized_pseudonym === "orson lisbon", "admin member updates should normalize pseudonyms");

const unauthorized = await invoke("GET");
assert(unauthorized.status === 401, "admin member list should require an admin session");

global.fetch = originalFetch;
for (const [key, value] of Object.entries(originalEnv)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
console.log("admin members api tests passed");
