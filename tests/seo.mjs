import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const root = new URL("../", import.meta.url);
const index = fs.readFileSync(new URL("index.html", root), "utf8");
const admin = fs.readFileSync(new URL("admin.html", root), "utf8");
const dashboard = fs.readFileSync(new URL("dashboard.html", root), "utf8");
const robots = fs.readFileSync(new URL("robots.txt", root), "utf8");
const sitemap = fs.readFileSync(new URL("sitemap.xml", root), "utf8");
const vercel = JSON.parse(fs.readFileSync(new URL("vercel.json", root), "utf8"));
const manifest = JSON.parse(fs.readFileSync(new URL("manifest.webmanifest", root), "utf8"));

assert(index.includes("<html lang=\"en\">"), "public page should declare its primary language");
assert(index.includes("<title>Open Azulejos - Lisbon azulejos map</title>"), "public page should have a descriptive SEO title");
assert(index.includes("name=\"description\""), "public page should have a meta description");
assert(index.includes("azulejos map") && index.includes("mapa de azulejos Lisboa"), "public page should include English and Portuguese search phrasing");
assert(index.includes("rel=\"canonical\" href=\"https://openazulejos.com/\""), "public page should declare a canonical URL");
assert(index.includes("property=\"og:title\"") && index.includes("name=\"twitter:card\""), "public page should include social preview metadata");
assert(index.includes("application/ld+json") && index.includes("\"@type\": \"WebSite\""), "public page should include structured data");
assert(index.includes("\"@type\": \"Dataset\"") && index.includes("https://openazulejos.com/exports/azulejos.geojson"), "public page should describe the open dataset");
assert(index.includes("\"@type\": \"WebApplication\"") && index.includes("\"applicationCategory\": \"MapApplication\""), "public page should describe the map web app");
assert(index.includes("<noscript>") && index.includes("Mapa de azulejos de Lisboa") && index.includes("Carte des azulejos de Lisbonne"), "public page should provide crawlable multilingual fallback text");
assert(index.includes("hreflang=\"pt\" href=\"https://openazulejos.com/pt\""), "public page should expose Portuguese alternate route");

assert(admin.includes("noindex,nofollow,noarchive"), "admin page should not be indexed");
assert(dashboard.includes("noindex,nofollow,noarchive"), "dashboard page should not be indexed");
assert(robots.includes("Sitemap: https://openazulejos.com/sitemap.xml"), "robots should point crawlers to the sitemap");
assert(robots.includes("Disallow: /api/"), "robots should keep API endpoints out of crawler paths");
assert(sitemap.includes("<loc>https://openazulejos.com/</loc>"), "sitemap should expose the canonical public homepage");
assert(sitemap.includes("<loc>https://openazulejos.com/pt</loc>") && sitemap.includes("<loc>https://openazulejos.com/fr</loc>"), "sitemap should expose language entry points");
assert(sitemap.includes("<loc>https://openazulejos.com/exports/azulejos.geojson</loc>"), "sitemap should expose open data exports");
assert(vercel.rewrites.some((rewrite) => rewrite.source === "/pt" && rewrite.destination === "/index.html"), "Portuguese route should serve the public app");
assert(vercel.rewrites.some((rewrite) => rewrite.source === "/fr" && rewrite.destination === "/index.html"), "French route should serve the public app");
assert(manifest.description.includes("Lisbon azulejos"), "manifest should describe the searchable public project");

console.log("seo tests passed");
