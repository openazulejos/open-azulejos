const allowedProviders = new Set(["google", "apple"]);

const json = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(payload));
};

function requestOrigin(request) {
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  if (!host) return "https://openazulejos.com";
  const proto = request.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

module.exports = async function handler(request, response) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !publishableKey) return json(response, 503, { error: "oauth unavailable" });
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "method not allowed" });
  }

  const url = new URL(request.url || "/api/contributor-oauth", requestOrigin(request));
  const provider = String(url.searchParams.get("provider") || "").toLowerCase();
  if (!allowedProviders.has(provider)) return json(response, 400, { error: "unsupported provider" });

  const redirectTo = `${requestOrigin(request)}/?account=oauth`;
  const authorizeUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  authorizeUrl.searchParams.set("provider", provider);
  authorizeUrl.searchParams.set("redirect_to", redirectTo);
  authorizeUrl.searchParams.set("scopes", provider === "google" ? "email profile" : "email name");

  response.statusCode = 302;
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("Location", authorizeUrl.toString());
  response.end();
};
