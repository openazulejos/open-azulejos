const {
  authorizeAdminRequest,
  adminSessionCookie,
  createAdminSession,
} = require("./_admin-auth");
const { authorizeContributorRequest } = require("./_contributor-auth");

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
    if (body.length > 32_768) reject(new Error("payload too large"));
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

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const contributorAdminAuthorization = async (request, supabaseUrl, serviceKey) => {
  const contributor = authorizeContributorRequest(request);
  if (!contributor?.userId) return null;
  const query = new URLSearchParams({
    select: "display_name,role",
    user_id: `eq.${contributor.userId}`,
    active: "eq.true",
    limit: "1",
  });
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/admin_profiles?${query}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!profileResponse.ok) return null;
  const [profile] = await profileResponse.json();
  if (!profile) return null;
  return {
    actor: profile.display_name || contributor.pseudonym || "admin",
    role: profile.role || null,
    method: "contributor-admin",
    userId: contributor.userId,
  };
};

module.exports = async function handler(request, response) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !publishableKey) return json(response, 503, { error: "admin accounts unavailable" });
  const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  if (request.method === "GET") {
    let authorization = authorizeAdminRequest(request);
    if (!authorization.ok) {
      const contributorAdmin = await contributorAdminAuthorization(request, supabaseUrl, serviceKey);
      if (!contributorAdmin) return json(response, 401, { authenticated: false });
      response.setHeader("Set-Cookie", adminSessionCookie(createAdminSession(contributorAdmin)));
      authorization = { ok: true, ...contributorAdmin };
    }
    const countResponse = await fetch(`${supabaseUrl}/rest/v1/admin_profiles?select=user_id&active=eq.true&limit=1`, {
      headers: { ...serviceHeaders, Prefer: "count=exact" },
    });
    if (!countResponse.ok) return json(response, 502, { error: "admin profile lookup failed" });
    const range = countResponse.headers.get("content-range") || "*/0";
    return json(response, 200, {
      authenticated: true,
      method: authorization.method,
      role: authorization.role,
      namedAccounts: Number(range.split("/")[1]) || 0,
    });
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return json(response, 405, { error: "method not allowed" });
  }

  let body;
  try {
    body = await readBody(request);
  } catch {
    return json(response, 400, { error: "invalid request" });
  }
  const action = String(body.action || "sign-in");
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!validEmail(email) || password.length < 12) {
    return json(response, 400, { error: "valid email and a password of at least 12 characters are required" });
  }

  let user;
  let profile;
  if (action === "bootstrap") {
    const authorization = authorizeAdminRequest(request);
    if (!authorization.ok || !["owner", null].includes(authorization.role)) {
      return json(response, 403, { error: "owner session required" });
    }
    const existingProfiles = await fetch(`${supabaseUrl}/rest/v1/admin_profiles?select=user_id,role&active=eq.true&limit=1`, {
      headers: serviceHeaders,
    });
    if (!existingProfiles.ok) return json(response, 502, { error: "admin profile lookup failed" });
    const existing = await existingProfiles.json();
    const requestedRole = String(body.role || "admin");
    const role = existing.length && ["owner", "admin", "moderator"].includes(requestedRole)
      ? requestedRole
      : "owner";
    const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: { ...serviceHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    const created = await createResponse.json();
    if (!createResponse.ok) return json(response, createResponse.status, { error: created.msg || created.message || "account creation failed" });
    user = created.user || created;
    profile = { user_id: user.id, display_name: email.split("@")[0], role, active: true };
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/admin_profiles?on_conflict=user_id`, {
      method: "POST",
      headers: { ...serviceHeaders, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(profile),
    });
    if (!profileResponse.ok) {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: serviceHeaders }).catch(() => {});
      return json(response, 502, { error: "admin profile creation failed" });
    }
    [profile] = await profileResponse.json();
  } else if (action === "sign-in") {
    const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const signedIn = await signInResponse.json();
    if (!signInResponse.ok || !signedIn.user?.id) return json(response, 401, { error: "invalid email or password" });
    user = signedIn.user;
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/admin_profiles?select=*&user_id=eq.${user.id}&active=eq.true&limit=1`, {
      headers: serviceHeaders,
    });
    if (!profileResponse.ok) return json(response, 502, { error: "admin profile lookup failed" });
    [profile] = await profileResponse.json();
    if (!profile) return json(response, 403, { error: "this account is not an active administrator" });
  } else {
    return json(response, 400, { error: "invalid action" });
  }

  response.setHeader("Set-Cookie", adminSessionCookie(createAdminSession({
    actor: profile.display_name,
    userId: user.id,
    role: profile.role,
    method: "account",
  })));
  return json(response, 200, { authenticated: true, role: profile.role, displayName: profile.display_name });
};
