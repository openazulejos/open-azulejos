const DEFAULT_SIZE = 128;
const MAX_SIZE = 1024;
const DEFAULT_QUALITY = 50;
const MAX_BYTES = 2_500_000;

const json = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(payload));
};

const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
};

const supabaseStorageOrigin = () => {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const transformedSupabaseUrl = (sourceUrl, { width, height, quality }) => {
  const allowedOrigin = supabaseStorageOrigin();
  if (!allowedOrigin) return null;
  let source;
  try {
    source = new URL(sourceUrl);
  } catch {
    return null;
  }
  const publicMarker = "/storage/v1/object/public/";
  if (source.origin !== allowedOrigin || !source.pathname.includes(publicMarker)) return null;
  source.pathname = source.pathname.replace(publicMarker, "/storage/v1/render/image/public/");
  source.searchParams.set("width", String(width));
  source.searchParams.set("height", String(height));
  source.searchParams.set("resize", "cover");
  source.searchParams.set("quality", String(quality));
  return source.toString();
};

module.exports = async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    return json(response, 405, { error: "method not allowed" });
  }

  const requestUrl = new URL(request.url || "/api/image", `https://${request.headers.host || "openazulejos.com"}`);
  const source = requestUrl.searchParams.get("src") || "";
  const width = clampInteger(requestUrl.searchParams.get("w"), DEFAULT_SIZE, 16, MAX_SIZE);
  const height = clampInteger(requestUrl.searchParams.get("h"), width, 16, MAX_SIZE);
  const quality = clampInteger(requestUrl.searchParams.get("q"), DEFAULT_QUALITY, 25, 82);
  const upstreamUrl = transformedSupabaseUrl(source, { width, height, quality });
  if (!upstreamUrl) return json(response, 400, { error: "unsupported image source" });

  const upstream = await fetch(upstreamUrl, {
    headers: { Accept: "image/avif,image/webp,image/jpeg,image/png,*/*" },
  }).catch((error) => ({ ok: false, status: 502, text: async () => error.message }));
  if (!upstream.ok) {
    return json(response, upstream.status || 502, { error: "image transform failed", detail: await upstream.text().catch(() => "") });
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) return json(response, 502, { error: "upstream did not return an image" });
  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (bytes.length > MAX_BYTES) return json(response, 502, { error: "transformed image too large" });

  response.statusCode = 200;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Content-Length", String(bytes.length));
  response.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
  response.setHeader("Vary", "Accept");
  if (request.method === "HEAD") return response.end();
  return response.end(bytes);
};

module.exports.transformedSupabaseUrl = transformedSupabaseUrl;
