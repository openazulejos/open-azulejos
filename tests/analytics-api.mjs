import { Readable } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/analytics.js");
const originalFetch = global.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function invoke({ method = "POST", origin = "https://openazulejos.com", body = {} } = {}) {
  const request = Readable.from([JSON.stringify(body)]);
  request.method = method;
  request.headers = { origin };
  return new Promise((resolve) => {
    const response = {
      headers: {},
      setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
      end(value) { resolve({ status: this.statusCode, body: JSON.parse(value || "{}"), headers: this.headers }); },
    };
    handler(request, response);
  });
}

const method = await invoke({ method: "GET" });
assert(method.status === 405, "analytics should accept POST only");
const foreign = await invoke({ origin: "https://tracker.example", body: { event: "page_view", view: "map", source: "direct" } });
assert(foreign.status === 403, "foreign browser origins should be rejected");
const invalid = await invoke({ body: { event: "page_view", view: "unknown", source: "direct" } });
assert(invalid.status === 400, "unknown dimensions should be rejected");

let rpcBody = null;
global.fetch = async (url, options) => {
  assert(String(url).endsWith("/rest/v1/rpc/record_site_analytics"), "analytics should use the aggregate RPC");
  rpcBody = JSON.parse(options.body);
  return { ok: true };
};
const accepted = await invoke({ body: { event: "page_view", view: "grid", source: "search", ip: "not-stored" } });
assert(accepted.status === 202 && accepted.body.recorded, "valid aggregate view should be accepted");
assert(JSON.stringify(rpcBody) === JSON.stringify({ p_event: "page_view", p_view: "grid", p_source: "search" }), "only aggregate dimensions should reach storage");
assert(handler.allowedOrigin("http://localhost:3000"), "local development should be allowed");

global.fetch = originalFetch;
Object.entries(originalEnv).forEach(([key, value]) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
});

console.log("analytics api tests passed");
