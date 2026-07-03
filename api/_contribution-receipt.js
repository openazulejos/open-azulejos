const crypto = require("node:crypto");

const receiptHash = (token) => crypto.createHash("sha256").update(String(token || "")).digest("hex");

const issueContributionReceipt = async (supabaseUrl, headers, legacyAzulejoId, contributorId = null) => {
  const token = crypto.randomBytes(32).toString("base64url");
  const response = await fetch(`${supabaseUrl}/rest/v1/contributions?legacy_azulejo_id=eq.${legacyAzulejoId}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      receipt_token_hash: receiptHash(token),
      ...(contributorId ? { contributor_id: contributorId } : {}),
    }),
  });
  if (!response.ok) throw new Error(`contribution receipt failed: ${response.status} ${await response.text()}`);
  const records = await response.json();
  if (records.length !== 1) throw new Error("contribution receipt target was not found");
  return token;
};

module.exports = { issueContributionReceipt, receiptHash };
