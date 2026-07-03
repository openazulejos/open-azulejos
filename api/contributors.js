const json = (response, status, payload, cache = "public, s-maxage=120, stale-while-revalidate=600") => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", cache);
  response.end(JSON.stringify(payload));
};

function contributorLimit(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return 12;
  return Math.max(1, Math.min(50, parsed));
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "method not allowed" }, "private, no-store");
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return json(response, 503, { error: "contributors service unavailable" }, "private, no-store");

  const url = new URL(request.url || "/api/contributors", `https://${request.headers.host || "openazulejos.com"}`);
  const query = new URLSearchParams({
    select: "pseudonym,joined_at,approved_count,pending_count,total_count,last_contribution_at",
    total_count: "gt.0",
    order: "approved_count.desc,total_count.desc,last_contribution_at.desc",
    limit: String(contributorLimit(url.searchParams.get("limit"))),
  });
  const upstream = await fetch(`${supabaseUrl}/rest/v1/public_contributor_stats?${query}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!upstream.ok) return json(response, upstream.status, { error: "contributors lookup failed" }, "private, no-store");
  const rows = await upstream.json();
  const contributors = rows.map((row) => ({
    pseudonym: row.pseudonym,
    joinedAt: row.joined_at,
    approvedCount: Number(row.approved_count) || 0,
    pendingCount: Number(row.pending_count) || 0,
    totalCount: Number(row.total_count) || 0,
    lastContributionAt: row.last_contribution_at,
  }));
  return json(response, 200, { contributors });
};
