const { authorizeAdminRequest } = require("./_admin-auth");

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
    if (body.length > 16_384) reject(new Error("payload too large"));
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

const normalizedPseudonym = (value) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");

const validPseudonym = (value) => {
  const pseudonym = String(value || "").trim().replace(/\s+/g, " ");
  return pseudonym.length >= 2 && pseudonym.length <= 32 && /^[\p{L}\p{N} ._-]+$/u.test(pseudonym);
};

const serviceHeaders = (serviceKey) => ({ apikey: serviceKey, Authorization: `Bearer ${serviceKey}` });

function memberLimit(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return 200;
  return Math.max(1, Math.min(parsed, 500));
}

function normalizeMember(row) {
  return {
    userId: row.user_id,
    pseudonym: row.pseudonym,
    joinedAt: row.joined_at,
    approvedCount: Number(row.approved_count) || 0,
    pendingCount: Number(row.pending_count) || 0,
    totalCount: Number(row.total_count) || 0,
    lastContributionAt: row.last_contribution_at,
  };
}

module.exports = async function handler(request, response) {
  const authorization = authorizeAdminRequest(request);
  if (!authorization.ok) return json(response, 401, { error: "admin session required" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return json(response, 503, { error: "member service unavailable" });
  const headers = serviceHeaders(serviceKey);

  if (request.method === "GET") {
    const url = new URL(request.url || "/api/admin-members", `https://${request.headers.host || "openazulejos.com"}`);
    const query = new URLSearchParams({
      select: "user_id,pseudonym,joined_at,approved_count,pending_count,total_count,last_contribution_at",
      order: "total_count.desc,approved_count.desc,last_contribution_at.desc",
      limit: String(memberLimit(url.searchParams.get("limit"))),
    });
    const upstream = await fetch(`${supabaseUrl}/rest/v1/public_contributor_stats?${query}`, { headers });
    if (!upstream.ok) return json(response, upstream.status, { error: "member lookup failed", detail: await upstream.text() });
    return json(response, 200, { members: (await upstream.json()).map(normalizeMember) });
  }

  if (request.method !== "PATCH") {
    response.setHeader("Allow", "GET, PATCH");
    return json(response, 405, { error: "method not allowed" });
  }

  let body;
  try {
    body = await readBody(request);
  } catch {
    return json(response, 400, { error: "invalid request" });
  }

  const userId = String(body.userId || "").trim();
  const pseudonym = String(body.pseudonym || "").trim().replace(/\s+/g, " ");
  const normalized = normalizedPseudonym(pseudonym);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return json(response, 400, { error: "valid member id is required" });
  }
  if (!validPseudonym(pseudonym)) {
    return json(response, 400, { error: "pseudonym must be 2-32 letters, numbers, spaces, dots, underscores or hyphens" });
  }

  const available = await fetch(`${supabaseUrl}/rest/v1/contributor_profiles?select=user_id&normalized_pseudonym=eq.${encodeURIComponent(normalized)}&user_id=neq.${userId}&limit=1`, {
    headers,
  });
  if (!available.ok) return json(response, 502, { error: "pseudonym lookup failed" });
  if ((await available.json()).length) return json(response, 409, { error: "pseudonym already taken" });

  const update = await fetch(`${supabaseUrl}/rest/v1/contributor_profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      pseudonym,
      normalized_pseudonym: normalized,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!update.ok) return json(response, update.status, { error: "member update failed", detail: await update.text() });
  const [profile] = await update.json();
  if (!profile) return json(response, 404, { error: "member not found" });
  return json(response, 200, { member: { userId: profile.user_id, pseudonym: profile.pseudonym } });
};
