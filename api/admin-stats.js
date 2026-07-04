const { authorizeAdminRequest } = require("./_admin-auth");

const DEFAULT_BETA_STARTED_AT = "2026-07-04T00:00:00.000Z";
const MAX_ACTIVITY_ROWS = 10_000;

const json = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(payload));
};

const countFromRange = (value) => {
  const total = String(value || "").split("/")[1];
  return /^\d+$/.test(total || "") ? Number(total) : 0;
};

const lisbonDayKey = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const recentDayKeys = (now = new Date()) => Array.from({ length: 7 }, (_, index) => {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - (6 - index));
  return lisbonDayKey(date);
});

const tableUrl = (supabaseUrl, table, query) => `${supabaseUrl}/rest/v1/${table}?${query}`;

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "method not allowed" });
  }

  const authorization = authorizeAdminRequest(request);
  if (!authorization.ok) return json(response, 401, { error: "admin session required" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return json(response, 503, { error: "admin statistics unavailable" });

  const configuredStart = process.env.BETA_STARTED_AT || DEFAULT_BETA_STARTED_AT;
  const betaStartedAt = new Date(configuredStart);
  if (!Number.isFinite(betaStartedAt.getTime())) return json(response, 503, { error: "invalid beta start date" });

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const cameraFilters = {
    source: "eq.web-camera",
    title: "neq.api test",
  };
  const queryFor = (select, filters = {}, extras = {}) => new URLSearchParams({ select, ...filters, ...extras });
  const countRows = async (table, filters = {}) => {
    const query = queryFor("id", filters, { limit: "1" });
    const result = await fetch(tableUrl(supabaseUrl, table, query), {
      headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
    });
    if (!result.ok) throw new Error(`${table} count failed`);
    return countFromRange(result.headers.get("content-range"));
  };
  const readRows = async (table, select, filters = {}, extras = {}) => {
    const query = queryFor(select, filters, extras);
    const result = await fetch(tableUrl(supabaseUrl, table, query), { headers });
    if (!result.ok) throw new Error(`${table} activity read failed`);
    return result.json();
  };

  const betaIso = betaStartedAt.toISOString();
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const recentStart = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const betaFilters = { ...cameraFilters, created_at: `gte.${betaIso}` };

  try {
    const [
      totalContributors,
      newContributors,
      totalPublished,
      publishedSinceBeta,
      submissionsSinceBeta,
      pendingNow,
      rejectedSinceBeta,
      submissionsLast24Hours,
      launchContributions,
      recentSubmissions,
      latestSubmissionRows,
    ] = await Promise.all([
      countRows("contributor_profiles"),
      countRows("contributor_profiles", { created_at: `gte.${betaIso}` }),
      countRows("azulejos", { ...cameraFilters, moderation_status: "eq.approved" }),
      countRows("azulejos", { ...betaFilters, moderation_status: "eq.approved" }),
      countRows("azulejos", betaFilters),
      countRows("azulejos", { ...cameraFilters, moderation_status: "eq.pending" }),
      countRows("azulejos", { ...betaFilters, moderation_status: "eq.rejected" }),
      countRows("azulejos", { ...cameraFilters, created_at: `gte.${last24Hours}` }),
      readRows("contributions", "contributor_id,submitted_at", {
        submitted_at: `gte.${betaIso}`,
      }, { order: "submitted_at.desc", limit: String(MAX_ACTIVITY_ROWS) }),
      readRows("azulejos", "created_at,moderation_status", {
        ...cameraFilters,
        created_at: `gte.${recentStart}`,
      }, { order: "created_at.asc", limit: String(MAX_ACTIVITY_ROWS) }),
      readRows("azulejos", "created_at", cameraFilters, { order: "created_at.desc", limit: "1" }),
    ]);

    const activeContributorIds = new Set(launchContributions
      .map((item) => item.contributor_id)
      .filter(Boolean));
    const attributedSubmissions = launchContributions.filter((item) => item.contributor_id).length;
    const resolvedSinceBeta = publishedSinceBeta + rejectedSinceBeta;
    const approvalRate = resolvedSinceBeta ? Math.round((publishedSinceBeta / resolvedSinceBeta) * 100) : null;
    const days = new Map(recentDayKeys(now).map((date) => [date, {
      date,
      submitted: 0,
      approved: 0,
      rejected: 0,
    }]));
    recentSubmissions.forEach((item) => {
      const day = days.get(lisbonDayKey(item.created_at));
      if (!day) return;
      day.submitted += 1;
      if (item.moderation_status === "approved") day.approved += 1;
      if (item.moderation_status === "rejected") day.rejected += 1;
    });

    return json(response, 200, {
      launch: {
        startedAt: betaIso,
        timeZone: "Europe/Lisbon",
      },
      metrics: {
        totalContributors,
        newContributors,
        totalPublished,
        publishedSinceBeta,
        submissionsSinceBeta,
        pendingNow,
        rejectedSinceBeta,
        submissionsLast24Hours,
        activeContributors: activeContributorIds.size,
        guestSubmissions: Math.max(0, submissionsSinceBeta - attributedSubmissions),
        approvalRate,
        latestSubmissionAt: latestSubmissionRows[0]?.created_at || null,
      },
      daily: [...days.values()],
    });
  } catch (error) {
    return json(response, 502, { error: error.message || "statistics query failed" });
  }
};

module.exports.DEFAULT_BETA_STARTED_AT = DEFAULT_BETA_STARTED_AT;
module.exports.countFromRange = countFromRange;
module.exports.lisbonDayKey = lisbonDayKey;
