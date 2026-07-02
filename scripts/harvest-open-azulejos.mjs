import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const argumentsList = process.argv.slice(2);
const argument = (name, fallback = "") => {
  const index = argumentsList.indexOf(name);
  return index >= 0 ? argumentsList[index + 1] || fallback : fallback;
};

const origin = argument("--origin", "https://openazulejos.vercel.app").replace(/\/$/, "");
const format = argument("--format", "jsonld").toLowerCase();
const pageSize = Math.max(1, Math.min(Number.parseInt(argument("--page-size", "200"), 10) || 200, 200));
const output = path.resolve(argument("--output", path.join("..", "openazulejos-harvest")));
const formats = {
  jsonld: { path: "/archive", extension: "jsonld" },
  iiif: { path: "/iiif/collection", extension: "json" },
  lido: { path: "/lido", extension: "xml" },
  geojson: { path: "/exports/azulejos.geojson", extension: "geojson" },
  csv: { path: "/exports/azulejos.csv", extension: "csv" },
};
if (!formats[format]) throw new Error(`unsupported format: ${format}`);

const nextLink = (header) => {
  for (const part of String(header || "").split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
    if (match) return match[1];
  }
  return null;
};

await fs.mkdir(output, { recursive: true });
let url = `${origin}${formats[format].path}?limit=${pageSize}`;
const pages = [];
const seenUrls = new Set();

for (let pageNumber = 1; url; pageNumber += 1) {
  if (pageNumber > 10_000) throw new Error("harvest exceeded the page safety limit");
  if (seenUrls.has(url)) throw new Error("harvest pagination loop detected");
  seenUrls.add(url);

  const response = await fetch(url, { headers: { Accept: "*/*" } });
  if (!response.ok) throw new Error(`harvest failed: ${response.status} ${await response.text()}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const filename = `page-${String(pageNumber).padStart(5, "0")}.${formats[format].extension}`;
  await fs.writeFile(path.join(output, filename), bytes);
  pages.push({
    filename,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    source: url,
  });
  url = nextLink(response.headers.get("link"));
}

const manifest = {
  version: 1,
  createdAt: new Date().toISOString(),
  origin,
  format,
  pageSize,
  pageCount: pages.length,
  pages,
};
await fs.writeFile(path.join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ output, format, pageCount: pages.length }, null, 2));

export { nextLink };
