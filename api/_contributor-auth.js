const crypto = require("node:crypto");

const COOKIE_NAME = "open_azulejos_contributor";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

const safeEqual = (first, second) => {
  const left = Buffer.from(String(first || ""));
  const right = Buffer.from(String(second || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const sessionSecret = () => process.env.CONTRIBUTOR_SESSION_SECRET
  || process.env.ADMIN_SESSION_SECRET
  || process.env.ADMIN_KEY
  || "";

const signatureFor = (payload) => crypto
  .createHmac("sha256", sessionSecret())
  .update(`contributor:${payload}`)
  .digest("base64url");

const createContributorSession = ({ userId, email, pseudonym }) => {
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    userId,
    email,
    pseudonym,
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

const verifyContributorSession = (token) => {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature || !sessionSecret() || !safeEqual(signature, signatureFor(payload))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (claims.v !== 1 || !claims.userId || !Number.isFinite(claims.exp)
      || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
};

const authorizeContributorRequest = (request) => verifyContributorSession(readCookies(request)[COOKIE_NAME]);

const contributorSessionCookie = (token) => [
  `${COOKIE_NAME}=${encodeURIComponent(token)}`,
  "Path=/",
  `Max-Age=${SESSION_SECONDS}`,
  "HttpOnly",
  "Secure",
  "SameSite=Strict",
].join("; ");

const clearedContributorSessionCookie = () => [
  `${COOKIE_NAME}=`,
  "Path=/",
  "Max-Age=0",
  "HttpOnly",
  "Secure",
  "SameSite=Strict",
].join("; ");

module.exports = {
  authorizeContributorRequest,
  clearedContributorSessionCookie,
  contributorSessionCookie,
  createContributorSession,
  verifyContributorSession,
};
