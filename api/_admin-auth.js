const crypto = require("node:crypto");

const COOKIE_NAME = "open_azulejos_admin";
const SESSION_SECONDS = 8 * 60 * 60;

const safeEqual = (first, second) => {
  const left = Buffer.from(String(first || ""));
  const right = Buffer.from(String(second || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const sessionSecret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_KEY || "";

const signatureFor = (payload) => crypto
  .createHmac("sha256", sessionSecret())
  .update(payload)
  .digest("base64url");

const createAdminSession = (identity = "founder-admin") => {
  const details = typeof identity === "string" ? { actor: identity } : identity;
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    actor: details.actor || "admin",
    userId: details.userId || null,
    role: details.role || null,
    method: details.method || "session",
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })).toString("base64url");
  return `${payload}.${signatureFor(payload)}`;
};

const readCookies = (request) => Object.fromEntries(String(request.headers?.cookie || "")
  .split(";")
  .map((part) => part.trim())
  .filter(Boolean)
  .map((part) => {
    const separator = part.indexOf("=");
    return separator < 0
      ? [part, ""]
      : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }));

const verifyAdminSession = (token) => {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature || !sessionSecret() || !safeEqual(signature, signatureFor(payload))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (claims.v !== 1 || !Number.isFinite(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
};

const authorizeAdminRequest = (request) => {
  const configuredKey = process.env.ADMIN_KEY || "";
  const presentedKey = request.headers?.["x-admin-key"];
  if (configuredKey && typeof presentedKey === "string" && safeEqual(presentedKey, configuredKey)) {
    return { ok: true, actor: "legacy-admin-key", method: "key" };
  }
  const claims = verifyAdminSession(readCookies(request)[COOKIE_NAME]);
  return claims
    ? {
      ok: true,
      actor: claims.actor || "founder-admin",
      userId: claims.userId || null,
      role: claims.role || null,
      method: claims.method || "session",
    }
    : { ok: false, actor: null, userId: null, role: null, method: null };
};

const adminSessionCookie = (token) => [
  `${COOKIE_NAME}=${encodeURIComponent(token)}`,
  "Path=/",
  `Max-Age=${SESSION_SECONDS}`,
  "HttpOnly",
  "Secure",
  "SameSite=Strict",
].join("; ");

const clearedAdminSessionCookie = () => [
  `${COOKIE_NAME}=`,
  "Path=/",
  "Max-Age=0",
  "HttpOnly",
  "Secure",
  "SameSite=Strict",
].join("; ");

module.exports = {
  authorizeAdminRequest,
  adminSessionCookie,
  clearedAdminSessionCookie,
  createAdminSession,
  safeEqual,
};
