import { Readable } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const auth = require("../api/_admin-auth.js");
const contributorAuth = require("../api/_contributor-auth.js");
const sessionHandler = require("../api/admin-session.js");
const originalFetch = global.fetch;
const originalEnv = {
  ADMIN_KEY: process.env.ADMIN_KEY,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  CONTRIBUTOR_SESSION_SECRET: process.env.CONTRIBUTOR_SESSION_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
Object.assign(process.env, {
  ADMIN_KEY: "correct horse battery staple",
  ADMIN_SESSION_SECRET: "test-session-secret",
  CONTRIBUTOR_SESSION_SECRET: "test-session-secret",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-test",
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function responseCapture() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: "",
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(value) { this.body = value || ""; },
  };
}

const token = auth.createAdminSession();
assert(auth.authorizeAdminRequest({ headers: { cookie: `open_azulejos_admin=${token}` } }).ok, "signed session should authorize");
assert(!auth.authorizeAdminRequest({ headers: { cookie: `open_azulejos_admin=${token}x` } }).ok, "tampered session should fail");
assert(auth.authorizeAdminRequest({ headers: { "x-admin-key": process.env.ADMIN_KEY } }).ok, "legacy key should remain available during transition");
const namedToken = auth.createAdminSession({ actor: "curator", userId: "11111111-1111-4111-8111-111111111111", role: "owner", method: "account" });
const namedAuthorization = auth.authorizeAdminRequest({ headers: { cookie: `open_azulejos_admin=${namedToken}` } });
assert(namedAuthorization.userId && namedAuthorization.role === "owner", "named session should retain actor identity and role");

const loginRequest = Readable.from([JSON.stringify({ key: process.env.ADMIN_KEY })]);
loginRequest.method = "POST";
loginRequest.headers = {};
const loginResponse = responseCapture();
await sessionHandler(loginRequest, loginResponse);
assert(loginResponse.statusCode === 410, "temporary admin key login should be removed");

const cookie = `open_azulejos_admin=${namedToken}`;
const checkRequest = { method: "GET", headers: { cookie } };
const checkResponse = responseCapture();
await sessionHandler(checkRequest, checkResponse);
assert(checkResponse.statusCode === 200 && JSON.parse(checkResponse.body).authenticated, "session check should succeed");

const contributorToken = contributorAuth.createContributorSession({
  userId: "22222222-2222-4222-8222-222222222222",
  email: "orson@example.org",
  pseudonym: "orson",
});
let profileLookupUrl = "";
global.fetch = async (url, options = {}) => {
  profileLookupUrl = String(url);
  assert(options.headers.Authorization === "Bearer service-test", "contributor admin lookup should use service role");
  return { ok: true, json: async () => [{ display_name: "Orson", role: "owner" }] };
};
const contributorCheckRequest = {
  method: "GET",
  headers: { cookie: `open_azulejos_contributor=${contributorToken}` },
};
const contributorCheckResponse = responseCapture();
await sessionHandler(contributorCheckRequest, contributorCheckResponse);
const contributorCheck = JSON.parse(contributorCheckResponse.body);
assert(contributorCheckResponse.statusCode === 200 && contributorCheck.authenticated, "admin contributor account should authorize beta capture");
assert(contributorCheck.method === "contributor-admin", "contributor admin authorization should identify its method");
assert(/open_azulejos_admin=/.test(contributorCheckResponse.headers["set-cookie"]), "admin contributor authorization should create an admin session cookie");
assert(profileLookupUrl.includes("admin_profiles?"), "contributor admin check should query admin_profiles");

global.fetch = originalFetch;
for (const [key, value] of Object.entries(originalEnv)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
console.log("security api tests passed");
