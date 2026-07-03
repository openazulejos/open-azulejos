const crypto = require("node:crypto");
const { receiptHash } = require("./_contribution-receipt");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const json = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(payload));
};

const readBody = (request) => new Promise((resolve, reject) => {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
    if (body.length > 64_000) reject(new Error("payload too large"));
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

const safeEqual = (first, second) => {
  const firstBuffer = Buffer.from(String(first || ""));
  const secondBuffer = Buffer.from(String(second || ""));
  return firstBuffer.length === secondBuffer.length && crypto.timingSafeEqual(firstBuffer, secondBuffer);
};

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "method not allowed" });
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return json(response, 503, { error: "status service unavailable" });

  let body;
  try {
    body = await readBody(request);
  } catch {
    return json(response, 400, { error: "invalid request" });
  }
  const receipts = Array.isArray(body.receipts) ? body.receipts.slice(0, 50) : [];
  if (!receipts.length || receipts.some((item) => !UUID_PATTERN.test(item?.id) || !TOKEN_PATTERN.test(item?.token))) {
    return json(response, 400, { error: "valid contribution receipts are required" });
  }
  const uniqueReceipts = [...new Map(receipts.map((item) => [item.id, { id: item.id, token: item.token }])).values()];
  const ids = uniqueReceipts.map((item) => item.id).join(",");
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  const query = new URLSearchParams({
    select: "legacy_azulejo_id,status,moderation_reason,submitted_at,updated_at,receipt_token_hash",
    legacy_azulejo_id: `in.(${ids})`,
  });
  const statusResponse = await fetch(`${supabaseUrl}/rest/v1/contributions?${query}`, { headers });
  if (!statusResponse.ok) return json(response, statusResponse.status, { error: "contribution status failed" });
  const stored = await statusResponse.json();
  const byId = new Map(stored.map((item) => [item.legacy_azulejo_id, item]));
  const records = uniqueReceipts.flatMap((receipt) => {
    const record = byId.get(receipt.id);
    if (!record || !safeEqual(record.receipt_token_hash, receiptHash(receipt.token))) return [];
    return [{
      id: record.legacy_azulejo_id,
      status: record.status,
      reason: record.moderation_reason,
      submittedAt: record.submitted_at,
      updatedAt: record.updated_at,
    }];
  });
  return json(response, 200, { records });
};
