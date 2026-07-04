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
  request.headers = {
    "x-forwarded-host": "openazulejos.test",
    "x-forwarded-proto": "https",
    ...(cookie ? { cookie } : {}),
  };
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
const accountCookie = `open_azulejos_contributor=${session}`;
global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
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
  throw new Error(`unexpected claim request: ${requestUrl}`);
};

const claimedAccount = await invoke("POST", {
  action: "claim",
  receipts: [{ id: contributionId, token: receiptToken }],
}, accountCookie);
assert(claimedAccount.status === 200 && claimedAccount.body.authenticated, "contributor should claim receipts with an existing session");
assert(claimedAccount.body.claimed === 1 && claimPatch?.contributor_id === userId, "valid local receipt should attach to account");
assert(claimedAccount.body.records[0].imageUrl.endsWith("tile.jpg"), "account should return its contribution image");

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

let updatedProfilePayload = null;
global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("contributor_profiles?select=user_id") && requestUrl.includes("user_id=neq.")) {
    return { ok: true, status: 200, json: async () => [] };
  }
  if (requestUrl.includes(`contributor_profiles?user_id=eq.${userId}`) && options.method === "PATCH") {
    updatedProfilePayload = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => [{ ...profile, pseudonym: "new-walker", normalized_pseudonym: "new-walker" }],
    };
  }
  if (requestUrl.includes("contributions?select=legacy_azulejo_id%2Cstatus")) {
    return { ok: true, status: 200, json: async () => [] };
  }
  throw new Error(`unexpected profile update request: ${requestUrl}`);
};
const updatedProfile = await invoke("POST", { action: "update-profile", pseudonym: "new-walker" }, accountCookie);
assert(updatedProfile.status === 200 && updatedProfile.body.profile.pseudonym === "new-walker", "contributor should be able to update username");
assert(updatedProfilePayload.normalized_pseudonym === "new-walker", "updated username should be normalized");
assert(/HttpOnly/.test(updatedProfile.headers["set-cookie"]), "profile update should refresh the contributor session");

const loggedOut = await invoke("DELETE", null, accountCookie);
assert(loggedOut.status === 200 && /Max-Age=0/.test(loggedOut.headers["set-cookie"]), "logout should clear contributor session");

let magicRedirect = "";
global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("/auth/v1/otp")) {
    magicRedirect = new URL(requestUrl).searchParams.get("redirect_to") || "";
    const payload = JSON.parse(options.body);
    assert(payload.email === "walker@example.org", "magic link should send normalized email");
    assert(payload.create_user === true, "magic link should allow creating lightweight accounts");
    return { ok: true, status: 200, json: async () => ({}) };
  }
  throw new Error(`unexpected magic link request: ${requestUrl}`);
};
const magicLink = await invoke("POST", { action: "magic-link", email: "Walker@Example.org" });
assert(magicLink.status === 200 && magicLink.body.magicLinkRequested, "magic link requests should be accepted");
assert(magicRedirect === "https://openazulejos.test/?account=magic", "magic link should return to the account flow");

global.fetch = async (url) => {
  const requestUrl = String(url);
  if (requestUrl.includes("/auth/v1/user")) {
    return { ok: true, status: 200, json: async () => ({ id: userId, email: "walker@example.org", user_metadata: { pseudonym: "magic-walker" } }) };
  }
  if (requestUrl.includes("contributor_profiles?select=*&user_id=")) {
    return { ok: true, status: 200, json: async () => [profile] };
  }
  if (requestUrl.includes("contributions?select=legacy_azulejo_id%2Cstatus")) {
    return { ok: true, status: 200, json: async () => [] };
  }
  throw new Error(`unexpected auth session request: ${requestUrl}`);
};
const magicSession = await invoke("POST", {
  action: "auth-session",
  accessToken: "magic-access-token",
});
assert(magicSession.status === 200 && magicSession.body.authenticated, "magic link session should sign the contributor in");
assert(/HttpOnly/.test(magicSession.headers["set-cookie"]), "magic link session should create an app session");

global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("/auth/v1/verify")) {
    const payload = JSON.parse(options.body);
    assert(payload.type === "magiclink", "magic link token verification should use magiclink type");
    assert(payload.token_hash === "a".repeat(43), "magic link token hash should be forwarded");
    return { ok: true, status: 200, json: async () => ({ user: { id: userId, email: "walker@example.org" } }) };
  }
  if (requestUrl.includes("contributor_profiles?select=*&user_id=")) {
    return { ok: true, status: 200, json: async () => [profile] };
  }
  if (requestUrl.includes("contributions?select=legacy_azulejo_id%2Cstatus")) {
    return { ok: true, status: 200, json: async () => [] };
  }
  throw new Error(`unexpected token hash magic link request: ${requestUrl}`);
};
const verifiedMagicSession = await invoke("POST", {
  action: "verify-magic-link",
  tokenHash: "a".repeat(43),
  type: "magiclink",
});
assert(verifiedMagicSession.status === 200 && verifiedMagicSession.body.authenticated, "token-hash magic link should sign the contributor in");
assert(/HttpOnly/.test(verifiedMagicSession.headers["set-cookie"]), "token-hash magic link should create an app session");

let signUpUserPayload = null;
let signUpProfilePayload = null;
let signUpOtpPayload = null;
let signUpRedirect = "";
global.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  if (requestUrl.includes("contributor_profiles?select=user_id")) {
    return { ok: true, status: 200, json: async () => [] };
  }
  if (requestUrl.includes("/auth/v1/admin/users") && options.method === "POST") {
    signUpUserPayload = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: userId, email: "walker@example.org" }),
    };
  }
  if (requestUrl.endsWith("/rest/v1/contributor_profiles") && options.method === "POST") {
    signUpProfilePayload = JSON.parse(options.body);
    return { ok: true, status: 201, json: async () => [profile] };
  }
  if (requestUrl.includes("/auth/v1/otp")) {
    signUpRedirect = new URL(requestUrl).searchParams.get("redirect_to") || "";
    signUpOtpPayload = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({}) };
  }
  throw new Error(`unexpected sign-up request: ${requestUrl}`);
};
const signedUp = await invoke("POST", {
  action: "sign-up",
  pseudonym: profile.pseudonym,
  email: "walker@example.org",
});
assert(signedUp.status === 200 && signedUp.body.magicLinkRequested, "signup should request a magic link");
assert(!signedUp.headers["set-cookie"], "unconfirmed signup must not create an app session");
assert(signUpUserPayload.email === "walker@example.org" && signUpUserPayload.email_confirm === true, "signup should create an email-only Supabase user");
assert(signUpUserPayload.user_metadata.pseudonym === profile.pseudonym, "signup should preserve the requested pseudonym");
assert(signUpProfilePayload.user_id === userId && signUpProfilePayload.normalized_pseudonym === profile.normalized_pseudonym, "signup should create contributor profile");
assert(signUpOtpPayload.email === "walker@example.org" && signUpOtpPayload.create_user === false, "signup should send a magic link to the created account");
assert(signUpRedirect === "https://openazulejos.test/?account=magic", "signup magic link should return to the account flow");

global.fetch = originalFetch;
for (const [key, value] of Object.entries(originalEnv)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
console.log("contributor account api tests passed");
