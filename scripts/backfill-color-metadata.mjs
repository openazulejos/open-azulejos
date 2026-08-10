import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { metadataFromPixels } = require("../color-classification.js");

const APPLY = process.argv.includes("--apply");
const limitArgument = process.argv.find((value) => value.startsWith("--limit="));
const LIMIT = Math.max(1, Math.min(1000, Number(limitArgument?.split("=")[1]) || 1000));
const concurrencyArgument = process.argv.find((value) => value.startsWith("--concurrency="));
const CONCURRENCY = Math.max(1, Math.min(8, Number(concurrencyArgument?.split("=")[1]) || 4));
const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

const readMissingRecords = async () => {
  const query = new URLSearchParams({
    select: "id,image_url,created_at",
    moderation_status: "eq.approved",
    dominant_color: "is.null",
    source: "eq.web-camera",
    title: "neq.api test",
    order: "created_at.asc",
    limit: String(LIMIT),
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/azulejos?${query}`, { headers });
  if (!response.ok) throw new Error(`record query failed ${response.status}`);
  return response.json();
};

const decodeJpegSample = (buffer) => new Promise((resolve, reject) => {
  const process = spawn("magick", [
    "jpg:-",
    "-auto-orient",
    "-resize", "32x32!",
    "-alpha", "on",
    "rgba:-",
  ], { stdio: ["pipe", "pipe", "pipe"] });
  const output = [];
  let error = "";
  process.stdout.on("data", (chunk) => output.push(chunk));
  process.stderr.on("data", (chunk) => { error += chunk; });
  process.on("error", reject);
  process.on("close", (code) => {
    if (code !== 0) {
      reject(new Error(`ImageMagick failed: ${error.trim() || code}`));
      return;
    }
    const pixels = Buffer.concat(output);
    if (pixels.length !== 32 * 32 * 4) {
      reject(new Error(`unexpected decoded sample size ${pixels.length}`));
      return;
    }
    resolve(pixels);
  });
  process.stdin.end(buffer);
});

const updateRecord = async (record, metadata) => {
  const query = new URLSearchParams({ id: `eq.${record.id}`, dominant_color: "is.null" });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/azulejos?${query}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ dominant_color: metadata.dominant, color_metadata: metadata }),
  });
  if (!response.ok) throw new Error(`record update failed ${response.status}`);
};

const analyzeRecord = async (record) => {
  const image = await fetch(record.image_url);
  if (!image.ok) throw new Error(`image download failed ${image.status}`);
  const pixels = await decodeJpegSample(Buffer.from(await image.arrayBuffer()));
  const metadata = {
    ...metadataFromPixels(pixels, "archive-backfill-v1"),
    analyzed_at: new Date().toISOString(),
  };
  if (APPLY) await updateRecord(record, metadata);
  return metadata;
};

const records = await readMissingRecords();
const distribution = {};
const failures = [];
let completed = 0;
let cursor = 0;

const worker = async () => {
  while (cursor < records.length) {
    const index = cursor++;
    const record = records[index];
    try {
      const metadata = await analyzeRecord(record);
      distribution[metadata.dominant] = (distribution[metadata.dominant] || 0) + 1;
    } catch (error) {
      failures.push({ id: record.id, error: error.message });
    }
    completed += 1;
    if (completed % 25 === 0 || completed === records.length) {
      process.stderr.write(`analyzed ${completed}/${records.length}\n`);
    }
  }
};

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, records.length || 1) }, worker));

console.log(JSON.stringify({
  mode: APPLY ? "apply" : "dry-run",
  requested: records.length,
  analyzed: records.length - failures.length,
  updated: APPLY ? records.length - failures.length : 0,
  distribution,
  failures,
}, null, 2));

if (failures.length) process.exitCode = 1;
