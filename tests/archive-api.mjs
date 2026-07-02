import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/archive.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const record = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Recorded azulejo & fragment",
  lat: 38.71374,
  lng: -9.13934,
  image_url: "https://example.supabase.co/storage/v1/object/public/azulejos/a.jpg",
  cell_code: "lis.-79e9.xft4",
  words: "arquivo.estrela.vidro",
  created_at: "2026-07-01T10:00:00Z",
  gps_timestamp: "2026-07-01T09:59:30Z",
  gps_accuracy_m: 8,
};

const jsonLd = handler._test.jsonLdRecord(record);
assert(jsonLd["@type"] === "crm:E22_Human-Made_Object", "JSON-LD should identify the physical azulejo as a CIDOC CRM human-made object");
assert(jsonLd["@included"].some((item) => item["@type"] === "crm:E31_Document"), "JSON-LD should distinguish the photograph from the physical object");
assert(jsonLd["@included"].some((item) => item["@type"] === "crm:E53_Place"), "JSON-LD should expose an explicit place entity");
assert(!JSON.stringify(jsonLd).includes('"license"'), "records without explicit rights must not receive an invented license");

const manifest = handler._test.iiifManifest(record);
assert(manifest.type === "Manifest" && manifest.items[0].type === "Canvas", "IIIF output should contain a Presentation 3 Manifest and Canvas");
assert(manifest.items[0].items[0].items[0].motivation === "painting", "IIIF image should be painted onto the Canvas through an Annotation");
assert(manifest.seeAlso.some((item) => item.format === "application/xml"), "IIIF manifest should link to its LIDO representation");

const lido = handler._test.lidoRecord(record);
assert(lido.includes("<lido:lidoWrap") && lido.includes("lido-v1.1.xsd"), "LIDO output should declare the official 1.1 schema");
assert(lido.includes("Recorded azulejo &amp; fragment"), "LIDO output should XML-escape archive values");
assert(lido.includes("<gml:pos>38.71374 -9.13934</gml:pos>"), "LIDO output should preserve the observation coordinates");

const licensedRecord = { ...record, photographer_credit: "Test contributor", photo_license: "CC-BY-4.0" };
const licensedJsonLd = handler._test.jsonLdRecord(licensedRecord);
assert(JSON.stringify(licensedJsonLd).includes("https://creativecommons.org/licenses/by/4.0/"), "licensed JSON-LD should expose explicit CC BY rights");
const licensedManifest = handler._test.iiifManifest(licensedRecord);
assert(licensedManifest.rights.endsWith("/by/4.0/"), "licensed IIIF manifest should expose its rights URI");
assert(licensedManifest.requiredStatement.value.en[0] === "Test contributor", "licensed IIIF manifest should require photographer attribution");
const licensedLido = handler._test.lidoRecord(licensedRecord);
assert(licensedLido.includes("<lido:creditLine>Test contributor</lido:creditLine>"), "licensed LIDO should expose the photographer credit line");

const originalFetch = global.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
let requestedUrl = "";
global.fetch = async (url) => {
  requestedUrl = String(url);
  return { ok: true, json: async () => [record] };
};

async function request(format) {
  let status = 0;
  let body = "";
  const headers = {};
  await handler({ method: "GET", headers: { host: "localhost" }, url: `/api/archive?id=${record.id}&format=${format}` }, {
    setHeader(name, value) { headers[name] = value; },
    end(value) { body = value; },
    set statusCode(value) { status = value; },
  });
  return { status, body, headers };
}

const iiifResponse = await request("iiif");
assert(iiifResponse.status === 200 && iiifResponse.headers["Content-Type"].includes("iiif.io/api/presentation/3"), "IIIF route should return the Presentation 3 media type");
assert(requestedUrl.includes("moderation_status=eq.approved"), "public archive routes must only read approved records");
const lidoResponse = await request("lido");
assert(lidoResponse.status === 200 && lidoResponse.headers["Content-Type"].startsWith("application/xml"), "LIDO route should return XML");

global.fetch = originalFetch;
Object.entries(originalEnv).forEach(([key, value]) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
});

console.log("archive api tests passed");
