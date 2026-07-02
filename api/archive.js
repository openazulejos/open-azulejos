const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || "https://openazulejos.vercel.app").replace(/\/$/, "");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const send = (response, status, contentType, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Cache-Control", status === 200
    ? "public, max-age=60, stale-while-revalidate=300"
    : "no-store");
  response.end(typeof payload === "string" ? payload : JSON.stringify(payload));
};

const json = (response, status, payload, contentType = "application/json; charset=utf-8") => (
  send(response, status, contentType, payload)
);

const languageMap = (value) => ({ en: [String(value || "Open Azulejos record")] });

const displayDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const imageFormat = (url) => {
  const pathname = String(url || "").split("?", 1)[0].toLowerCase();
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

const licenseUrl = (record) => record.photo_license === "CC-BY-4.0"
  ? "https://creativecommons.org/licenses/by/4.0/"
  : null;

const canonicalUrls = (record) => ({
  object: `${PUBLIC_BASE_URL}/archive/${record.id}`,
  manifest: `${PUBLIC_BASE_URL}/iiif/${record.id}/manifest`,
  lido: `${PUBLIC_BASE_URL}/lido/${record.id}`,
  map: `${PUBLIC_BASE_URL}/#cell=${encodeURIComponent(record.cell_code || "")}`,
});

const metadataPairs = (record) => [
  ["Local grid cell", record.cell_code],
  ["Local words", record.words],
  ["Coordinates", `${Number(record.lat).toFixed(6)}, ${Number(record.lng).toFixed(6)}`],
  ["GPS accuracy", Number.isFinite(Number(record.gps_accuracy_m)) ? `${Number(record.gps_accuracy_m)} m` : null],
  ["Observed", displayDate(record.gps_timestamp)],
  ["Submitted", displayDate(record.created_at)],
].filter(([, value]) => value != null && value !== "");

const jsonLdRecord = (record) => {
  const urls = canonicalUrls(record);
  const placeId = `${urls.object}#place`;
  const observationId = `${urls.object}#observation`;
  const photographId = `${urls.object}#photograph`;
  const rightsUrl = licenseUrl(record);
  return {
    "@context": {
      crm: "http://www.cidoc-crm.org/cidoc-crm/",
      schema: "https://schema.org/",
      geo: "https://purl.org/geojson/vocab#",
      value: "@value",
    },
    "@id": urls.object,
    "@type": "crm:E22_Human-Made_Object",
    "crm:P1_is_identified_by": [
      { "@type": "crm:E42_Identifier", value: record.id },
      record.cell_code ? { "@type": "crm:E42_Identifier", value: record.cell_code } : null,
    ].filter(Boolean),
    "crm:P53_has_former_or_current_location": { "@id": placeId },
    "crm:P12i_was_present_at": { "@id": observationId },
    "crm:P70i_is_documented_in": { "@id": photographId },
    "schema:name": record.title || "Recorded azulejo",
    "schema:mainEntityOfPage": urls.map,
    "@included": [
      {
        "@id": placeId,
        "@type": "crm:E53_Place",
        "schema:geo": {
          "@type": "schema:GeoCoordinates",
          "schema:latitude": Number(record.lat),
          "schema:longitude": Number(record.lng),
        },
        "geo:geometry": {
          "@type": "geo:Point",
          "geo:coordinates": [Number(record.lng), Number(record.lat)],
        },
      },
      {
        "@id": observationId,
        "@type": "crm:E7_Activity",
        "crm:P2_has_type": { value: "In situ citizen observation" },
        "crm:P7_took_place_at": { "@id": placeId },
        "crm:P12_occurred_in_the_presence_of": { "@id": urls.object },
        ...(displayDate(record.gps_timestamp) ? {
          "crm:P4_has_time-span": {
            "@type": "crm:E52_Time-Span",
            "crm:P82_at_some_time_within": displayDate(record.gps_timestamp),
          },
        } : {}),
      },
      {
        "@id": photographId,
        "@type": "crm:E31_Document",
        "crm:P70_documents": { "@id": urls.object },
        "schema:contentUrl": record.image_url,
        "schema:encodingFormat": imageFormat(record.image_url),
        "schema:dateCreated": displayDate(record.created_at),
        ...(rightsUrl ? {
          "schema:license": rightsUrl,
          "schema:creditText": record.photographer_credit,
        } : {}),
      },
    ],
    "schema:associatedMedia": {
      "@type": "schema:ImageObject",
      "@id": photographId,
      "schema:contentUrl": record.image_url,
      ...(rightsUrl ? {
        "schema:license": rightsUrl,
        "schema:creditText": record.photographer_credit,
      } : {}),
    },
    "schema:sameAs": [urls.manifest, urls.lido],
  };
};

const iiifManifest = (record) => {
  const urls = canonicalUrls(record);
  const canvasId = `${urls.manifest}/canvas/1`;
  const annotationPageId = `${urls.manifest}/page/1`;
  const rightsUrl = licenseUrl(record);
  return {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: urls.manifest,
    type: "Manifest",
    label: languageMap(record.title || "Recorded azulejo"),
    ...(rightsUrl ? {
      rights: rightsUrl,
      requiredStatement: {
        label: languageMap("Attribution"),
        value: languageMap(record.photographer_credit),
      },
    } : {}),
    metadata: metadataPairs(record).map(([label, value]) => ({
      label: languageMap(label),
      value: languageMap(value),
    })),
    homepage: [{ id: urls.map, type: "Text", label: languageMap("View on the Open Azulejos map"), format: "text/html" }],
    seeAlso: [
      { id: urls.object, type: "Dataset", format: "application/ld+json", profile: "http://www.cidoc-crm.org/cidoc-crm/" },
      { id: urls.lido, type: "Dataset", format: "application/xml", profile: "http://www.lido-schema.org/schema/v1.1/lido-v1.1.xsd" },
    ],
    thumbnail: [{ id: record.image_url, type: "Image", format: imageFormat(record.image_url) }],
    items: [{
      id: canvasId,
      type: "Canvas",
      label: languageMap("Photographic observation"),
      items: [{
        id: annotationPageId,
        type: "AnnotationPage",
        items: [{
          id: `${annotationPageId}/painting`,
          type: "Annotation",
          motivation: "painting",
          body: { id: record.image_url, type: "Image", format: imageFormat(record.image_url) },
          target: canvasId,
        }],
      }],
    }],
  };
};

const xmlEscape = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const lidoRecord = (record) => {
  const urls = canonicalUrls(record);
  const observedAt = displayDate(record.gps_timestamp);
  const submittedAt = displayDate(record.created_at);
  const rightsUrl = licenseUrl(record);
  return `<?xml version="1.0" encoding="UTF-8"?>
<lido:lidoWrap xmlns:lido="http://www.lido-schema.org" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.lido-schema.org http://www.lido-schema.org/schema/v1.1/lido-v1.1.xsd">
  <lido:lido>
    <lido:lidoRecID lido:type="local">${xmlEscape(record.id)}</lido:lidoRecID>
    <lido:descriptiveMetadata xml:lang="en">
      <lido:objectClassificationWrap>
        <lido:objectWorkTypeWrap><lido:objectWorkType><lido:term>Azulejo in situ</lido:term></lido:objectWorkType></lido:objectWorkTypeWrap>
      </lido:objectClassificationWrap>
      <lido:objectIdentificationWrap>
        <lido:titleWrap><lido:titleSet><lido:appellationValue>${xmlEscape(record.title || "Recorded azulejo")}</lido:appellationValue></lido:titleSet></lido:titleWrap>
        <lido:repositoryWrap><lido:repositorySet lido:type="current"><lido:repositoryName><lido:legalBodyName><lido:appellationValue>Open Azulejos</lido:appellationValue></lido:legalBodyName></lido:repositoryName><lido:workID lido:type="local">${xmlEscape(record.id)}</lido:workID></lido:repositorySet></lido:repositoryWrap>
      </lido:objectIdentificationWrap>
      <lido:eventWrap>
        <lido:eventSet><lido:event><lido:eventType><lido:term>In situ observation</lido:term></lido:eventType>${observedAt ? `<lido:eventDate><lido:date><lido:earliestDate>${xmlEscape(observedAt)}</lido:earliestDate><lido:latestDate>${xmlEscape(observedAt)}</lido:latestDate></lido:date></lido:eventDate>` : ""}<lido:eventPlace><lido:place><lido:namePlaceSet><lido:appellationValue>Lisbon</lido:appellationValue></lido:namePlaceSet><lido:gml><gml:Point xmlns:gml="http://www.opengis.net/gml"><gml:pos>${xmlEscape(record.lat)} ${xmlEscape(record.lng)}</gml:pos></gml:Point></lido:gml></lido:place></lido:eventPlace></lido:event></lido:eventSet>
      </lido:eventWrap>
    </lido:descriptiveMetadata>
    <lido:administrativeMetadata xml:lang="en">
      <lido:recordWrap><lido:recordID lido:type="local">${xmlEscape(record.id)}</lido:recordID><lido:recordType><lido:term>item-level record</lido:term></lido:recordType><lido:recordSource><lido:legalBodyName><lido:appellationValue>Open Azulejos</lido:appellationValue></lido:legalBodyName></lido:recordSource>${submittedAt ? `<lido:recordInfoSet><lido:recordInfoLink>${xmlEscape(urls.object)}</lido:recordInfoLink><lido:recordMetadataDate>${xmlEscape(submittedAt)}</lido:recordMetadataDate></lido:recordInfoSet>` : ""}</lido:recordWrap>
      <lido:resourceWrap><lido:resourceSet><lido:resourceRepresentation lido:type="image"><lido:linkResource>${xmlEscape(record.image_url)}</lido:linkResource></lido:resourceRepresentation>${rightsUrl ? `<lido:rightsResource><lido:rightsType lido:type="http://terminology.lido-schema.org/lido00920"><lido:conceptID lido:type="http://terminology.lido-schema.org/lido00099">${xmlEscape(rightsUrl)}</lido:conceptID><lido:term>CC BY 4.0</lido:term></lido:rightsType><lido:creditLine>${xmlEscape(record.photographer_credit)}</lido:creditLine></lido:rightsResource>` : ""}</lido:resourceSet></lido:resourceWrap>
    </lido:administrativeMetadata>
  </lido:lido>
</lido:lidoWrap>`;
};

const fetchApprovedRecord = async (supabaseUrl, headers, id) => {
  const query = new URLSearchParams({
    select: "id,title,lat,lng,image_url,cell_code,words,created_at,gps_accuracy_m,gps_timestamp,location_source,photographer_credit,photo_license,contributor_consent_at",
    id: `eq.${id}`,
    source: "eq.web-camera",
    moderation_status: "eq.approved",
    limit: "1",
  });
  const result = await fetch(`${supabaseUrl}/rest/v1/azulejos?${query}`, { headers });
  if (!result.ok) {
    const error = new Error("archive database read failed");
    error.status = result.status;
    error.detail = await result.text();
    throw error;
  }
  return (await result.json())[0] || null;
};

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.setHeader("Allow", "GET, OPTIONS");
    return json(response, 204, {});
  }
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET, OPTIONS");
    return json(response, 405, { error: "method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey) return json(response, 503, { error: "archive service unavailable" });

  const url = new URL(request.url || "/api/archive", `https://${request.headers.host || "openazulejos.vercel.app"}`);
  const id = String(url.searchParams.get("id") || "");
  const format = String(url.searchParams.get("format") || "jsonld").toLowerCase();
  if (!UUID_PATTERN.test(id)) return json(response, 400, { error: "valid record id is required" });
  if (!new Set(["jsonld", "iiif", "lido"]).has(format)) return json(response, 400, { error: "unsupported archive format" });

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  try {
    const record = await fetchApprovedRecord(supabaseUrl, headers, id);
    if (!record) return json(response, 404, { error: "approved archive record not found" });
    if (format === "iiif") {
      return json(response, 200, iiifManifest(record), "application/ld+json;profile=\"http://iiif.io/api/presentation/3/context.json\"; charset=utf-8");
    }
    if (format === "lido") return send(response, 200, "application/xml; charset=utf-8", lidoRecord(record));
    return json(response, 200, jsonLdRecord(record), "application/ld+json; charset=utf-8");
  } catch (error) {
    return json(response, error.status || 500, { error: "archive read failed", detail: error.detail || error.message });
  }
};

module.exports._test = {
  canonicalUrls,
  iiifManifest,
  jsonLdRecord,
  lidoRecord,
};
