const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const json = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
};

const readBody = (request) => new Promise((resolve, reject) => {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
    if (body.length > 128_000) reject(new Error("payload too large"));
  });
  request.on("end", () => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch (error) {
      reject(error);
    }
  });
  request.on("error", reject);
});

const validUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));

const validateLocation = (body) => {
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const accuracy = body.gpsAccuracy == null ? null : Number(body.gpsAccuracy);
  const timestamp = body.gpsTimestamp == null ? null : Number(body.gpsTimestamp);
  const source = String(body.locationSource || "legacy").toLowerCase();
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { error: "valid coordinates are required" };
  }
  if (source === "browser") {
    const age = Date.now() - timestamp;
    if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 50) {
      return { error: "a browser GPS accuracy of 50 meters or better is required" };
    }
    if (!Number.isFinite(timestamp) || age < -5_000 || age > 120_000) {
      return { error: "a recent browser GPS position is required" };
    }
  }
  return { lat, lng, accuracy, timestamp, source };
};

const normalizedCropPoints = (value) => Array.isArray(value)
  && value.length === 4
  && value.every((point) => Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y)))
  ? value.map((point) => ({
    x: Math.max(0, Math.min(1, Number(point.x))),
    y: Math.max(0, Math.min(1, Number(point.y))),
  }))
  : null;

const signUpload = async (supabaseUrl, headers, bucket, objectPath) => {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${bucket}/${objectPath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true" },
    body: "{}",
  });
  if (!response.ok) throw new Error(`signed upload failed: ${response.status} ${await response.text()}`);
  const data = await response.json();
  const signedUrl = new URL(`${supabaseUrl}/storage/v1${data.url}`);
  return { bucket, path: objectPath, signedUrl: signedUrl.toString() };
};

const objectInfo = async (supabaseUrl, headers, bucket, objectPath) => {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/info/${bucket}/${objectPath}`, { headers });
  if (!response.ok) throw new Error(`uploaded object not found: ${bucket}/${objectPath}`);
  return response.json();
};

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicBucket = process.env.SUPABASE_BUCKET || "azulejos";
  const originalsBucket = process.env.SUPABASE_ORIGINALS_BUCKET || "azulejos-originals";
  if (!supabaseUrl || !serviceRoleKey) return json(response, 503, { error: "upload service unavailable" });
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  let body;
  try {
    body = await readBody(request);
  } catch {
    return json(response, 400, { error: "invalid request" });
  }

  const action = String(body.action || "");
  const id = String(body.uploadId || "");
  if (!validUuid(id)) return json(response, 400, { error: "valid uploadId is required" });

  if (action === "prepare") {
    const location = validateLocation(body);
    if (location.error) return json(response, 400, { error: location.error });
    const squareExtension = ALLOWED_MIME_TYPES.get(body.squareMime);
    const sourceExtension = body.sourceMime ? ALLOWED_MIME_TYPES.get(body.sourceMime) : null;
    if (!squareExtension || (body.sourceMime && !sourceExtension)) {
      return json(response, 400, { error: "unsupported image type" });
    }
    try {
      const squarePath = `captures/${id}.${squareExtension}`;
      const sourcePath = sourceExtension ? `captures/${id}-source.${sourceExtension}` : null;
      const [square, source] = await Promise.all([
        signUpload(supabaseUrl, headers, publicBucket, squarePath),
        sourcePath ? signUpload(supabaseUrl, headers, originalsBucket, sourcePath) : Promise.resolve(null),
      ]);
      return json(response, 200, { square, source });
    } catch (error) {
      return json(response, 502, { error: "could not prepare uploads", detail: error.message });
    }
  }

  if (action !== "finalize") return json(response, 400, { error: "invalid action" });

  const location = validateLocation(body);
  if (location.error) return json(response, 400, { error: location.error });
  const { lat, lng, accuracy: gpsAccuracy, timestamp: gpsTimestamp, source: locationSource } = location;
  const squarePath = String(body.squarePath || "");
  const sourcePath = body.sourcePath ? String(body.sourcePath) : null;
  const expectedPath = new RegExp(`^captures/${id}\\.(?:jpg|png|webp)$`, "i");
  const expectedSourcePath = new RegExp(`^captures/${id}-source\\.(?:jpg|png|webp)$`, "i");
  if (!expectedPath.test(squarePath) || (sourcePath && !expectedSourcePath.test(sourcePath))) {
    return json(response, 400, { error: "upload paths do not match uploadId" });
  }
  try {
    const [squareInfo, sourceInfo] = await Promise.all([
      objectInfo(supabaseUrl, headers, publicBucket, squarePath),
      sourcePath ? objectInfo(supabaseUrl, headers, originalsBucket, sourcePath) : Promise.resolve(null),
    ]);
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${publicBucket}/${squarePath}`;
    const recordPayload = {
      id,
      title: body.title || "recorded azulejo",
      lat,
      lng,
      image_bucket: publicBucket,
      image_path: squarePath,
      image_url: publicUrl,
      original_image_bucket: sourcePath ? originalsBucket : null,
      original_image_path: sourcePath,
      original_image_url: null,
      crop_points: normalizedCropPoints(body.cropPoints),
      cell_code: body.cell || null,
      words: body.words || null,
      source: "web-camera",
      moderation_status: "pending",
      gps_accuracy_m: Number.isFinite(gpsAccuracy) ? gpsAccuracy : null,
      gps_timestamp: Number.isFinite(gpsTimestamp) ? new Date(gpsTimestamp).toISOString() : null,
      location_source: ["browser", "exif"].includes(locationSource) ? locationSource : "legacy",
    };
    const insert = await fetch(`${supabaseUrl}/rest/v1/azulejos`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(recordPayload),
    });
    if (!insert.ok) return json(response, insert.status, { error: "database insert failed", detail: await insert.text() });
    const [record] = await insert.json();
    return json(response, 200, {
      record,
      imageUrl: publicUrl,
      assets: {
        square: { bytes: Number(squareInfo?.metadata?.size || squareInfo?.size) || null },
        source: sourceInfo ? { bytes: Number(sourceInfo?.metadata?.size || sourceInfo?.size) || null } : null,
      },
    });
  } catch (error) {
    return json(response, 409, { error: "upload verification failed", detail: error.message });
  }
};
