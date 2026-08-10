const ALLOWED_EVENTS = new Set(["page_view"]);
const ALLOWED_VIEWS = new Set(["map", "grid", "canva"]);
const ALLOWED_SOURCES = new Set(["direct", "internal", "search", "social", "referral"]);

const json = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
};

const readBody = (request) => new Promise((resolve, reject) => {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
    if (body.length > 2_048) reject(new Error("payload too large"));
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

const allowedOrigin = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.origin === "https://openazulejos.com"
      || url.origin === "https://www.openazulejos.com"
      || url.hostname === "localhost"
      || url.hostname === "127.0.0.1"
      || url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "method not allowed" });
  }
  if (!allowedOrigin(request.headers?.origin)) return json(response, 403, { error: "origin not allowed" });

  let body;
  try {
    body = await readBody(request);
  } catch {
    return json(response, 400, { error: "invalid analytics payload" });
  }

  const event = String(body.event || "");
  const view = String(body.view || "");
  const source = String(body.source || "");
  if (!ALLOWED_EVENTS.has(event) || !ALLOWED_VIEWS.has(view) || !ALLOWED_SOURCES.has(source)) {
    return json(response, 400, { error: "invalid analytics dimensions" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return json(response, 503, { error: "analytics unavailable" });

  try {
    const result = await fetch(`${supabaseUrl}/rest/v1/rpc/record_site_analytics`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_event: event, p_view: view, p_source: source }),
    });
    if (!result.ok) throw new Error("analytics write failed");
    return json(response, 202, { recorded: true });
  } catch (error) {
    return json(response, 502, { error: error.message || "analytics write failed" });
  }
};

module.exports.allowedOrigin = allowedOrigin;
