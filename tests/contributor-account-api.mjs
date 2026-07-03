import { Readable } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const auth = require("../api/_contributor-auth.js");
const handler = require("../api/contributor-account.js");
const originalFetch = global.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
};

Object.assign(process.env, {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-test",
  SUPABASE_PUBLISHABLE_KEY: "publishable-test",
  ADMIN_SESSION_SECRET: "test-session-secret-with-enough-entropy",
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

const userId = "11111111-1111-4111-8111-111111111111";
const contributionId = "22222222-2222-4222-8222-222222222222";
const receiptToken = "a".repeat(43);
const receiptHash = require("../api/_contribution-receipt.js").receiptHash(receiptToken);
const profile = {
  user_id: userId,
  pseudonym: "lisbon-walker",
  normalized_pseudonym: "lisbon-walker",
  created_at: "2026-07-03T12:00:00.000Z",
};

const session = auth.createContributorSession({
  userId,
  email: "walker@example.org",
  pseudonym: profile.pseudonym,
});
assert(auth.verifyContributorSession(session)?.userId === userId, "signed contributor session should verify");
assert(!auth.verifyContributorSession(`${session}broken`), "tampered contributor session should fail");

let claimPatch = null;
global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("/auth/v1/token")) {
    return { ok: true, status: 200, json: async () => ({ user: { id: userId, email: "walker@example.org" } }) };
  }
  if (requestUrl.includes("contributor_profiles?select=*&user_id=")) {
    return { ok: true, status: 200, json: async () => [profile] };
  }
  if (requestUrl.includes("select=legacy_azulejo_id%2Creceipt_token_hash%2Ccontributor_id")) {
    return {
      ok: true,
      status: 200,
      json: async () => [{ legacy_azulejo_id: contributionId, receipt_token_hash: receiptHash, contributor_id: null }],
    };
  }
  if (requestUrl.includes(`legacy_azulejo_id=eq.${contributionId}`) && options.method === "PATCH") {
    claimPatch = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => [{ legacy_azulejo_id: contributionId }] };
  }
  if (requestUrl.includes("contributions?select=legacy_azulejo_id%2Cstatus")) {
    return {
      ok: true,
      status: 200,
      json: async () => [{
        legacy_azulejo_id: contributionId,
        status: "pending",
        moderation_reason: null,
        submitted_at: "2026-07-03T12:00:00.000Z",
        updated_at: "2026-07-03T12:00:00.000Z",
      }],
    };
  }
  if (requestUrl.includes("azulejos?select=id%2Ctitle%2Cimage_url")) {
    return {
      ok: true,
      status: 200,
      json: async () => [{ id: contributionId, title: "blue tile", image_url: "https://images.example/tile.jpg" }],
    };
  }
  throw new Error(`unexpected sign-in request: ${requestUrl}`);
};

const signedIn = await invoke("POST", {
  action: "sign-in",
  email: "walker@example.org",
  password: "long-enough-password",
  receipts: [{ id: contributionId, token: receiptToken }],
});
assert(signedIn.status === 200 && signedIn.body.authenticated, "contributor should sign in");
assert(signedIn.body.claimed === 1 && claimPatch?.contributor_id === userId, "valid local receipt should attach to account");
assert(signedIn.body.records[0].imageUrl.endsWith("tile.jpg"), "account should return its contribution image");
assert(/HttpOnly/.test(signedIn.headers["set-cookie"]), "contributor session must be HttpOnly");
assert(/SameSite=Strict/.test(signedIn.headers["set-cookie"]), "contributor session must be same-site only");

const accountCookie = `open_azulejos_contributor=${signedIn.headers["set-cookie"].split("=")[1].split(";")[0]}`;
global.fetch = async (url) => {
  const requestUrl = String(url);
  if (requestUrl.includes("contributor_profiles?select=*&user_id=")) {
    return { ok: true, status: 200, json: async () => [profile] };
  }
  if (requestUrl.includes("contributions?select=legacy_azulejo_id%2Cstatus")) {
    return { ok: true, status: 200, json: async () => [] };
  }
  throw new Error(`unexpected account request: ${requestUrl}`);
};
const account = await invoke("GET", null, accountCookie);
assert(account.status === 200 && account.body.profile.pseudonym === profile.pseudonym, "valid session should read contributor profile");

const loggedOut = await invoke("DELETE", null, accountCookie);
assert(loggedOut.status === 200 && /Max-Age=0/.test(loggedOut.headers["set-cookie"]), "logout should clear contributor session");

global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("contributor_profiles?select=user_id")) {
    return { ok: true, status: 200, json: async () => [] };
  }
  if (requestUrl.includes("/auth/v1/signup")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ user: { id: userId, identities: [{ id: "identity" }] } }),
    };
  }
  if (requestUrl.endsWith("/rest/v1/contributor_profiles") && options.method === "POST") {
    return { ok: true, status: 201, json: async () => [profile] };
  }
  throw new Error(`unexpected sign-up request: ${requestUrl}`);
};
const signedUp = await invoke("POST", {
  action: "sign-up",
  pseudonym: profile.pseudonym,
  email: "walker@example.org",
  password: "long-enough-password",
});
assert(signedUp.status === 202 && signedUp.body.confirmationRequired, "unconfirmed signup should request email confirmation");
assert(!signedUp.headers["set-cookie"], "unconfirmed signup must not create an app session");

global.fetch = originalFetch;
for (const [key, value] of Object.entries(originalEnv)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
console.log("contributor account api tests passed");
