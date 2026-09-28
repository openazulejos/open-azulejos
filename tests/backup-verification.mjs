import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "openazulejos-backup-test-"));
const verify = () => spawnSync(process.execPath, ["scripts/verify-backup.mjs", directory, "--require-database"], { encoding: "utf8" });

try {
  const records = Buffer.from("[]\n");
  await fs.writeFile(path.join(directory, "records.json"), records);
  await fs.writeFile(path.join(directory, "manifest.json"), JSON.stringify({
    recordCount: 0,
    assetCount: 0,
    assets: [],
    failures: [],
    recordsSha256: crypto.createHash("sha256").update(records).digest("hex"),
  }));

  assert.notEqual(verify().status, 0, "a required dump must not be silently skipped");
  const dump = Buffer.from("PGDMPtest-fixture");
  await fs.writeFile(path.join(directory, "database.backup"), dump);
  await fs.writeFile(path.join(directory, "database.backup.sha256"), `${crypto.createHash("sha256").update(dump).digest("hex")}  database.backup\n`);
  assert.equal(verify().status, 0, "a complete backup passes checksum verification");
  await fs.writeFile(path.join(directory, "database.backup"), Buffer.from("corrupt"));
  const corrupted = verify();
  assert.notEqual(corrupted.status, 0, "a changed dump must fail verification");
  assert.match(corrupted.stdout, /database\.backup checksum mismatch/);
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}

console.log("backup verification tests passed");
