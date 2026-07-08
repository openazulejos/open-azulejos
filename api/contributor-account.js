const crypto = require("node:crypto");
const {
  authorizeContributorRequest,
  clearedContributorSessionCookie,
  contributorSessionCookie,
  createContributorSession,
} = require("./_contributor-auth");
const { receiptHash } = require("./_contribution-receipt");
const { notifyNewContributor } = require("./_email-notifications");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const json = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(payload));
};

const readBody = (request) => new Promise((resolve, reject) => {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
    if (body.length > 64_000) reject(new Error("payload too large"));
  });
  request.on("end", () => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch (error) {
      reject(error);
    }
  });
  request.on("error", reject);
});

const safeEqual = (first, second) => {
  const left = Buffer.from(String(first || ""));
  const right = Buffer.from(String(second || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const normalizedPseudonym = (value) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
const validPseudonym = (value) => {
  const pseudonym = String(value || "").trim().replace(/\s+/g, " ");
  return pseudonym.length >= 2 && pseudonym.length <= 32 && /^[\p{L}\p{N} ._-]+$/u.test(pseudonym);
};

const serviceHeaders = (serviceKey) => ({ apikey: serviceKey, Authorization: `Bearer ${serviceKey}` });

function requestOrigin(request) {
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  if (!host) return "https://openazulejos.com";
  const proto = request.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

async function profileForUser(supabaseUrl, serviceKey, user) {
  const headers = serviceHeaders(serviceKey);
  const response = await fetch(`${supabaseUrl}/rest/v1/contributor_profiles?select=*&user_id=eq.${user.id}&limit=1`, { headers });
  if (!response.ok) throw new Error("profile lookup failed");
  const [existing] = await response.json();
  if (existing) return existing;

  const preferred = String(user.user_metadata?.pseudonym || user.email?.split("@")[0] || "contributor")
    .trim().slice(0, 32);
  const base = validPseudonym(preferred) ? preferred : "contributor";
  for (let suffix = 0; suffix < 20; suffix += 1) {
    const pseudonym = suffix ? `${base.slice(0, 27)}-${suffix + 1}` : base;
    const create = await fetch(`${supabaseUrl}/rest/v1/contributor_profiles`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: user.id,
        pseudonym,
        normalized_pseudonym: normalizedPseudonym(pseudonym),
      }),
    });
    if (create.ok) return (await create.json())[0];
    if (create.status !== 409) throw new Error("profile creation failed");
  }
  throw new Error("profile creation failed");
}

async function contributionRecords(supabaseUrl, serviceKey, userId) {
  const headers = serviceHeaders(serviceKey);
  const query = new URLSearchParams({
    select: "legacy_azulejo_id,status,moderation_reason,submitted_at,updated_at",
    contributor_id: `eq.${userId}`,
    order: "submitted_at.desc",
    limit: "250",
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/contributions?${query}`, { headers });
  if (!response.ok) throw new Error("contribution lookup failed");
  const records = await response.json();
  const ids = records.map((record) => record.legacy_azulejo_id).filter(Boolean);
  if (!ids.length) return [];
  const tileQuery = new URLSearchParams({
    select: "id,title,image_url,lat,lng,moderation_status,photographer_credit,photo_license",
    id: `in.(${ids.join(",")})`,
  });
  const tileResponse = await fetch(`${supabaseUrl}/rest/v1/azulejos?${tileQuery}`, { headers });
  const tiles = tileResponse.ok ? await tileResponse.json() : [];
  const tilesById = new Map(tiles.map((tile) => [tile.id, tile]));
  return records.map((record) => ({
    id: record.legacy_azulejo_id,
    status: record.status,
    reason: record.moderation_reason,
    submittedAt: record.submitted_at,
    updatedAt: record.updated_at,
    title: tilesById.get(record.legacy_azulejo_id)?.title || "azulejo",
    imageUrl: tilesById.get(record.legacy_azulejo_id)?.image_url || null,
    lat: tilesById.get(record.legacy_azulejo_id)?.lat ?? null,
    lng: tilesById.get(record.legacy_azulejo_id)?.lng ?? null,
    photographerCredit: tilesById.get(record.legacy_azulejo_id)?.photographer_credit || null,
    photoLicense: tilesById.get(record.legacy_azulejo_id)?.photo_license || null,
  }));
}

async function claimReceipts(supabaseUrl, serviceKey, userId, value) {
  const receipts = Array.isArray(value) ? value.slice(0, 50) : [];
  const valid = [...new Map(receipts
    .filter((item) => UUID_PATTERN.test(item?.id) && TOKEN_PATTERN.test(item?.token))
    .map((item) => [item.id, { id: item.id, token: item.token }])).values()];
  if (!valid.length) return 0;
  const headers = serviceHeaders(serviceKey);
  const query = new URLSearchParams({
    select: "legacy_azulejo_id,receipt_token_hash,contributor_id",
    legacy_azulejo_id: `in.(${valid.map((item) => item.id).join(",")})`,
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/contributions?${query}`, { headers });
  if (!response.ok) throw new Error("receipt lookup failed");
  const byId = new Map((await response.json()).map((record) => [record.legacy_azulejo_id, record]));
  const claimable = valid.filter((receipt) => {
    const record = byId.get(receipt.id);
    return record && (!record.contributor_id || record.contributor_id === userId)
      && safeEqual(record.receipt_token_hash, receiptHash(receipt.token));
  });
  let claimed = 0;
  for (const receipt of claimable) {
    const update = await fetch(`${supabaseUrl}/rest/v1/contributions?legacy_azulejo_id=eq.${receipt.id}&or=(contributor_id.is.null,contributor_id.eq.${userId})`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ contributor_id: userId }),
    });
    if (update.ok && (await update.json()).length) claimed += 1;
  }
  return claimed;
}

