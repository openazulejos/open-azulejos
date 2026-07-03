const crypto = require("node:crypto");
const { authorizeAdminRequest } = require("./_admin-auth");
const { authorizeContributorRequest } = require("./_contributor-auth");
const { issueContributionReceipt } = require("./_contribution-receipt");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FINGERPRINT_PATTERN = /^[01]{64}$/;
const REVIEWED_RELATIONS = new Set(["duplicate", "same-pattern", "variation", "possibly-related"]);
const CONDITION_CODES = new Set(["intact", "crazed", "chipped", "missing", "painted-covered", "repaired", "unknown"]);

const json = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const parseBody = (req) => new Promise((resolve, reject) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 8_000_000) {
      reject(new Error("payload too large"));
      req.destroy();
    }
  });
  req.on("end", () => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch (error) {
      reject(error);
    }
  });
  req.on("error", reject);
});

const decodeDataUrl = (value) => {
  const match = String(value || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return { mime, ext, buffer: Buffer.from(match[2], "base64") };
};

const validCropPoints = (value) => Array.isArray(value)
  && value.length === 4
  && value.every((point) => Number.isFinite(Number(point?.x))
    && Number.isFinite(Number(point?.y))
    && Number(point.x) >= 0
    && Number(point.x) <= 1
    && Number(point.y) >= 0
    && Number(point.y) <= 1);

const normalizedCropPoints = (value) => validCropPoints(value)
  ? value.map((point) => ({ x: Number(point.x), y: Number(point.y) }))
  : null;

const normalizedEditSettings = (value) => {
  const limits = {
    brightness: [-100, 100],
    highlights: [-100, 100],
    shadows: [-100, 100],
    contrast: [-100, 100],
    saturation: [-100, 100],
    warmth: [-100, 100],
    tint: [-100, 100],
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return Object.fromEntries(Object.keys(limits).map((key) => [key, 0]));
  }
  const settings = Object.fromEntries(Object.entries(limits).map(([key, [min, max]]) => {
    const number = Number(value[key]);
    return [key, Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : 0];
  }));
  if (value.whitePoint && Number.isFinite(Number(value.whitePoint.x)) && Number.isFinite(Number(value.whitePoint.y))) {
    settings.whitePoint = {
      x: Math.max(0, Math.min(1, Number(value.whitePoint.x))),
      y: Math.max(0, Math.min(1, Number(value.whitePoint.y))),
    };
  }
  return settings;
};

const normalizedContributionRights = (body, contributor = null) => {
  const photographerCredit = String(body.photographerCredit || contributor?.pseudonym || "anonymous").trim();
  const consentAt = body.contributorConsentAt ? new Date(body.contributorConsentAt) : null;
  if (body.contributorConsent !== true
    || body.photoLicense !== "CC-BY-4.0"
    || photographerCredit.length < 1
    || photographerCredit.length > 120
    || !consentAt
    || !Number.isFinite(consentAt.getTime())) {
    return { error: "photographer credit and explicit CC BY 4.0 consent are required" };
  }
  return {
    photographerCredit,
    photoLicense: "CC-BY-4.0",
    contributorConsentAt: consentAt.toISOString(),
  };
};

const distanceMeters = (firstLat, firstLng, secondLat, secondLng) => {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const lat1 = toRadians(firstLat);
  const lat2 = toRadians(secondLat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(secondLng - firstLng);
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const WEB_CAMERA_RECORD_STATUSES = ["pending", "approved", "rejected"];

const readWebCameraRecordsByStatus = async (supabaseUrl, headers, {
  order = "created_at.desc",
  perStatusLimit = 500,
} = {}) => {
  const groups = await Promise.all(WEB_CAMERA_RECORD_STATUSES.map(async (status) => {
    const query = new URLSearchParams({
      select: "*",
      source: "eq.web-camera",
      title: "neq.api test",
      moderation_status: `eq.${status}`,
      order,
      limit: String(perStatusLimit),
    });
    const response = await fetch(`${supabaseUrl}/rest/v1/azulejos?${query}`, { headers });
    if (!response.ok) {
      const detail = await response.text();
      const error = new Error(`status ${status} read failed`);
      error.status = response.status;
      error.detail = detail;
      throw error;
    }
    return response.json();
  }));
  return groups.flat().sort((first, second) => {
    if (order === "created_at.asc") {
      return new Date(first.created_at || 0) - new Date(second.created_at || 0);
    }
    return new Date(second.created_at || 0) - new Date(first.created_at || 0);
  });
};

const signedStorageUrl = async (supabaseUrl, headers, bucket, objectPath, expiresIn = 3600) => {
  if (!bucket || !objectPath) return null;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}/${objectPath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const relativeUrl = payload.signedURL || payload.signedUrl;
  return relativeUrl ? new URL(relativeUrl, supabaseUrl).toString() : null;
};

const hydrateAdminMediaUrls = async (records, supabaseUrl, headers, publicBucket) => Promise.all(records.map(async (record) => {
  const originalBucket = record.original_image_bucket || (record.original_image_path ? publicBucket : null);
  if (!record.original_image_path || originalBucket === publicBucket) return record;
  return {
    ...record,
    original_image_url: await signedStorageUrl(supabaseUrl, headers, originalBucket, record.original_image_path),
  };
}));

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE, OPTIONS");
    return json(res, 204, {});
  }
  if (req.method !== "POST" && req.method !== "GET" && req.method !== "PATCH" && req.method !== "DELETE") {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE, OPTIONS");
    return json(res, 405, { error: "method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceKey = serviceRoleKey || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "azulejos";
  if (!supabaseUrl || !serviceKey) {
    return json(res, 503, { error: "supabase env vars missing" });
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };
  const adminKey = process.env.ADMIN_KEY;
  const requestKey = req.headers["x-admin-key"];
  const adminAuthorization = authorizeAdminRequest(req);
  const isAdmin = adminAuthorization.ok;
  const presentedAdminKey = typeof requestKey === "string";
  const requestUrl = new URL(req.url || "/api/records", `https://${req.headers.host || "openazulejos.vercel.app"}`);
  const requestedAdminRead = req.method === "GET" && requestUrl.searchParams.get("admin") === "1";

  if (req.method === "GET" && ((presentedAdminKey && !isAdmin) || (requestedAdminRead && !isAdmin))) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "x-admin-key");
    return json(res, 401, { error: presentedAdminKey ? "invalid admin key" : "admin key required" });
  }

  if (req.method === "GET") {
    const adminHeaders = serviceRoleKey ? { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } : headers;
    const historyId = String(requestUrl.searchParams.get("history") || "").trim();
    const hasNearbyQuery = requestUrl.searchParams.has("nearLat") || requestUrl.searchParams.has("nearLng");
    const nearLat = Number(requestUrl.searchParams.get("nearLat"));
    const nearLng = Number(requestUrl.searchParams.get("nearLng"));
    const requestedRadius = Number(requestUrl.searchParams.get("radius"));
    if (historyId) {
      if (!UUID_PATTERN.test(historyId)) return json(res, 400, { error: "valid history id is required" });
      const historyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/azulejo_observation_history`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ p_legacy_azulejo_id: historyId }),
      });
      if (!historyResponse.ok) {
        return json(res, historyResponse.status, { error: "observation history failed", detail: await historyResponse.text() });
      }
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
      return json(res, 200, { records: await historyResponse.json() });
    }
    if (isAdmin && requestUrl.searchParams.get("backup") === "manifest") {
      const limit = 500;
      try {
        const storedRecords = await readWebCameraRecordsByStatus(supabaseUrl, adminHeaders, {
          order: "created_at.asc",
          perStatusLimit: limit,
        });
        const records = await hydrateAdminMediaUrls(storedRecords, supabaseUrl, adminHeaders, bucket);
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("Vary", "x-admin-key");
        return json(res, 200, { records, nextOffset: null });
      } catch (error) {
        return json(res, error.status || 500, { error: "backup read failed", detail: error.detail || error.message });
      }
    }
    if (isAdmin && hasNearbyQuery) {
      if (!Number.isFinite(nearLat) || !Number.isFinite(nearLng)) {
        return json(res, 400, { error: "nearLat and nearLng are required for nearby records" });
      }
      if (nearLat < -90 || nearLat > 90 || nearLng < -180 || nearLng > 180) {
        return json(res, 400, { error: "invalid nearby coordinates" });
      }
      const radius = Math.max(10, Math.min(Number.isFinite(requestedRadius) ? requestedRadius : 60, 250));
      const latDelta = radius / 111320;
      const lngDelta = radius / Math.max(1, 111320 * Math.cos(nearLat * Math.PI / 180));
      const exclude = String(requestUrl.searchParams.get("exclude") || "").trim();
      const query = new URLSearchParams();
      query.set("select", "id,title,lat,lng,image_url,created_at,gps_accuracy_m,moderation_status,cell_code,words,image_fingerprint");
      query.set("source", "eq.web-camera");
      query.set("title", "neq.api test");
      query.append("lat", `gte.${nearLat - latDelta}`);
      query.append("lat", `lte.${nearLat + latDelta}`);
      query.append("lng", `gte.${nearLng - lngDelta}`);
      query.append("lng", `lte.${nearLng + lngDelta}`);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exclude)) {
        query.set("id", `neq.${exclude}`);
      }
      query.set("order", "created_at.desc");
      query.set("limit", "150");
      const nearbyResponse = await fetch(`${supabaseUrl}/rest/v1/azulejos?${query}`, { headers: adminHeaders });
      if (!nearbyResponse.ok) {
        return json(res, nearbyResponse.status, { error: "nearby read failed", detail: await nearbyResponse.text() });
      }
      const records = (await nearbyResponse.json())
        .map((record) => ({
          ...record,
          distance_m: distanceMeters(nearLat, nearLng, Number(record.lat), Number(record.lng)),
        }))
        .filter((record) => record.distance_m <= radius)
        .sort((first, second) => first.distance_m - second.distance_m);
      res.setHeader("Cache-Control", "private, no-store");
      return json(res, 200, { records, radius });
    }
    const bbox = String(requestUrl.searchParams.get("bbox") || "")
      .split(",")
      .map(Number);
    if (!isAdmin && bbox.length === 4 && bbox.every(Number.isFinite)) {
      const [west, south, east, north] = bbox;
      if (west >= east || south >= north || south < -90 || north > 90 || west < -180 || east > 180) {
        return json(res, 400, { error: "invalid bbox" });
      }
      const requestedLimit = Number.parseInt(requestUrl.searchParams.get("limit") || "600", 10);
      const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 600, 1200));
      const requestedStep = Number(requestUrl.searchParams.get("step"));
      const step = Math.max(3, Math.min(Number.isFinite(requestedStep) ? requestedStep : 384, 100000));
      const viewportResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/azulejos_viewport`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_south: south,
          p_west: west,
          p_north: north,
          p_east: east,
          p_limit: limit,
          p_step_meters: step,
        }),
      });
      if (!viewportResponse.ok) {
        return json(res, viewportResponse.status, { error: "viewport read failed", detail: await viewportResponse.text() });
      }
      const payload = await viewportResponse.json();
      res.setHeader("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
      return json(res, 200, payload || { records: [], visibleCount: 0, totalCount: 0 });
    }
    if (isAdmin) {
      try {
        const storedRecords = await readWebCameraRecordsByStatus(supabaseUrl, adminHeaders);
        const records = await hydrateAdminMediaUrls(storedRecords, supabaseUrl, adminHeaders, bucket);
        res.setHeader("Vary", "x-admin-key");
        res.setHeader("Cache-Control", "private, no-store");
        return json(res, 200, { records });
      } catch (error) {
        return json(res, error.status || 500, { error: "database read failed", detail: error.detail || error.message });
      }
    }
    const publicSelect = "id,title,lat,lng,image_url,cell_code,words,source,created_at,gps_accuracy_m,gps_timestamp,location_source";
    const response = await fetch(`${supabaseUrl}/rest/v1/azulejos?select=${publicSelect}&source=eq.web-camera&title=neq.api%20test&moderation_status=eq.approved&order=created_at.desc&limit=500`, {
      headers,
    });
    if (!response.ok) {
      return json(res, response.status, { error: "database read failed", detail: await response.text() });
    }
    res.setHeader("Vary", "x-admin-key");
    res.setHeader("Cache-Control", isAdmin ? "private, no-store" : "public, max-age=10, stale-while-revalidate=30");
    return json(res, 200, { records: await response.json() });
  }

  if (req.method === "PATCH") {
    if (!isAdmin) {
      return json(res, 401, { error: "admin key required" });
    }
    if (!serviceRoleKey) return json(res, 503, { error: "SUPABASE_SERVICE_ROLE_KEY is required for moderation" });

    let body;
    try {
      body = await parseBody(req);
    } catch {
      return json(res, 400, { error: "invalid json body" });
    }
    const adminHeaders = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    };

    if (Array.isArray(body.fingerprints)) {
      const fingerprints = body.fingerprints.slice(0, 50);
      if (!fingerprints.length || fingerprints.some((item) => !UUID_PATTERN.test(item?.id) || !FINGERPRINT_PATTERN.test(item?.fingerprint))) {
        return json(res, 400, { error: "valid fingerprint records are required" });
      }
      const results = await Promise.all(fingerprints.map((item) => fetch(`${supabaseUrl}/rest/v1/azulejos?id=eq.${item.id}`, {
        method: "PATCH",
        headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ image_fingerprint: item.fingerprint }),
      })));
      const failed = results.find((result) => !result.ok);
      if (failed) return json(res, failed.status, { error: "fingerprint update failed", detail: await failed.text() });
      return json(res, 200, { updated: fingerprints.length });
    }

    if (["confirm-duplicate", "review-relation", "attach-observation"].includes(body.relationAction)) {
      const relatedId = String(body.relatedId || "");
      if (!UUID_PATTERN.test(body.id) || !UUID_PATTERN.test(relatedId) || body.id === relatedId) {
        return json(res, 400, { error: "two distinct valid record ids are required" });
      }
      const requestedRelation = body.relationAction === "confirm-duplicate"
        ? "duplicate"
        : String(body.relation || "");
      if (!REVIEWED_RELATIONS.has(requestedRelation)) {
        return json(res, 400, { error: "valid reviewed relation is required" });
      }
      if (body.relationAction === "attach-observation" && requestedRelation !== "duplicate") {
        return json(res, 400, { error: "only duplicate observations can share a physical instance" });
      }
      const observationQuery = new URLSearchParams({
        select: "id,legacy_azulejo_id,physical_instance_id",
        legacy_azulejo_id: `in.(${body.id},${relatedId})`,
      });
      const observationResponse = await fetch(`${supabaseUrl}/rest/v1/observations?${observationQuery}`, { headers: adminHeaders });
      if (!observationResponse.ok) return json(res, observationResponse.status, { error: "observation lookup failed", detail: await observationResponse.text() });
      const observations = await observationResponse.json();
      if (observations.length !== 2) return json(res, 404, { error: "observations not found" });
      const currentObservation = observations.find((item) => item.legacy_azulejo_id === body.id);
      const relatedObservation = observations.find((item) => item.legacy_azulejo_id === relatedId);
      if (!currentObservation || !relatedObservation) return json(res, 404, { error: "observations not found" });

      const rawInstanceIds = [...new Set(observations.map((item) => item.physical_instance_id))];
      const canonicalQuery = new URLSearchParams({
        select: "id,canonical_instance_id",
        id: `in.(${rawInstanceIds.join(",")})`,
      });
      const canonicalResponse = await fetch(`${supabaseUrl}/rest/v1/physical_instances?${canonicalQuery}`, { headers: adminHeaders });
      if (!canonicalResponse.ok) return json(res, canonicalResponse.status, { error: "instance lookup failed", detail: await canonicalResponse.text() });
      const canonicalInstances = new Map((await canonicalResponse.json()).map((item) => [item.id, item.canonical_instance_id || item.id]));
      const currentInstanceId = canonicalInstances.get(currentObservation.physical_instance_id) || currentObservation.physical_instance_id;
      const relatedInstanceId = canonicalInstances.get(relatedObservation.physical_instance_id) || relatedObservation.physical_instance_id;

      if (body.relationAction !== "attach-observation" && currentInstanceId === relatedInstanceId) {
        return json(res, 409, { error: "observations already share a physical instance" });
      }
      const [firstInstanceId, secondInstanceId] = [currentInstanceId, relatedInstanceId].sort();
      const score = typeof body.score === "number" ? body.score : null;
      const relationPayload = {
        first_instance_id: firstInstanceId,
        second_instance_id: secondInstanceId,
        relation: requestedRelation,
        score: Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : null,
        reviewed: true,
        reviewed_by: adminAuthorization.userId,
        reviewed_at: new Date().toISOString(),
      };
      let relation = null;
      if (firstInstanceId !== secondInstanceId) {
        const relationResponse = await fetch(`${supabaseUrl}/rest/v1/similarity_links?on_conflict=first_instance_id,second_instance_id,relation`, {
          method: "POST",
          headers: {
            ...adminHeaders,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify(relationPayload),
        });
        if (!relationResponse.ok) return json(res, relationResponse.status, { error: "reviewed relation failed", detail: await relationResponse.text() });
        [relation] = await relationResponse.json();
      }

      if (body.relationAction === "attach-observation" && currentInstanceId !== relatedInstanceId) {
        const attachedAt = new Date().toISOString();
        const attachResponse = await fetch(`${supabaseUrl}/rest/v1/observations?id=eq.${currentObservation.id}`, {
          method: "PATCH",
          headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify({
            physical_instance_id: relatedInstanceId,
            attached_at: attachedAt,
            attached_by: adminAuthorization.userId,
          }),
        });
        if (!attachResponse.ok) return json(res, attachResponse.status, { error: "observation attachment failed", detail: await attachResponse.text() });
        const sourceRemainingResponse = await fetch(`${supabaseUrl}/rest/v1/observations?select=id&physical_instance_id=eq.${currentInstanceId}&limit=1`, { headers: adminHeaders });
        if (!sourceRemainingResponse.ok) return json(res, sourceRemainingResponse.status, { error: "source instance check failed", detail: await sourceRemainingResponse.text() });
        if ((await sourceRemainingResponse.json()).length === 0) {
          const canonicalizeResponse = await fetch(`${supabaseUrl}/rest/v1/physical_instances?id=eq.${currentInstanceId}`, {
            method: "PATCH",
            headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({
              canonical_instance_id: relatedInstanceId,
              canonicalized_at: attachedAt,
              canonicalized_by: adminAuthorization.userId,
            }),
          });
          if (!canonicalizeResponse.ok) return json(res, canonicalizeResponse.status, { error: "instance canonicalization failed", detail: await canonicalizeResponse.text() });
        }
        return json(res, 200, {
          attached: true,
          observationId: currentObservation.id,
          physicalInstanceId: relatedInstanceId,
          relation: relation || relationPayload,
        });
      }

      return json(res, 200, { attached: currentInstanceId === relatedInstanceId, relation: relation || relationPayload });
    }

    const id = String(body.id || "").trim();
    if (!UUID_PATTERN.test(id)) {
      return json(res, 400, { error: "valid id is required" });
    }
    const status = String(body.moderation_status || body.status || "").trim();
    const moderationReason = String(body.moderation_reason || "").trim();
    const conditionRequested = Array.isArray(body.condition_codes);
    const conditionCodes = conditionRequested ? [...new Set(body.condition_codes.map(String))] : null;
    const editedImage = decodeDataUrl(body.imageData);
    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return json(res, 400, { error: "invalid moderation_status" });
    }
    if (status === "rejected" && (!moderationReason || moderationReason.length > 240)) {
      return json(res, 400, { error: "a concise rejection reason is required" });
    }
    if (conditionRequested && conditionCodes.some((code) => !CONDITION_CODES.has(code))) {
      return json(res, 400, { error: "invalid condition code" });
    }
    if (!status && !editedImage && !conditionRequested) return json(res, 400, { error: "moderation_status, imageData or condition_codes is required" });
    if (editedImage && editedImage.buffer.length > 3_000_000) {
      return json(res, 413, { error: "edited image is too large" });
    }

    let existingRecord = null;
    if (editedImage) {
      const existingResponse = await fetch(`${supabaseUrl}/rest/v1/azulejos?select=id,original_image_path,original_image_url,original_image_bucket&id=eq.${id}&limit=1`, {
        headers: adminHeaders,
      });
      if (!existingResponse.ok) {
        return json(res, existingResponse.status, { error: "database lookup failed", detail: await existingResponse.text() });
      }
      [existingRecord] = await existingResponse.json();
      if (!existingRecord) return json(res, 404, { error: "record not found" });
    }
    const updatePayload = {};
    if (status) {
      updatePayload.moderation_status = status;
      updatePayload.moderation_reason = status === "rejected" ? moderationReason : null;
      updatePayload.last_admin_actor_id = adminAuthorization.userId;
      updatePayload.last_admin_actor_label = adminAuthorization.actor;
    }
    if (conditionRequested) updatePayload.condition_codes = conditionCodes;
    if (editedImage) {
      const editedPath = `captures/${id}-edited.${editedImage.ext}`;
      const upload = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${editedPath}`, {
        method: "POST",
        headers: {
          ...adminHeaders,
          "Content-Type": editedImage.mime,
          "x-upsert": "true",
        },
        body: editedImage.buffer,
      });
      if (!upload.ok) {
        return json(res, upload.status, { error: "edited image upload failed", detail: await upload.text() });
      }
      updatePayload.image_path = editedPath;
      updatePayload.image_bucket = bucket;
      updatePayload.image_url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${editedPath}?v=${Date.now()}`;
      if (existingRecord.original_image_path || existingRecord.original_image_url) {
        updatePayload.crop_points = normalizedCropPoints(body.crop_points);
        updatePayload.edit_settings = normalizedEditSettings(body.edit_settings);
      } else {
        updatePayload.crop_points = null;
        updatePayload.edit_settings = normalizedEditSettings();
      }
      updatePayload.edited_at = new Date().toISOString();
      if (FINGERPRINT_PATTERN.test(body.image_fingerprint || "")) updatePayload.image_fingerprint = body.image_fingerprint;
    }

    const update = await fetch(`${supabaseUrl}/rest/v1/azulejos?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        ...adminHeaders,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(updatePayload),
    });
    if (!update.ok) {
      return json(res, update.status, { error: "record update failed", detail: await update.text() });
    }
    const [storedRecord] = await update.json();
    const [record] = await hydrateAdminMediaUrls([storedRecord], supabaseUrl, adminHeaders, bucket);
    return json(res, 200, { record });
  }

  if (req.method === "DELETE") {
    if (!isAdmin) {
      return json(res, 401, { error: "admin key required" });
    }
    if (!serviceRoleKey) {
      return json(res, 503, { error: "SUPABASE_SERVICE_ROLE_KEY is required for deletes" });
    }

    let body;
    try {
      body = await parseBody(req);
    } catch {
      return json(res, 400, { error: "invalid json body" });
    }
    const id = String(body.id || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return json(res, 400, { error: "valid id is required" });
    }

    const adminHeaders = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    };
    const select = await fetch(`${supabaseUrl}/rest/v1/azulejos?select=id,image_path,image_bucket,original_image_path,original_image_bucket&id=eq.${id}&limit=1`, {
      headers: adminHeaders,
    });
    if (!select.ok) {
      return json(res, select.status, { error: "database lookup failed", detail: await select.text() });
    }
    const [record] = await select.json();
    if (!record) return json(res, 404, { error: "record not found" });

    const removeRecord = await fetch(`${supabaseUrl}/rest/v1/azulejos?id=eq.${id}`, {
      method: "DELETE",
      headers: {
        ...adminHeaders,
        Prefer: "return=minimal",
      },
    });
    if (!removeRecord.ok) {
      return json(res, removeRecord.status, { error: "database delete failed", detail: await removeRecord.text() });
    }

    const objects = [
      { bucket: record.image_bucket || bucket, path: record.image_path },
      { bucket: record.original_image_bucket || bucket, path: record.original_image_path },
    ].filter((object) => object.path);
    const uniqueObjects = [...new Map(objects.map((object) => [`${object.bucket}/${object.path}`, object])).values()];
    for (const object of uniqueObjects) {
      const removeObject = await fetch(`${supabaseUrl}/storage/v1/object/${object.bucket}/${object.path}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      if (!removeObject.ok && removeObject.status !== 404) {
        return json(res, removeObject.status, { error: "storage delete failed", detail: await removeObject.text() });
      }
    }
    return json(res, 200, { deleted: id });
  }

  let body;
  try {
    body = await parseBody(req);
  } catch {
    return json(res, 400, { error: "invalid json body" });
  }

  const image = decodeDataUrl(body.imageData);
  const originalImage = decodeDataUrl(body.originalImageData);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!image || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json(res, 400, { error: "imageData, lat and lng are required" });
  }
  const contributor = authorizeContributorRequest(req);
  const rights = normalizedContributionRights(body, contributor);
  if (rights.error) return json(res, 400, { error: rights.error });
  if (image.buffer.length > 3_000_000) {
    return json(res, 413, { error: "image is too large" });
  }
  if (originalImage && originalImage.buffer.length > 3_000_000) {
    return json(res, 413, { error: "original image is too large" });
  }
  const locationSource = String(body.locationSource || "legacy").trim().toLowerCase();
  const gpsAccuracy = body.gpsAccuracy === null || body.gpsAccuracy === undefined ? null : Number(body.gpsAccuracy);
  const gpsTimestamp = body.gpsTimestamp === null || body.gpsTimestamp === undefined ? null : Number(body.gpsTimestamp);
  if (locationSource === "browser") {
    const gpsAge = Date.now() - gpsTimestamp;
    if (!Number.isFinite(gpsAccuracy) || gpsAccuracy <= 0 || gpsAccuracy > 100) {
      return json(res, 400, { error: "a browser GPS accuracy of 100 meters or better is required" });
    }
    if (!Number.isFinite(gpsTimestamp) || gpsAge < -5_000 || gpsAge > 120_000) {
      return json(res, 400, { error: "a recent browser GPS position is required" });
    }
  }

  const requestedId = String(body.uploadId || "").trim();
  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedId)
    ? requestedId
    : crypto.randomUUID();
  const path = `captures/${id}.${image.ext}`;

  const upload = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": image.mime,
      "x-upsert": "true",
    },
    body: image.buffer,
  });
  if (!upload.ok) {
    return json(res, upload.status, { error: "storage upload failed", detail: await upload.text() });
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  let originalPath = null;
  let originalUrl = null;
  const originalsBucket = process.env.SUPABASE_ORIGINALS_BUCKET || "azulejos-originals";
  if (originalImage) {
    originalPath = `captures/${id}-source.${originalImage.ext}`;
    const originalUpload = await fetch(`${supabaseUrl}/storage/v1/object/${originalsBucket}/${originalPath}`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": originalImage.mime,
        "x-upsert": "true",
      },
      body: originalImage.buffer,
    });
    if (!originalUpload.ok) {
      return json(res, originalUpload.status, { error: "source image upload failed", detail: await originalUpload.text() });
    }
  }
  const recordPayload = {
    id,
    title: body.title || "recorded azulejo",
    lat,
    lng,
    image_path: path,
    image_url: publicUrl,
    image_bucket: bucket,
    original_image_path: originalPath,
    original_image_url: originalUrl,
    original_image_bucket: originalPath ? originalsBucket : null,
    crop_points: normalizedCropPoints(body.cropPoints),
    edit_settings: normalizedEditSettings(body.editSettings),
    cell_code: body.cell || null,
    words: body.words || null,
    source: "web-camera",
    moderation_status: "pending",
    gps_accuracy_m: Number.isFinite(gpsAccuracy) ? gpsAccuracy : null,
    gps_timestamp: Number.isFinite(gpsTimestamp) ? new Date(gpsTimestamp).toISOString() : null,
    location_source: ["browser", "exif"].includes(locationSource) ? locationSource : "legacy",
    photographer_credit: rights.photographerCredit,
    photo_license: rights.photoLicense,
    contributor_consent_at: rights.contributorConsentAt,
  };

  const insert = await fetch(`${supabaseUrl}/rest/v1/azulejos`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(recordPayload),
  });
  if (!insert.ok) {
    return json(res, insert.status, { error: "database insert failed", detail: await insert.text() });
  }

  const [record] = await insert.json();
  let receiptToken;
  try {
    receiptToken = await issueContributionReceipt(
      supabaseUrl,
      headers,
      id,
      contributor?.userId,
    );
  } catch (error) {
    return json(res, 502, { error: "contribution receipt failed", detail: error.message });
  }
  return json(res, 200, { record, receiptToken, imageUrl: publicUrl });
};
