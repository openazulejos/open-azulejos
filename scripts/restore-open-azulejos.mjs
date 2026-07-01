import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
};
const backupDirectory = path.resolve(option("--backup"));
const targetUrl = (process.env.SUPABASE_URL || option("--target-url")).replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || option("--service-key");
const apply = args.includes("--apply");
if (!option("--backup")) throw new Error("--backup is required");

const manifest = JSON.parse(await fs.readFile(path.join(backupDirectory, "manifest.json"), "utf8"));
const recordsBytes = await fs.readFile(path.join(backupDirectory, "records.json"));
const records = JSON.parse(recordsBytes.toString("utf8"));
const recordsHash = crypto.createHash("sha256").update(recordsBytes).digest("hex");
if (manifest.recordsSha256 && recordsHash !== manifest.recordsSha256) throw new Error("records checksum mismatch");
for (const asset of manifest.assets || []) {
  const bytes = await fs.readFile(path.join(backupDirectory, "images", asset.filename));
  if (crypto.createHash("sha256").update(bytes).digest("hex") !== asset.sha256) {
    throw new Error(`${asset.filename} checksum mismatch`);
  }
}

if (!apply) {
  console.log(JSON.stringify({ valid: true, mode: "dry-run", records: records.length, assets: manifest.assets.length }, null, 2));
  process.exit(0);
}
if (!targetUrl || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required with --apply");
const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

for (const asset of manifest.assets || []) {
  if (!asset.bucket || !asset.objectPath) throw new Error(`${asset.filename} has no storage destination`);
  const bytes = await fs.readFile(path.join(backupDirectory, "images", asset.filename));
  const response = await fetch(`${targetUrl}/storage/v1/object/${asset.bucket}/${asset.objectPath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/octet-stream", "x-upsert": "true" },
    body: bytes,
  });
  if (!response.ok) throw new Error(`${asset.filename} restore failed: ${response.status} ${await response.text()}`);
}

for (let index = 0; index < records.length; index += 100) {
  const response = await fetch(`${targetUrl}/rest/v1/azulejos?on_conflict=id`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(records.slice(index, index + 100)),
  });
  if (!response.ok) throw new Error(`record restore failed: ${response.status} ${await response.text()}`);
}
console.log(JSON.stringify({ restored: true, records: records.length, assets: manifest.assets.length }, null, 2));
