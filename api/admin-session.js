const {
  authorizeAdminRequest,
  clearedAdminSessionCookie,
} = require("./_admin-auth");
const { authorizeContributorRequest } = require("./_contributor-auth");

const respond = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(payload));
};

const contributorAdminAuthorization = async (request) => {
  const contributor = authorizeContributorRequest(request);
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!contributor?.userId || !supabaseUrl || !serviceKey) return null;
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
  if (request.method === "GET") {
    const authorization = authorizeAdminRequest(request);
    if (authorization.ok) {
      return respond(response, 200, {
        authenticated: true,
        method: authorization.method,
        role: authorization.role,
      });
    }
    const contributorAdmin = await contributorAdminAuthorization(request);
    return respond(response, contributorAdmin ? 200 : 401, {
      authenticated: Boolean(contributorAdmin),
      method: contributorAdmin?.method || null,
      role: contributorAdmin?.role || null,
    });
  }

  if (request.method === "DELETE") {
    response.setHeader("Set-Cookie", clearedAdminSessionCookie());
    return respond(response, 200, { authenticated: false });
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST, DELETE");
    return respond(response, 405, { error: "method not allowed" });
  }

  return respond(response, 410, { error: "temporary admin access has been removed" });
};
