import { Readable } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const auth = require("../api/_admin-auth.js");
const sessionHandler = require("../api/admin-session.js");
const originalKey = process.env.ADMIN_KEY;
process.env.ADMIN_KEY = "correct horse battery staple";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function responseCapture() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: "",
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(value) { this.body = value || ""; },
  };
}

const token = auth.createAdminSession();
assert(auth.authorizeAdminRequest({ headers: { cookie: `open_azulejos_admin=${token}` } }).ok, "signed session should authorize");
assert(!auth.authorizeAdminRequest({ headers: { cookie: `open_azulejos_admin=${token}x` } }).ok, "tampered session should fail");
assert(auth.authorizeAdminRequest({ headers: { "x-admin-key": process.env.ADMIN_KEY } }).ok, "legacy key should remain available during transition");
const namedToken = auth.createAdminSession({ actor: "curator", userId: "11111111-1111-4111-8111-111111111111", role: "owner", method: "account" });
const namedAuthorization = auth.authorizeAdminRequest({ headers: { cookie: `open_azulejos_admin=${namedToken}` } });
assert(namedAuthorization.userId && namedAuthorization.role === "owner", "named session should retain actor identity and role");

const loginRequest = Readable.from([JSON.stringify({ key: process.env.ADMIN_KEY })]);
loginRequest.method = "POST";
loginRequest.headers = {};
const loginResponse = responseCapture();
await sessionHandler(loginRequest, loginResponse);
assert(loginResponse.statusCode === 200, "valid key should create a session");
assert(/HttpOnly/.test(loginResponse.headers["set-cookie"]), "admin cookie should be HttpOnly");
assert(/SameSite=Strict/.test(loginResponse.headers["set-cookie"]), "admin cookie should be same-site strict");
assert(!loginResponse.headers["set-cookie"].includes(process.env.ADMIN_KEY), "cookie must not contain the admin key");

const cookie = loginResponse.headers["set-cookie"].split(";", 1)[0];
const checkRequest = { method: "GET", headers: { cookie } };
const checkResponse = responseCapture();
await sessionHandler(checkRequest, checkResponse);
assert(checkResponse.statusCode === 200 && JSON.parse(checkResponse.body).authenticated, "session check should succeed");

if (originalKey === undefined) delete process.env.ADMIN_KEY;
else process.env.ADMIN_KEY = originalKey;
console.log("security api tests passed");
