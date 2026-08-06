import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fetchWithRetry } from "./fetch-with-retry.mjs";

const argumentsList = process.argv.slice(2);
const argument = (name, fallback = "") => {
  const index = argumentsList.indexOf(name);
  return index >= 0 ? argumentsList[index + 1] || fallback : fallback;
};

const origin = argument("--origin", "https://openazulejos.com").replace(/\/$/, "");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputRoot = path.resolve(argument("--output", path.join("..", "openazulejos-backups")));
const destination = path.join(outputRoot, timestamp);
const adminKey = process.env.ADMIN_KEY || argument("--admin-key");
const supabaseUrl = (process.env.SUPABASE_URL || argument("--supabase-url")).replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || argument("--service-key");

function backupFetch(url, options = {}) {
  return fetchWithRetry(url, options, {
    onRetry: ({ attempt, attempts, delayMs, status, error }) => {
      const reason = status ? `HTTP ${status}` : error?.message || "network error";
      console.warn(`Retrying ${new URL(url).pathname} after ${reason} (attempt ${attempt + 1}/${attempts}, ${delayMs} ms)`);
    },
  });
}

async function readRecordsDirect() {
  const records = [];
  const limit = 1000;
  for (let offset = 0; ; offset += limit) {
    const query = new URLSearchParams({
      select: "*",
      source: "eq.web-camera",
      title: "neq.api test",
      order: "created_at.asc",
      limit: String(limit),
      offset: String(offset),
    });
    const response = await backupFetch(`${supabaseUrl}/rest/v1/azulejos?${query}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`direct manifest failed: ${response.status} ${await response.text()}`);
    const page = await response.json();
    records.push(...page);
    if (page.length < limit) break;
  }
  return { records, scope: "all-service-role-records" };
}

async function readRecords() {
  if (supabaseUrl && serviceKey) return readRecordsDirect();
  if (!adminKey) {
    const response = await backupFetch(`${origin}/api/records?backup-public=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`public manifest failed: ${response.status}`);
    const payload = await response.json();
    return { records: payload.records || [], scope: "approved-public-records" };
  }
  const records = [];
  let offset = 0;
  do {
    const response = await backupFetch(`${origin}/api/records?backup=manifest&offset=${offset}`, {
      headers: { "x-admin-key": adminKey },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`admin manifest failed: ${response.status}`);
    const payload = await response.json();
    records.push(...(payload.records || []));
    offset = payload.nextOffset;
  } while (offset !== null);
  return { records, scope: "all-admin-records" };
}

function extensionFor(url, contentType) {
  if (/png/i.test(contentType)) return "png";
  if (/webp/i.test(contentType)) return "webp";
  const pathname = new URL(url).pathname;
  const extension = path.extname(pathname).slice(1).toLowerCase();
  return ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "jpg";
}

async function downloadAsset(record, kind, asset) {
  const headers = asset.private && serviceKey
    ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    : {};
  const response = await backupFetch(asset.url, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`${kind} ${record.id}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const extension = extensionFor(asset.url, response.headers.get("content-type") || "");
  const filename = `${record.id}-${kind}.${extension}`;
  await fs.writeFile(path.join(destination, "images", filename), bytes);
  return {
    recordId: record.id,
    kind,
    filename,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    sourceUrl: asset.url,
    bucket: asset.bucket || null,
    objectPath: asset.objectPath || null,
  };
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

await fs.mkdir(path.join(destination, "images"), { recursive: true });
const { records, scope } = await readRecords();
await fs.writeFile(path.join(destination, "records.json"), `${JSON.stringify(records, null, 2)}\n`);

const assetsToDownload = records.flatMap((record) => {
  const imageBucket = record.image_bucket || "azulejos";
  const originalBucket = record.original_image_bucket || (record.original_image_path ? "azulejos" : null);
  const publishedUrl = record.image_path && supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/${imageBucket}/${record.image_path}`
    : record.image_url;
  const assets = publishedUrl ? [{
    record,
    kind: "published",
    asset: {
      url: publishedUrl,
      bucket: imageBucket,
      objectPath: record.image_path,
      private: !!(supabaseUrl && serviceKey),
    },
  }] : [];
  const sourceUrl = record.original_image_path && supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/${originalBucket}/${record.original_image_path}`
    : record.original_image_url;
  if (sourceUrl && sourceUrl !== record.image_url) {
    assets.push({
      record,
      kind: "source",
      asset: {
        url: sourceUrl,
        bucket: originalBucket,
        objectPath: record.original_image_path,
        private: !!(supabaseUrl && serviceKey),
      },
    });
  }
  return assets;
});

const failures = [];
const assets = (await mapWithConcurrency(assetsToDownload, 4, async ({ record, kind, asset }) => {
  try {
    return await downloadAsset(record, kind, asset);
  } catch (error) {
    failures.push({ recordId: record.id, kind, url: asset.url, error: error.message });
    return null;
  }
})).filter(Boolean);

const manifest = {
  createdAt: new Date().toISOString(),
  origin,
  scope,
  recordCount: records.length,
  assetCount: assets.length,
  totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
  assets,
  failures,
};
manifest.recordsSha256 = crypto.createHash("sha256")
  .update(await fs.readFile(path.join(destination, "records.json")))
  .digest("hex");
await fs.writeFile(path.join(destination, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ destination, ...manifest, assets: undefined }, null, 2));
if (failures.length) process.exitCode = 1;
