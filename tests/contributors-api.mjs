import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/contributors.js");
const originalFetch = global.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function invoke(method = "GET", url = "/api/contributors?limit=99") {
  const headers = {};
  let responseBody = "";
  const response = {
    statusCode: 200,
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(value) { responseBody = value || ""; },
  };
  await handler({ method, headers: { host: "openazulejos.test" }, url }, response);
  return { status: response.statusCode, headers, body: JSON.parse(responseBody) };
}

let requestedUrl = "";
global.fetch = async (url, options = {}) => {
  requestedUrl = String(url);
  assert(options.headers.Authorization === "Bearer service-test", "contributors API should use service authorization server-side");
  return {
    ok: true,
    status: 200,
    json: async () => [{
      pseudonym: "lisbon-walker",
      joined_at: "2026-07-03T12:00:00Z",
      approved_count: 12,
      pending_count: 2,
      total_count: 14,
      last_contribution_at: "2026-07-03T13:00:00Z",
    }],
  };
};

const ok = await invoke();
assert(ok.status === 200, "contributors endpoint should respond");
assert(ok.headers["cache-control"].includes("s-maxage"), "contributors endpoint should be cacheable");
assert(requestedUrl.includes("/rest/v1/public_contributor_stats?"), "contributors endpoint should read the public stats view");
assert(requestedUrl.includes("limit=50"), "contributors endpoint should cap public limits");
assert(ok.body.contributors[0].approvedCount === 12, "contributors endpoint should normalize counts");
assert(!("user_id" in ok.body.contributors[0]), "contributors endpoint must not expose user identifiers");

const notAllowed = await invoke("POST");
assert(notAllowed.status === 405, "contributors endpoint should reject non-GET requests");

global.fetch = originalFetch;
Object.entries(originalEnv).forEach(([key, value]) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
});

console.log("contributors api tests passed");
