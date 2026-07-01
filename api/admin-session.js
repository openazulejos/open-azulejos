const {
  authorizeAdminRequest,
  adminSessionCookie,
  clearedAdminSessionCookie,
  createAdminSession,
  safeEqual,
} = require("./_admin-auth");

const respond = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(payload));
};

const readBody = (request) => new Promise((resolve, reject) => {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
    if (body.length > 16_384) reject(new Error("payload too large"));
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

module.exports = async function handler(request, response) {
  if (request.method === "GET") {
    const authorization = authorizeAdminRequest(request);
    return respond(response, authorization.ok ? 200 : 401, { authenticated: authorization.ok });
  }

  if (request.method === "DELETE") {
    response.setHeader("Set-Cookie", clearedAdminSessionCookie());
    return respond(response, 200, { authenticated: false });
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST, DELETE");
    return respond(response, 405, { error: "method not allowed" });
  }

  let body;
  try {
    body = await readBody(request);
  } catch {
    return respond(response, 400, { error: "invalid request" });
  }
  const configuredKey = process.env.ADMIN_KEY || "";
  if (!configuredKey || !safeEqual(body.key, configuredKey)) {
    return respond(response, 401, { error: "invalid admin key" });
  }

  response.setHeader("Set-Cookie", adminSessionCookie(createAdminSession()));
  return respond(response, 200, { authenticated: true });
};
