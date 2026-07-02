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
const encodedCursor = handler._test.encodeCursor(record);
const decodedCursor = handler._test.decodeCursor(encodedCursor);
assert(decodedCursor.id === record.id && Date.parse(decodedCursor.createdAt) === Date.parse(record.created_at), "collection cursor should preserve its timestamp and UUID");
assert(handler._test.decodeCursor("invalid") === null, "invalid collection cursors should be rejected");
const wrappedLido = handler._test.lidoWrap([record, licensedRecord]);
assert((wrappedLido.match(/<lido:lido>/g) || []).length === 2, "bulk LIDO should wrap each record independently");
const geoJson = handler._test.geoJsonCollection([record, licensedRecord], "https://example.test/current", "https://example.test/next");
assert(geoJson.features[0].geometry.coordinates.join(",") === "-9.13934,38.71374", "GeoJSON should use WGS84 longitude-latitude coordinate order");
assert(geoJson.features[0].properties.photoLicense === null, "GeoJSON should not invent rights for historic photographs");
assert(geoJson.features[1].properties.photoLicense.endsWith("/by/4.0/"), "GeoJSON should expose explicit photo rights");
const csv = handler._test.csvCollection([{ ...licensedRecord, title: 'Quoted, "tile"' }]);
assert(csv.startsWith("id,title,latitude,longitude"), "CSV export should expose stable research columns");
assert(csv.includes('"Quoted, ""tile"""'), "CSV export should escape commas and quotation marks");
assert(csv.includes("Test contributor,https://creativecommons.org/licenses/by/4.0/"), "CSV export should include recorded attribution and rights");

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
  const records = requestedUrl.includes("id=eq.")
    ? [record]
    : [record, { ...record, id: "22222222-2222-4222-8222-222222222222", created_at: "2026-07-01T10:01:00Z" }];
  return { ok: true, json: async () => records };
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

let collectionStatus = 0;
let collectionBody = "";
const collectionHeaders = {};
await handler({ method: "GET", headers: { host: "localhost" }, url: "/api/archive?format=jsonld&limit=1" }, {
  setHeader(name, value) { collectionHeaders[name] = value; },
  end(value) { collectionBody = value; },
  set statusCode(value) { collectionStatus = value; },
});
const collectionPayload = JSON.parse(collectionBody);
assert(collectionStatus === 200, "collection endpoint should return approved records");
assert(collectionPayload["schema:hasPart"].length === 1, "collection endpoint should honor its page limit");
assert(collectionPayload["hydra:next"]["@id"].includes("cursor="), "collection endpoint should expose a next cursor");
assert(collectionHeaders.Link.includes('rel="next"'), "collection endpoint should expose HTTP pagination metadata");
assert(collectionHeaders["X-Open-Azulejos-API-Version"] === "1", "archive responses should expose their API version");
assert(requestedUrl.includes("order=created_at.asc%2Cid.asc"), "collection database reads should use stable chronological ordering");

let geoJsonStatus = 0;
let geoJsonBody = "";
const geoJsonHeaders = {};
await handler({ method: "GET", headers: { host: "localhost" }, url: "/api/archive?format=geojson&limit=1" }, {
  setHeader(name, value) { geoJsonHeaders[name] = value; },
  end(value) { geoJsonBody = value; },
  set statusCode(value) { geoJsonStatus = value; },
});
assert(geoJsonStatus === 200 && geoJsonHeaders["Content-Type"].startsWith("application/geo+json"), "GeoJSON collection route should expose its standard media type");
assert(JSON.parse(geoJsonBody).features.length === 1, "GeoJSON collection should honor pagination");

global.fetch = originalFetch;
Object.entries(originalEnv).forEach(([key, value]) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
});

console.log("archive api tests passed");
