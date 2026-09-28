import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const directory = path.resolve(process.argv[2] || "");
if (!process.argv[2]) throw new Error("usage: node scripts/verify-backup.mjs <backup-directory>");
const requireDatabase = process.argv.includes("--require-database");

const manifest = JSON.parse(await fs.readFile(path.join(directory, "manifest.json"), "utf8"));
const recordsBytes = await fs.readFile(path.join(directory, "records.json"));
const recordsHash = crypto.createHash("sha256").update(recordsBytes).digest("hex");
const failures = [];
if (manifest.recordsSha256 && recordsHash !== manifest.recordsSha256) failures.push("records.json checksum mismatch");

const dumpPath = path.join(directory, "database.backup");
const checksumPath = path.join(directory, "database.backup.sha256");
let dumpSize = 0;
let checksum;
try { dumpSize = (await fs.stat(dumpPath)).size; } catch (error) {
  if (error.code !== "ENOENT") throw error;
}
try { checksum = (await fs.readFile(checksumPath, "utf8")).trim(); } catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (requireDatabase || dumpSize || checksum) {
  if (!dumpSize) failures.push("database.backup is missing or empty");
  if (!/^[a-f0-9]{64}  database\.backup$/.test(checksum || "")) {
    failures.push("database.backup.sha256 is missing or invalid");
  } else if (dumpSize) {
    const hash = crypto.createHash("sha256");
    for await (const chunk of createReadStream(dumpPath)) hash.update(chunk);
    if (hash.digest("hex") !== checksum.slice(0, 64)) failures.push("database.backup checksum mismatch");
  }
}

for (const asset of manifest.assets || []) {
  try {
    const bytes = await fs.readFile(path.join(directory, "images", asset.filename));
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    if (hash !== asset.sha256) failures.push(`${asset.filename}: checksum mismatch`);
    if (bytes.length !== asset.bytes) failures.push(`${asset.filename}: byte length mismatch`);
  } catch (error) {
    failures.push(`${asset.filename}: ${error.code === "ENOENT" ? "missing" : error.message}`);
  }
}

const records = JSON.parse(recordsBytes.toString("utf8"));
if (!Array.isArray(records) || records.length !== manifest.recordCount) failures.push("record count mismatch");
if ((manifest.assets || []).length !== manifest.assetCount) failures.push("asset count mismatch");
if ((manifest.failures || []).length) failures.push(`backup recorded ${manifest.failures.length} download failure(s)`);

console.log(JSON.stringify({
  valid: failures.length === 0,
  directory,
  records: records.length,
  assets: (manifest.assets || []).length,
  database: !!dumpSize,
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;
