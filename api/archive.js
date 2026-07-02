const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || "https://openazulejos.vercel.app").replace(/\/$/, "");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const API_VERSION = "1";
const PUBLIC_SELECT = "id,title,lat,lng,image_url,cell_code,words,created_at,gps_accuracy_m,gps_timestamp,location_source,photographer_credit,photo_license,contributor_consent_at";

const send = (response, status, contentType, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("X-Open-Azulejos-API-Version", API_VERSION);
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

const encodeCursor = (record) => Buffer.from(JSON.stringify([record.created_at, record.id])).toString("base64url");

const decodeCursor = (value) => {
  if (!value) return null;
  try {
    const [createdAt, id] = JSON.parse(Buffer.from(String(value), "base64url").toString("utf8"));
    if (!displayDate(createdAt) || !UUID_PATTERN.test(id)) return null;
    return { createdAt: displayDate(createdAt), id };
  } catch {
    return null;
  }
};

const collectionUrl = (format, limit, cursor = "") => {
  const path = format === "iiif"
    ? "/iiif/collection"
    : format === "lido"
      ? "/lido"
      : format === "geojson"
        ? "/exports/azulejos.geojson"
        : format === "csv"
          ? "/exports/azulejos.csv"
          : "/archive";
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return `${PUBLIC_BASE_URL}${path}?${query}`;
};

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

const lidoItem = (record) => {
  const urls = canonicalUrls(record);
  const observedAt = displayDate(record.gps_timestamp);
  const submittedAt = displayDate(record.created_at);
  const rightsUrl = licenseUrl(record);
  return `<lido:lido>
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
  </lido:lido>`;
};

const lidoWrap = (records) => `<?xml version="1.0" encoding="UTF-8"?>
<lido:lidoWrap xmlns:lido="http://www.lido-schema.org" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.lido-schema.org http://www.lido-schema.org/schema/v1.1/lido-v1.1.xsd">
${records.map(lidoItem).join("\n")}
</lido:lidoWrap>`;

const lidoRecord = (record) => lidoWrap([record]);

const fetchApprovedRecord = async (supabaseUrl, headers, id) => {
  const query = new URLSearchParams({
    select: PUBLIC_SELECT,
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

const fetchApprovedRecords = async (supabaseUrl, headers, { limit, cursor }) => {
  const query = new URLSearchParams({
    select: PUBLIC_SELECT,
    source: "eq.web-camera",
    moderation_status: "eq.approved",
    order: "created_at.asc,id.asc",
    limit: String(limit + 1),
  });
  if (cursor) {
    query.set("or", `(created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id}))`);
  }
  const result = await fetch(`${supabaseUrl}/rest/v1/azulejos?${query}`, { headers });
  if (!result.ok) {
    const error = new Error("archive collection read failed");
    error.status = result.status;
    error.detail = await result.text();
    throw error;
  }
  const rows = await result.json();
  const hasNext = rows.length > limit;
  const records = rows.slice(0, limit);
  return {
    records,
    nextCursor: hasNext && records.length ? encodeCursor(records[records.length - 1]) : null,
  };
};

const jsonLdCollection = (records, currentUrl, nextUrl) => ({
  "@context": {
    schema: "https://schema.org/",
    hydra: "http://www.w3.org/ns/hydra/core#",
  },
  "@id": currentUrl,
  "@type": "schema:Collection",
  "schema:name": "Open Azulejos approved archive",
  "schema:hasPart": records.map(jsonLdRecord),
  ...(nextUrl ? { "hydra:next": { "@id": nextUrl } } : {}),
});

const iiifCollection = (records, currentUrl, nextUrl) => ({
  "@context": [
    "http://iiif.io/api/presentation/3/context.json",
    { oa: "https://openazulejos.vercel.app/ns/", next: "oa:next" },
  ],
  id: currentUrl,
  type: "Collection",
  label: languageMap("Open Azulejos approved archive"),
  items: records.map((record) => {
    const rightsUrl = licenseUrl(record);
    return {
      id: canonicalUrls(record).manifest,
      type: "Manifest",
      label: languageMap(record.title || "Recorded azulejo"),
      thumbnail: [{ id: record.image_url, type: "Image", format: imageFormat(record.image_url) }],
      ...(rightsUrl ? {
        rights: rightsUrl,
        requiredStatement: {
          label: languageMap("Attribution"),
          value: languageMap(record.photographer_credit),
        },
      } : {}),
    };
  }),
  ...(nextUrl ? { next: nextUrl } : {}),
});

const geoJsonCollection = (records, currentUrl, nextUrl) => ({
  type: "FeatureCollection",
  openAzulejosApiVersion: API_VERSION,
  links: {
    self: currentUrl,
    ...(nextUrl ? { next: nextUrl } : {}),
  },
  features: records.map((record) => ({
    type: "Feature",
    id: record.id,
    geometry: {
      type: "Point",
      coordinates: [Number(record.lng), Number(record.lat)],
    },
    properties: {
      title: record.title || "Recorded azulejo",
      cell: record.cell_code,
      words: record.words,
      image: record.image_url,
      record: canonicalUrls(record).object,
      iiif: canonicalUrls(record).manifest,
      submittedAt: displayDate(record.created_at),
      observedAt: displayDate(record.gps_timestamp),
      gpsAccuracyM: Number.isFinite(Number(record.gps_accuracy_m)) ? Number(record.gps_accuracy_m) : null,
      photographerCredit: licenseUrl(record) ? record.photographer_credit : null,
      photoLicense: licenseUrl(record),
    },
  })),
});

const csvEscape = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const csvCollection = (records) => {
  const fields = [
    "id", "title", "latitude", "longitude", "cell", "words", "image_url",
    "record_url", "iiif_manifest", "submitted_at", "observed_at", "gps_accuracy_m",
    "photographer_credit", "photo_license",
  ];
  const rows = records.map((record) => {
    const rightsUrl = licenseUrl(record);
    const urls = canonicalUrls(record);
    return [
      record.id,
      record.title || "Recorded azulejo",
      record.lat,
      record.lng,
      record.cell_code,
      record.words,
      record.image_url,
      urls.object,
      urls.manifest,
      displayDate(record.created_at),
      displayDate(record.gps_timestamp),
      Number.isFinite(Number(record.gps_accuracy_m)) ? Number(record.gps_accuracy_m) : null,
      rightsUrl ? record.photographer_credit : null,
      rightsUrl,
    ].map(csvEscape).join(",");
  });
  return `${fields.join(",")}\n${rows.join("\n")}\n`;
};

const sendCollection = (response, format, records, currentUrl, nextUrl) => {
  if (nextUrl) response.setHeader("Link", `<${nextUrl}>; rel="next"`);
  if (format === "iiif") {
    return json(response, 200, iiifCollection(records, currentUrl, nextUrl), "application/ld+json;profile=\"http://iiif.io/api/presentation/3/context.json\"; charset=utf-8");
  }
  if (format === "lido") return send(response, 200, "application/xml; charset=utf-8", lidoWrap(records));
  if (format === "geojson") return json(response, 200, geoJsonCollection(records, currentUrl, nextUrl), "application/geo+json; charset=utf-8");
  if (format === "csv") {
    response.setHeader("Content-Disposition", "inline; filename=\"open-azulejos.csv\"");
    return send(response, 200, "text/csv; charset=utf-8", csvCollection(records));
  }
  return json(response, 200, jsonLdCollection(records, currentUrl, nextUrl), "application/ld+json; charset=utf-8");
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
  if (!new Set(["jsonld", "iiif", "lido", "geojson", "csv"]).has(format)) return json(response, 400, { error: "unsupported archive format" });
  if (id && !UUID_PATTERN.test(id)) return json(response, 400, { error: "valid record id is required" });
  const requestedLimit = Number.parseInt(url.searchParams.get("limit") || "50", 10);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 50, 200));
  const cursorValue = String(url.searchParams.get("cursor") || "");
  const cursor = decodeCursor(cursorValue);
  if (cursorValue && !cursor) return json(response, 400, { error: "invalid collection cursor" });

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  try {
    if (!id) {
      const page = await fetchApprovedRecords(supabaseUrl, headers, { limit, cursor });
      const currentUrl = collectionUrl(format, limit, cursorValue);
      const nextUrl = page.nextCursor ? collectionUrl(format, limit, page.nextCursor) : null;
      return sendCollection(response, format, page.records, currentUrl, nextUrl);
    }
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
  decodeCursor,
  encodeCursor,
  csvCollection,
  geoJsonCollection,
  iiifManifest,
  iiifCollection,
  jsonLdCollection,
  jsonLdRecord,
  lidoWrap,
  lidoRecord,
};