async function accountPayload(supabaseUrl, serviceKey, claims, profile, extra = {}) {
  return {
    authenticated: true,
    profile: { pseudonym: profile.pseudonym, joinedAt: profile.created_at },
    records: await contributionRecords(supabaseUrl, serviceKey, claims.userId),
    ...extra,
  };
}

module.exports = async function handler(request, response) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !publishableKey) return json(response, 503, { error: "contributor accounts unavailable" });

  if (request.method === "DELETE") {
    response.setHeader("Set-Cookie", clearedContributorSessionCookie());
    return json(response, 200, { authenticated: false });
  }

  if (request.method === "GET") {
    const claims = authorizeContributorRequest(request);
    if (!claims) return json(response, 401, { authenticated: false });
    try {
      const profile = await profileForUser(supabaseUrl, serviceKey, { id: claims.userId, email: claims.email });
      return json(response, 200, await accountPayload(supabaseUrl, serviceKey, claims, profile));
    } catch {
      return json(response, 502, { error: "account lookup failed" });
    }
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST, DELETE");
    return json(response, 405, { error: "method not allowed" });
  }

  let body;
  try {
    body = await readBody(request);
  } catch {
    return json(response, 400, { error: "invalid request" });
  }
  const action = String(body.action || "");

  if (action === "reset-password") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!validEmail(email)) return json(response, 400, { error: "valid email is required" });
    const redirectTo = `${requestOrigin(request)}/?account=recovery`;
    const reset = await fetch(`${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: "POST",
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    if (!reset?.ok) return json(response, 503, { error: "password reset email is temporarily unavailable" });
    return json(response, 200, { resetRequested: true });
  }

  if (action === "update-password") {
    const accessToken = String(body.accessToken || "");
    const password = String(body.password || "");
    if (!accessToken || /\s/.test(accessToken) || accessToken.length > 4096 || password.length < 10) {
      return json(response, 400, { error: "valid recovery session and a password of at least 10 characters are required" });
    }
    const update = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const updated = await update.json().catch(() => ({}));
    const user = updated.user || updated;
    if (!update.ok || !user?.id) return json(response, 401, { error: "password reset link is invalid or expired" });
    try {
      const profile = await profileForUser(supabaseUrl, serviceKey, user);
      const claims = { userId: user.id, email: user.email || "" };
      response.setHeader("Set-Cookie", contributorSessionCookie(createContributorSession({ ...claims, pseudonym: profile.pseudonym })));
      const claimed = await claimReceipts(supabaseUrl, serviceKey, user.id, body.receipts);
      return json(response, 200, await accountPayload(supabaseUrl, serviceKey, claims, profile, { claimed }));
    } catch {
      return json(response, 502, { error: "account setup failed" });
    }
  }

  if (action === "claim") {
    const claims = authorizeContributorRequest(request);
    if (!claims) return json(response, 401, { authenticated: false });
    try {
      const claimed = await claimReceipts(supabaseUrl, serviceKey, claims.userId, body.receipts);
      const profile = await profileForUser(supabaseUrl, serviceKey, { id: claims.userId, email: claims.email });
      return json(response, 200, await accountPayload(supabaseUrl, serviceKey, claims, profile, { claimed }));
    } catch {
      return json(response, 502, { error: "could not attach contributions" });
    }
  }

  if (action === "update-profile") {
    const claims = authorizeContributorRequest(request);
    if (!claims) return json(response, 401, { authenticated: false });
    const pseudonym = String(body.pseudonym || "").trim().replace(/\s+/g, " ");
    if (!validPseudonym(pseudonym)) return json(response, 400, { error: "pseudonym must contain 2 to 32 letters, numbers, spaces, dots, dashes or underscores" });
    const normalized = normalizedPseudonym(pseudonym);
    const headers = serviceHeaders(serviceKey);
    const available = await fetch(`${supabaseUrl}/rest/v1/contributor_profiles?select=user_id&normalized_pseudonym=eq.${encodeURIComponent(normalized)}&user_id=neq.${claims.userId}&limit=1`, {
      headers,
    });
    if (!available.ok) return json(response, 502, { error: "pseudonym lookup failed" });
    if ((await available.json()).length) return json(response, 409, { error: "this pseudonym is already in use" });
    const update = await fetch(`${supabaseUrl}/rest/v1/contributor_profiles?user_id=eq.${claims.userId}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ pseudonym, normalized_pseudonym: normalized }),
    });
    if (!update.ok) return json(response, 502, { error: "username update failed" });
    const [profile] = await update.json();
    if (!profile) return json(response, 404, { error: "contributor profile not found" });
    response.setHeader("Set-Cookie", contributorSessionCookie(createContributorSession({ ...claims, pseudonym: profile.pseudonym })));
    return json(response, 200, await accountPayload(supabaseUrl, serviceKey, claims, profile));
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!validEmail(email) || password.length < 10) {
    return json(response, 400, { error: "valid email and a password of at least 10 characters are required" });
  }

  if (action === "sign-up") {
    const pseudonym = String(body.pseudonym || "").trim().replace(/\s+/g, " ");
    if (!validPseudonym(pseudonym)) return json(response, 400, { error: "pseudonym must contain 2 to 32 letters, numbers, spaces, dots, dashes or underscores" });
    const normalized = normalizedPseudonym(pseudonym);
    const available = await fetch(`${supabaseUrl}/rest/v1/contributor_profiles?select=user_id&normalized_pseudonym=eq.${encodeURIComponent(normalized)}&limit=1`, {
      headers: serviceHeaders(serviceKey),
    });
    if (!available.ok) return json(response, 502, { error: "pseudonym lookup failed" });
    if ((await available.json()).length) return json(response, 409, { error: "this pseudonym is already in use" });

    const signUp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: { ...serviceHeaders(serviceKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { pseudonym },
      }),
    });
    const signedUp = await signUp.json().catch(() => ({}));
    if (!signUp.ok) {
      const message = signedUp.msg || signedUp.message || "";
      const alreadyRegistered = /already|registered|exists/i.test(message);
      return json(response, signUp.status, {
        error: alreadyRegistered ? "this email already has an account, log in instead" : message || "sign up failed",
      });
    }
    const user = signedUp.user || signedUp;
    if (!user?.id) return json(response, 502, { error: "account creation failed" });
    let profile;
    try {
      const createProfile = await fetch(`${supabaseUrl}/rest/v1/contributor_profiles`, {
        method: "POST",
        headers: { ...serviceHeaders(serviceKey), "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ user_id: user.id, pseudonym, normalized_pseudonym: normalized }),
      });
      if (!createProfile.ok) throw new Error("profile creation failed");
      [profile] = await createProfile.json();
    } catch {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: serviceHeaders(serviceKey) }).catch(() => {});
      return json(response, 409, { error: "could not create this contributor profile" });
    }
    const claims = { userId: user.id, email };
    response.setHeader("Set-Cookie", contributorSessionCookie(createContributorSession({ ...claims, pseudonym })));
    const claimed = await claimReceipts(supabaseUrl, serviceKey, user.id, body.receipts);
    await notifyNewContributor({ pseudonym, email, userId: user.id }).catch((error) => {
      console.warn("new contributor notification failed", error.message);
    });
    return json(response, 200, await accountPayload(supabaseUrl, serviceKey, claims, profile, { claimed }));
  }

  if (action !== "sign-in") return json(response, 400, { error: "invalid action" });
  const signIn = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const signedIn = await signIn.json().catch(() => ({}));
  if (!signIn.ok || !signedIn.user?.id) return json(response, 401, { error: "invalid email or password" });
  try {
    const profile = await profileForUser(supabaseUrl, serviceKey, signedIn.user);
    const claims = { userId: signedIn.user.id, email };
    response.setHeader("Set-Cookie", contributorSessionCookie(createContributorSession({ ...claims, pseudonym: profile.pseudonym })));
    const claimed = await claimReceipts(supabaseUrl, serviceKey, signedIn.user.id, body.receipts);
    return json(response, 200, await accountPayload(supabaseUrl, serviceKey, claims, profile, { claimed }));
  } catch {
    return json(response, 502, { error: "account setup failed" });
  }
};
