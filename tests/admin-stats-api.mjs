import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const auth = require("../api/_admin-auth.js");
const handler = require("../api/admin-stats.js");
const originalFetch = global.fetch;
const originalEnv = {
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  BETA_STARTED_AT: process.env.BETA_STARTED_AT,
};

process.env.ADMIN_SESSION_SECRET = "stats-session-secret";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
process.env.BETA_STARTED_AT = "2026-07-04T00:00:00.000Z";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function invoke({ authenticated = true, method = "GET" } = {}) {
  const token = authenticated ? auth.createAdminSession({ actor: "tester", role: "owner" }) : "";
  const request = { method, headers: { cookie: token ? `open_azulejos_admin=${token}` : "" } };
  return new Promise((resolve) => {
    const response = {
      headers: {},
      setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
      end(body) { resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(body) }); },
    };
    handler(request, response);
  });
}

const unauthorized = await invoke({ authenticated: false });
assert(unauthorized.status === 401, "stats should require an admin session");

const methodRejected = await invoke({ method: "POST" });
assert(methodRejected.status === 405, "stats should reject non-GET methods");

const rows = {
  contributor_profiles: [
    { user_id: "founder", created_at: "2026-07-01T10:00:00.000Z" },
    { user_id: "new-user", created_at: "2026-07-04T12:00:00.000Z" },
  ],
  azulejos: [
    { id: "legacy", source: "web-camera", title: "old", moderation_status: "approved", created_at: "2026-07-01T10:00:00.000Z" },
    { id: "approved", source: "web-camera", title: "new", moderation_status: "approved", created_at: "2026-07-04T12:00:00.000Z" },
    { id: "pending", source: "web-camera", title: "new", moderation_status: "pending", created_at: "2026-07-04T13:00:00.000Z" },
    { id: "rejected", source: "web-camera", title: "new", moderation_status: "rejected", created_at: "2026-07-04T14:00:00.000Z" },
  ],
  contributions: [
    { contributor_id: "new-user", submitted_at: "2026-07-04T12:00:00.000Z" },
    { contributor_id: null, submitted_at: "2026-07-04T13:00:00.000Z" },
    { contributor_id: null, submitted_at: "2026-07-04T14:00:00.000Z" },
  ],
};

const valueMatches = (row, key, filter) => {
  if (filter.startsWith("eq.")) return String(row[key]) === filter.slice(3);
  if (filter.startsWith("neq.")) return String(row[key]) !== filter.slice(4);
  if (filter.startsWith("gte.")) return new Date(row[key]) >= new Date(filter.slice(4));
  return true;
};

global.fetch = async (value, options = {}) => {
  const url = new URL(value);
  const table = url.pathname.split("/").at(-1);
  let result = (rows[table] || []).filter((row) => [...url.searchParams.entries()]
    .filter(([key]) => !["select", "limit", "order"].includes(key))
    .every(([key, filter]) => valueMatches(row, key, filter)));
  const order = url.searchParams.get("order");
  if (order === "created_at.desc") result = result.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const rangeHeaders = { get: (name) => name.toLowerCase() === "content-range" ? `0-0/${result.length}` : null };
  if (options.headers?.Prefer === "count=exact") return { ok: true, headers: rangeHeaders, json: async () => result.slice(0, 1) };
  const limit = Number(url.searchParams.get("limit")) || result.length;
  return { ok: true, headers: rangeHeaders, json: async () => result.slice(0, limit) };
};

const stats = await invoke();
assert(stats.status === 200, "stats should load");
assert(stats.body.metrics.totalContributors === 2, "stats should count all contributors");
assert(stats.body.metrics.newContributors === 1, "stats should count beta contributors");
assert(stats.body.metrics.totalPublished === 2, "stats should retain the archive total");
assert(stats.body.metrics.publishedSinceBeta === 1, "stats should exclude old approved images from beta growth");
assert(stats.body.metrics.submissionsSinceBeta === 3, "stats should count beta submissions");
assert(stats.body.metrics.pendingNow === 1, "stats should count the moderation queue");
assert(stats.body.metrics.activeContributors === 1, "stats should count distinct active accounts");
assert(stats.body.metrics.guestSubmissions === 2, "stats should count anonymous submissions");
assert(stats.body.metrics.approvalRate === 50, "stats should calculate resolved approval rate");
assert(stats.body.daily.find((day) => day.date === "2026-07-04")?.submitted === 3, "daily series should group beta submissions by Lisbon day");

assert(handler.countFromRange("0-0/109") === 109, "content range count should parse");
assert(handler.countFromRange("*/0") === 0, "empty content range should parse");
assert(handler.lisbonDayKey("2026-07-04T23:30:00.000Z") === "2026-07-05", "Lisbon day should use local time");

global.fetch = originalFetch;
Object.entries(originalEnv).forEach(([key, value]) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
});

console.log("admin stats api tests passed");
