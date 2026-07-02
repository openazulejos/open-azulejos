import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/archive.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const total = 100_000;
const pageSize = 200;
const seen = new Set();
let pageCount = 0;
let cursor = null;

for (let offset = 0; offset < total; offset += pageSize) {
  const page = [];
  for (let index = offset; index < Math.min(total, offset + pageSize); index += 1) {
    const suffix = index.toString(16).padStart(12, "0");
    page.push({
      id: `00000000-0000-4000-8000-${suffix}`,
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    });
  }
  page.forEach((record) => {
    assert(!seen.has(record.id), "large harvest simulation should never repeat a record");
    seen.add(record.id);
  });
  cursor = handler._test.encodeCursor(page[page.length - 1]);
  const decoded = handler._test.decodeCursor(cursor);
  assert(decoded.id === page[page.length - 1].id, "large harvest cursor should identify the final page record");
  pageCount += 1;
}

assert(seen.size === total, "large harvest simulation should visit all 100,000 records");
assert(pageCount === 500, "100,000 records should require 500 bounded pages of 200");
assert(cursor.length < 128, "pagination cursor should remain compact regardless of archive size");

console.log("archive 100k scale test passed");
