import { Readable } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const auth = require("../api/_admin-auth.js");
const contributorAuth = require("../api/_contributor-auth.js");
const handler = require("../api/admin-account.js");
const originalFetch = global.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  ADMIN_KEY: process.env.ADMIN_KEY,
};
Object.assign(process.env, {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-test",
  SUPABASE_PUBLISHABLE_KEY: "publishable-test",
  ADMIN_KEY: "legacy-test-password",
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function invoke(method, body, cookie = "") {
  const request = body == null ? Readable.from([]) : Readable.from([JSON.stringify(body)]);
  request.method = method;
  request.headers = cookie ? { cookie } : {};
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

const ownerToken = auth.createAdminSession({ actor: "owner", role: "owner", method: "legacy" });
const ownerCookie = `open_azulejos_admin=${ownerToken}`;
let createdProfile = null;
global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("admin_profiles?select=user_id,role")) {
    return { ok: true, json: async () => [], headers: new Headers(), text: async () => "" };
  }
  if (requestUrl.includes("/auth/v1/admin/users")) {
    return { ok: true, status: 200, json: async () => ({ id: "11111111-1111-4111-8111-111111111111" }) };
  }
  if (requestUrl.includes("admin_profiles?on_conflict=user_id")) {
    createdProfile = JSON.parse(options.body);
    return { ok: true, json: async () => [createdProfile], text: async () => "" };
  }
  throw new Error(`unexpected bootstrap request: ${requestUrl}`);
};
const bootstrapped = await invoke("POST", {
  action: "bootstrap",
  email: "curator@example.org",
  password: "long-test-password",
}, ownerCookie);
assert(bootstrapped.status === 200, "owner should be able to bootstrap the first named account");
assert(createdProfile.role === "owner", "first named account should be owner");
assert(/HttpOnly/.test(bootstrapped.headers["set-cookie"]), "named login should use an HttpOnly session");

global.fetch = async (url) => {
  const requestUrl = String(url);
  if (requestUrl.includes("/auth/v1/token")) {
    return { ok: true, json: async () => ({ user: { id: createdProfile.user_id } }) };
  }
  if (requestUrl.includes("admin_profiles?select=*")) {
    return { ok: true, json: async () => [createdProfile] };
  }
  throw new Error(`unexpected sign-in request: ${requestUrl}`);
};
const signedIn = await invoke("POST", {
  action: "sign-in",
  email: "curator@example.org",
  password: "long-test-password",
});
assert(signedIn.status === 200 && signedIn.body.role === "owner", "active named administrator should sign in");

const contributorToken = contributorAuth.createContributorSession({
  userId: createdProfile.user_id,
  email: "curator@example.org",
  pseudonym: "curator",
});
let createdContributorAdminCookie = false;
global.fetch = async (url) => {
  const requestUrl = String(url);
  if (requestUrl.includes("admin_profiles?select=display_name%2Crole")) {
    return { ok: true, json: async () => [{ display_name: "curator", role: "owner" }] };
  }
  if (requestUrl.includes("admin_profiles?select=user_id")) {
    return { ok: true, headers: new Headers({ "content-range": "0-0/1" }), json: async () => [] };
  }
  throw new Error(`unexpected contributor-admin check request: ${requestUrl}`);
};
const contributorAdmin = await invoke("GET", null, `open_azulejos_contributor=${contributorToken}`);
createdContributorAdminCookie = /open_azulejos_admin=/.test(contributorAdmin.headers["set-cookie"] || "");
assert(contributorAdmin.status === 200 && contributorAdmin.body.authenticated, "contributor admin account should open admin account session");
assert(contributorAdmin.body.method === "contributor-admin", "contributor admin account should keep contributor-admin method");
assert(createdContributorAdminCookie, "contributor admin account should receive an admin session cookie");

global.fetch = originalFetch;
for (const [key, value] of Object.entries(originalEnv)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
console.log("admin account api tests passed");
