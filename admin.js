const adminLogin = document.querySelector("#adminLogin");
const adminAccessPanel = document.querySelector("#adminAccessPanel");
const adminAccountLogin = document.querySelector("#adminAccountLogin");
const adminEmailInput = document.querySelector("#adminEmailInput");
const adminPasswordInput = document.querySelector("#adminPasswordInput");
const adminAccountLoginButton = document.querySelector("#adminAccountLoginButton");
const adminAccountLoginStatus = document.querySelector("#adminAccountLoginStatus");
const adminAccountSetup = document.querySelector("#adminAccountSetup");
const adminSetupEmail = document.querySelector("#adminSetupEmail");
const adminSetupPassword = document.querySelector("#adminSetupPassword");
const adminSetupRole = document.querySelector("#adminSetupRole");
const adminSetupButton = document.querySelector("#adminSetupButton");
const adminSetupStatus = document.querySelector("#adminSetupStatus");
const adminTools = document.querySelector("#adminTools");
const adminKeyInput = document.querySelector("#adminKeyInput");
const adminSaveKeyButton = document.querySelector("#adminSaveKeyButton");
const adminLoginStatus = document.querySelector("#adminLoginStatus");
const adminForgetKeyButton = document.querySelector("#adminForgetKeyButton");
const adminRefreshButton = document.querySelector("#adminRefreshButton");
const adminStatus = document.querySelector("#adminStatus");
const adminFilters = document.querySelector("#adminFilters");
const adminGrid = document.querySelector("#adminGrid");
const adminLoadMore = document.querySelector("#adminLoadMore");
const adminEditor = document.querySelector("#adminEditor");
const adminEditorClose = document.querySelector("#adminEditorClose");
const adminEditorMeta = document.querySelector("#adminEditorMeta");
const adminEditorStatus = document.querySelector("#adminEditorStatus");
const adminEditorSave = document.querySelector("#adminEditorSave");
const adminEditorPrev = document.querySelector("#adminEditorPrev");
const adminEditorNext = document.querySelector("#adminEditorNext");
const adminSourceCanvas = document.querySelector("#adminSourceCanvas");
const adminPreviewCanvas = document.querySelector("#adminPreviewCanvas");
const adminWhitePoint = document.querySelector("#adminWhitePoint");
const adminRecoverBorder = document.querySelector("#adminRecoverBorder");
const adminResetCrop = document.querySelector("#adminResetCrop");
const adminResetAdjustments = document.querySelector("#adminResetAdjustments");
const adminAdjustments = document.querySelector("#adminAdjustments");
const adminNearbyStatus = document.querySelector("#adminNearbyStatus");
const adminNearbyRadius = document.querySelector("#adminNearbyRadius");
const adminNearbyRadiusValue = document.querySelector("#adminNearbyRadiusValue");
const adminNearbyList = document.querySelector("#adminNearbyList");
const adminNearbyViewer = document.querySelector("#adminNearbyViewer");
const adminNearbyViewerClose = document.querySelector("#adminNearbyViewerClose");
const adminNearbyViewerImage = document.querySelector("#adminNearbyViewerImage");
const adminNearbyViewerDistance = document.querySelector("#adminNearbyViewerDistance");
const adminNearbyViewerMeta = document.querySelector("#adminNearbyViewerMeta");
const adminNearbyViewerMap = document.querySelector("#adminNearbyViewerMap");
const adminNearbyViewerDuplicate = document.querySelector("#adminNearbyViewerDuplicate");

const ADMIN_INITIAL_BATCH_SIZE = 18;
const ADMIN_BATCH_SIZE = 24;
const imageTools = window.AdminImageTools;
const similarityTools = window.AdminSimilarityTools;
let adminRecords = [];
let renderedRecordCount = 0;
let adminRecordFilter = "pending";
let adminAuthenticated = false;
const editorState = {
  record: null,
  card: null,
  image: null,
  points: null,
  initialPoints: null,
  settings: imageTools.normalizeSettings(),
  draggedPoint: null,
  whitePointMode: false,
  whitePoint: null,
  renderFrame: null,
  nearbyController: null,
  nearbyTimer: null,
  nearbyRecord: null,
};

function setAdminStatus(message) {
  adminStatus.textContent = message;
}

function showAdminTools() {
  adminAccessPanel.hidden = adminAuthenticated;
  adminTools.hidden = !adminAuthenticated;
}

async function refreshAdminAccountState() {
  if (!adminAuthenticated) return;
  const response = await fetch("/api/admin-account", { credentials: "same-origin", cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  adminAccountSetup.hidden = !response.ok || data.role !== "owner";
}

function googleMapsUrl(record) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${record.lat},${record.lng}`)}`;
}

function formatSubmissionDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "date de soumission inconnue";
  const formatted = new Intl.DateTimeFormat("fr-BE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(date);
  return `soumis le ${formatted} (Lisbonne)`;
}

function recommendedNearbyRadius(record) {
  const accuracy = Number(record?.gps_accuracy_m);
  return Math.round(Math.max(40, Math.min(120, (Number.isFinite(accuracy) ? accuracy : 25) + 25)) / 5) * 5;
}

function nearbyDistanceLabel(record) {
  const distance = Math.max(0, Math.round(Number(record.distance_m) || 0));
  const accuracy = Number(record.gps_accuracy_m);
  return Number.isFinite(accuracy)
    ? `${distance} m · GPS ±${Math.round(accuracy)} m`
    : `${distance} m`;
}

function nearbySimilarityLabel(record) {
  return Number.isFinite(record.visual_similarity)
    ? `${record.visual_similarity}% visual match`
    : "visual match unavailable";
}

function updateCardStatus(card, record) {
  const status = card.querySelector(".admin-status-pill");
  const moderationStatus = recordStatus(record);
  status.className = `admin-status-pill is-${moderationStatus}`;
  status.textContent = moderationStatus;
  const approve = card.querySelector(".admin-approve");
  approve.hidden = moderationStatus === "approved";
  const reject = card.querySelector(".admin-reject");
  reject.hidden = moderationStatus === "rejected";
}

function recordStatus(record) {
  return record.moderation_status || "approved";
}

function moderationCounts(records) {
  return records.reduce((counts, record) => {
    const status = recordStatus(record);
    counts[status] = (counts[status] || 0) + 1;
    counts.all += 1;
    return counts;
  }, { pending: 0, approved: 0, rejected: 0, all: 0 });
}

function updateAdminFilters(records) {
  const counts = moderationCounts(records);
  adminFilters.querySelectorAll("button[data-filter]").forEach((button) => {
    const filter = button.dataset.filter;
    const count = counts[filter] || 0;
    button.querySelector("span").textContent = String(count);
    button.classList.toggle("is-active", filter === adminRecordFilter);
  });
}

function filteredAdminRecords() {
  return adminRecordFilter === "all"
    ? adminRecords
    : adminRecords.filter((record) => recordStatus(record) === adminRecordFilter);
}

function editorRecordIndex() {
  const records = filteredAdminRecords();
  const index = records.findIndex((record) => record.id === editorState.record?.id);
  return { records, index };
}

function updateEditorNavigation() {
  const { records, index } = editorRecordIndex();
  const hasRecord = index >= 0;
  adminEditorPrev.disabled = !hasRecord || index <= 0;
  adminEditorNext.disabled = !hasRecord || index >= records.length - 1;
}

function cardForRecord(record) {
  const escapedId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(record.id) : record.id.replace(/"/g, '\\"');
  return adminGrid.querySelector(`[data-record-id="${escapedId}"]`);
}

async function openEditorAdjacent(direction) {
  const { records, index } = editorRecordIndex();
  if (index < 0) return;
  const next = records[index + direction];
  if (!next) return;
  closeNearbyViewer();
  editorState.nearbyController?.abort();
  window.clearTimeout(editorState.nearbyTimer);
  await openEditor(next, cardForRecord(next));
}

function appendRecordCard(record, index) {
    const card = document.createElement("article");
    card.className = "admin-card";
    card.dataset.recordId = record.id;

    const image = document.createElement("img");
    image.src = record.image_url;
    image.alt = record.title || "azulejo";
    image.loading = index < 6 ? "eager" : "lazy";
    image.decoding = "async";
    image.fetchPriority = index < 6 ? "high" : "low";

    const title = document.createElement("strong");
    title.textContent = record.title || "recorded azulejo";

    const meta = document.createElement("span");
    meta.textContent = `${record.lat}, ${record.lng}`;

    const submissionDate = document.createElement("span");
    submissionDate.className = "admin-submission-date";
    submissionDate.textContent = formatSubmissionDate(record.created_at);

    const status = document.createElement("span");
    status.className = "admin-status-pill";

    const mapLink = document.createElement("a");
    mapLink.href = googleMapsUrl(record);
    mapLink.target = "_blank";
    mapLink.rel = "noopener";
    mapLink.textContent = "map";

    const id = document.createElement("span");
    id.textContent = record.id;

    const actions = document.createElement("div");
    actions.className = "admin-card-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "admin-edit";
    editButton.textContent = "edit image";
    editButton.addEventListener("click", () => openEditor(record, card));

    const approveButton = document.createElement("button");
    approveButton.type = "button";
    approveButton.className = "admin-approve";
    approveButton.textContent = "approve";
    approveButton.addEventListener("click", () => moderateRecord(record, card, "approved"));

    const rejectButton = document.createElement("button");
    rejectButton.type = "button";
    rejectButton.className = "admin-reject";
    rejectButton.textContent = "reject";
    rejectButton.addEventListener("click", () => moderateRecord(record, card, "rejected"));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "admin-delete";
    deleteButton.textContent = "delete";
    deleteButton.addEventListener("click", () => deleteRecord(record, card));

    actions.append(editButton, approveButton, rejectButton, deleteButton);
    card.append(image, title, status, meta, submissionDate, mapLink, id, actions);
    updateCardStatus(card, record);
    adminGrid.append(card);
}

function renderNextRecordBatch(batchSize = ADMIN_BATCH_SIZE) {
  const records = filteredAdminRecords();
  const nextCount = Math.min(records.length, renderedRecordCount + batchSize);
  for (let index = renderedRecordCount; index < nextCount; index += 1) {
    appendRecordCard(records[index], index);
  }
  renderedRecordCount = nextCount;
  setAdminStatus(`${renderedRecordCount} / ${records.length} ${adminRecordFilter} contributions loaded · ${adminRecords.length} total`);
  adminLoadMore.hidden = renderedRecordCount >= records.length;
}

function renderRecords(records, note = "") {
  adminRecords = records.slice().sort((first, second) => {
    const rank = { pending: 0, rejected: 1, approved: 2 };
    const statusDelta = (rank[recordStatus(first)] ?? 3) - (rank[recordStatus(second)] ?? 3);
    if (statusDelta) return statusDelta;
    return new Date(second.created_at || 0) - new Date(first.created_at || 0);
  });
  const counts = moderationCounts(adminRecords);
  if (!counts[adminRecordFilter] && counts.pending) adminRecordFilter = "pending";
  else if (!counts[adminRecordFilter] && adminRecordFilter !== "all") adminRecordFilter = "all";
  updateAdminFilters(adminRecords);
  renderedRecordCount = 0;
  adminGrid.textContent = "";
  adminLoadMore.hidden = true;
  if (!adminRecords.length) {
    setAdminStatus(note || "no records returned by the database");
    return;
  }
  if (!filteredAdminRecords().length) {
    setAdminStatus(`no ${adminRecordFilter} records · ${adminRecords.length} total`);
    return;
  }
  renderNextRecordBatch(ADMIN_INITIAL_BATCH_SIZE);
  if (note) setAdminStatus(`${renderedRecordCount} / ${filteredAdminRecords().length} ${adminRecordFilter} contributions loaded · ${note}`);
}

async function loadRecords() {
  setAdminStatus("loading...");
  const response = await fetch(`/api/records?admin=1&fresh=${Date.now()}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `load failed ${response.status}`);
  if (!Array.isArray(data.records)) {
    throw new Error("database response did not include records");
  }
  if (data.records.length) {
    renderRecords(data.records);
    return;
  }
  renderRecords([], "admin database returned 0 records");
}

async function deleteRecord(record, card) {
  if (!window.confirm(`delete ${record.title || record.id}?`)) return;
  const button = card.querySelector(".admin-delete");
  button.disabled = true;
  button.textContent = "deleting...";
  const response = await fetch("/api/records", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ id: record.id }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    button.disabled = false;
    button.textContent = "delete";
    setAdminStatus(data.error || `delete failed ${response.status}`);
    return;
  }
  card.remove();
  adminRecords = adminRecords.filter((candidate) => candidate.id !== record.id);
  renderRecords(adminRecords, `deleted ${data.deleted}`);
  if (editorState.record?.id === record.id) closeEditor();
}

async function moderateRecord(record, card, moderationStatus) {
  const button = card.querySelector(moderationStatus === "approved" ? ".admin-approve" : ".admin-reject");
  button.disabled = true;
  button.textContent = moderationStatus === "approved" ? "approving..." : "rejecting...";
  const response = await fetch("/api/records", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ id: record.id, moderation_status: moderationStatus }),
  });
  const data = await response.json().catch(() => ({}));
  button.disabled = false;
  button.textContent = moderationStatus === "approved" ? "approve" : "reject";
  if (!response.ok) {
    setAdminStatus(data.error || `moderation failed ${response.status}`);
    return;
  }
  Object.assign(record, data.record || {}, { moderation_status: moderationStatus });
  renderRecords(adminRecords, `${moderationStatus} ${record.id}`);
  if (editorState.record?.id === record.id) updateEditorNavigation();
}

function loadEditorImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("source image could not be loaded"));
    image.src = url;
  });
}

function drawEditorSource() {
  const { image, points, whitePoint } = editorState;
  if (!image || !points) return;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, 1000 / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  adminSourceCanvas.width = width;
  adminSourceCanvas.height = height;
  const ctx = adminSourceCanvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);
  const canvasPoints = points.map((point) => ({ x: point.x * width, y: point.y * height }));
  ctx.save();
  ctx.strokeStyle = "#ffe76a";
  ctx.lineWidth = Math.max(2, Math.round(Math.min(width, height) / 320));
  ctx.beginPath();
  ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
  canvasPoints.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.stroke();
  canvasPoints.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(8, Math.min(width, height) / 55), 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = `${Math.max(10, Math.min(width, height) / 70)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), point.x, point.y);
  });
  if (whitePoint) {
    const x = whitePoint.x * width;
    const y = whitePoint.y * height;
    const radius = Math.max(10, Math.min(width, height) / 42);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - radius * 1.55, y);
    ctx.lineTo(x + radius * 1.55, y);
    ctx.moveTo(x, y - radius * 1.55);
    ctx.lineTo(x, y + radius * 1.55);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function renderEditorPreview() {
  if (!editorState.image || !editorState.points) return;
  imageTools.renderEditedImage(
    adminPreviewCanvas,
    editorState.image,
    editorState.points,
    editorState.settings,
    720,
    20,
  );
}

function scheduleEditorRender() {
  drawEditorSource();
  if (editorState.renderFrame) cancelAnimationFrame(editorState.renderFrame);
  editorState.renderFrame = requestAnimationFrame(() => {
    editorState.renderFrame = null;
    renderEditorPreview();
  });
}

function markEditorDirty() {
  if (!adminEditorSave.disabled) adminEditorSave.textContent = "save treatment";
}

function syncAdjustmentControls() {
  adminAdjustments.querySelectorAll('input[type="range"]').forEach((input) => {
    input.value = String(editorState.settings[input.name] || 0);
    input.closest("label").querySelector("output").value = input.value;
  });
}

function setWhitePointMode(enabled) {
  editorState.whitePointMode = Boolean(enabled);
  adminWhitePoint.classList.toggle("is-active", editorState.whitePointMode);
  adminSourceCanvas.classList.toggle("is-white-point-mode", editorState.whitePointMode);
  adminEditorStatus.textContent = editorState.whitePointMode
    ? "tap the part of the tile that should be white"
    : "";
}

function closeNearbyViewer() {
  adminNearbyViewer.classList.remove("is-open");
  adminNearbyViewer.setAttribute("aria-hidden", "true");
  adminNearbyViewerImage.removeAttribute("src");
  editorState.nearbyRecord = null;
}

function openNearbyViewer(record) {
  editorState.nearbyRecord = record;
  adminNearbyViewerImage.src = record.image_url;
  adminNearbyViewerDistance.textContent = `${nearbySimilarityLabel(record)} · ${nearbyDistanceLabel(record)}`;
  adminNearbyViewerMeta.textContent = `${formatSubmissionDate(record.created_at)} · ${record.moderation_status || "approved"}`;
  adminNearbyViewerMap.href = googleMapsUrl(record);
  adminNearbyViewerDuplicate.disabled = false;
  adminNearbyViewerDuplicate.textContent = "same tile";
  adminNearbyViewer.classList.add("is-open");
  adminNearbyViewer.setAttribute("aria-hidden", "false");
}

async function persistVisualFingerprints(referenceRecord, records) {
  if (!similarityTools) return;
  const referenceFingerprint = /^[01]{64}$/.test(referenceRecord.image_fingerprint || "")
    ? referenceRecord.image_fingerprint
    : await similarityTools.differenceHash(referenceRecord.image_url);
  const fingerprints = [
    { id: referenceRecord.id, fingerprint: referenceFingerprint },
    ...records
      .filter((record) => /^[01]{64}$/.test(record.image_fingerprint || ""))
      .map((record) => ({ id: record.id, fingerprint: record.image_fingerprint })),
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index);
  const missingIds = new Set([
    ...(!referenceRecord.image_fingerprint ? [referenceRecord.id] : []),
    ...records.filter((record) => !record.fingerprint_was_stored).map((record) => record.id),
  ]);
  const updates = fingerprints.filter((item) => missingIds.has(item.id));
  referenceRecord.image_fingerprint = referenceFingerprint;
  if (!updates.length) return;
  const response = await fetch("/api/records", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ fingerprints: updates }),
  });
  if (!response.ok) throw new Error("fingerprints could not be stored");
}

function renderNearbyRecords(records, radius) {
  adminNearbyList.textContent = "";
  adminNearbyStatus.textContent = records.length
    ? `${records.length} tile${records.length > 1 ? "s" : ""} within ${radius} m · ranked visually`
    : `no other tile within ${radius} m`;
  records.forEach((record) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-nearby-card";
    button.title = `${nearbySimilarityLabel(record)} · ${nearbyDistanceLabel(record)} · ${formatSubmissionDate(record.created_at)}`;
    const image = document.createElement("img");
    image.src = record.image_url;
    image.alt = record.title || "nearby azulejo";
    image.loading = "lazy";
    const similarity = document.createElement("strong");
    similarity.className = "admin-nearby-similarity";
    similarity.textContent = nearbySimilarityLabel(record);
    const distance = document.createElement("span");
    distance.textContent = nearbyDistanceLabel(record);
    const meta = document.createElement("span");
    meta.textContent = `${record.moderation_status || "approved"} · ${formatSubmissionDate(record.created_at)}`;
    button.append(image, similarity, distance, meta);
    button.addEventListener("click", () => openNearbyViewer(record));
    adminNearbyList.append(button);
  });
}

async function loadNearbyRecords() {
  const record = editorState.record;
  if (!record) return;
  editorState.nearbyController?.abort();
  const controller = new AbortController();
  editorState.nearbyController = controller;
  const radius = Number(adminNearbyRadius.value) || 60;
  adminNearbyRadiusValue.value = `${radius} m`;
  adminNearbyStatus.textContent = "loading nearby tiles...";
  try {
    const query = new URLSearchParams({
      nearLat: String(record.lat),
      nearLng: String(record.lng),
      radius: String(radius),
      exclude: record.id,
    });
    const response = await fetch(`/api/records?${query}`, {
      credentials: "same-origin",
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `nearby search failed ${response.status}`);
    if (editorState.record?.id !== record.id) return;
    const nearbyRecords = Array.isArray(data.records) ? data.records : [];
    let rankedRecords = nearbyRecords;
    if (similarityTools && nearbyRecords.length) {
      adminNearbyStatus.textContent = `comparing ${nearbyRecords.length} nearby tile${nearbyRecords.length > 1 ? "s" : ""}...`;
      try {
        const candidates = nearbyRecords.map((candidate) => ({
          ...candidate,
          fingerprint_was_stored: /^[01]{64}$/.test(candidate.image_fingerprint || ""),
        }));
        rankedRecords = await similarityTools.scoreRecords(record, candidates);
        persistVisualFingerprints(record, rankedRecords).catch(() => {});
      } catch {
        rankedRecords = nearbyRecords.map((candidate) => ({ ...candidate, visual_similarity: null }));
      }
    }
    if (editorState.record?.id !== record.id) return;
    renderNearbyRecords(rankedRecords, Number(data.radius) || radius);
  } catch (error) {
    if (error.name !== "AbortError") adminNearbyStatus.textContent = error.message;
  }
}

async function openEditor(record, card) {
  adminEditor.classList.add("is-open");
  adminEditor.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  adminEditorMeta.textContent = `${formatSubmissionDate(record.created_at)} · ${record.id}`;
  adminEditorStatus.textContent = "loading source...";
  adminEditorSave.disabled = true;
  adminEditorSave.textContent = "save treatment";
  editorState.record = record;
  editorState.card = card;
  updateEditorNavigation();
  const nearbyRadius = recommendedNearbyRadius(record);
  adminNearbyRadius.value = String(nearbyRadius);
  adminNearbyRadiusValue.value = `${nearbyRadius} m`;
  adminNearbyList.textContent = "";
  loadNearbyRecords();
  try {
    const sourceUrl = record.original_image_url || record.image_url;
    const image = await loadEditorImage(sourceUrl);
    const defaultInset = record.original_image_url ? 0.09 : 0;
    const points = imageTools.normalizePoints(record.crop_points, defaultInset);
    editorState.image = image;
    editorState.points = points;
    editorState.initialPoints = points.map((point) => ({ ...point }));
    editorState.settings = imageTools.normalizeSettings(record.edit_settings);
    editorState.whitePoint = record.edit_settings?.whitePoint || null;
    if (editorState.whitePoint) editorState.settings.whitePoint = { ...editorState.whitePoint };
    setWhitePointMode(false);
    adminRecoverBorder.disabled = !record.original_image_url;
    syncAdjustmentControls();
    scheduleEditorRender();
    adminEditorStatus.textContent = record.original_image_url ? "source margin available" : "published image only";
    adminEditorSave.disabled = false;
    updateEditorNavigation();
  } catch (error) {
    adminEditorStatus.textContent = error.message;
    updateEditorNavigation();
  }
}

function closeEditor() {
  closeNearbyViewer();
  editorState.nearbyController?.abort();
  window.clearTimeout(editorState.nearbyTimer);
  adminEditor.classList.remove("is-open");
  adminEditor.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  editorState.record = null;
  editorState.card = null;
  editorState.image = null;
  editorState.draggedPoint = null;
  editorState.whitePoint = null;
  setWhitePointMode(false);
}

function sourcePointerPosition(event) {
  const rect = adminSourceCanvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  };
}

function nearestPointIndex(position) {
  let nearest = 0;
  let distance = Infinity;
  editorState.points.forEach((point, index) => {
    const candidate = Math.hypot(point.x - position.x, point.y - position.y);
    if (candidate < distance) {
      nearest = index;
      distance = candidate;
    }
  });
  return nearest;
}

function sampleSourceColor(position) {
  const { image } = editorState;
  if (!image) return null;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sampleCanvas = document.createElement("canvas");
  const sampleSize = 9;
  sampleCanvas.width = sampleSize;
  sampleCanvas.height = sampleSize;
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  const sourceX = Math.max(0, Math.min(sourceWidth - 1, position.x * sourceWidth));
  const sourceY = Math.max(0, Math.min(sourceHeight - 1, position.y * sourceHeight));
  sampleContext.drawImage(
    image,
    sourceX - sampleSize / 2,
    sourceY - sampleSize / 2,
    sampleSize,
    sampleSize,
    0,
    0,
    sampleSize,
    sampleSize,
  );
  const pixels = sampleContext.getImageData(0, 0, sampleSize, sampleSize).data;
  const totals = { red: 0, green: 0, blue: 0, count: 0 };
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 16) continue;
    totals.red += pixels[index];
    totals.green += pixels[index + 1];
    totals.blue += pixels[index + 2];
    totals.count += 1;
  }
  if (!totals.count) return null;
  return {
    red: totals.red / totals.count,
    green: totals.green / totals.count,
    blue: totals.blue / totals.count,
  };
}

function applyWhitePoint(position) {
  const color = sampleSourceColor(position);
  if (!color) return;
  const clampSetting = (value) => Math.max(-100, Math.min(100, Math.round(value)));
  const warmth = clampSetting((color.blue - color.red) * 1.15);
  const tint = clampSetting(((color.red + color.blue) / 2 - color.green) * 1.35);
  editorState.whitePoint = position;
  editorState.settings.warmth = warmth;
  editorState.settings.tint = tint;
  editorState.settings.whitePoint = { ...position };
  syncAdjustmentControls();
  setWhitePointMode(false);
  adminEditorStatus.textContent = `white point set · warmth ${warmth} · tint ${tint}`;
  markEditorDirty();
  scheduleEditorRender();
}

adminSourceCanvas.addEventListener("pointerdown", (event) => {
  if (!editorState.points) return;
  const position = sourcePointerPosition(event);
  if (editorState.whitePointMode) {
    applyWhitePoint(position);
    return;
  }
  editorState.draggedPoint = nearestPointIndex(position);
  editorState.points[editorState.draggedPoint] = position;
  adminSourceCanvas.setPointerCapture?.(event.pointerId);
  markEditorDirty();
  scheduleEditorRender();
});

adminSourceCanvas.addEventListener("pointermove", (event) => {
  if (editorState.draggedPoint === null) return;
  editorState.points[editorState.draggedPoint] = sourcePointerPosition(event);
  markEditorDirty();
  scheduleEditorRender();
});

const stopPointDrag = () => { editorState.draggedPoint = null; };
adminSourceCanvas.addEventListener("pointerup", stopPointDrag);
adminSourceCanvas.addEventListener("pointercancel", stopPointDrag);

adminAdjustments.querySelectorAll('input[type="range"]').forEach((input) => {
  input.addEventListener("input", () => {
    editorState.settings[input.name] = Number(input.value);
    input.closest("label").querySelector("output").value = input.value;
    markEditorDirty();
    scheduleEditorRender();
  });
});

adminRecoverBorder.addEventListener("click", () => {
  if (!editorState.record?.original_image_url) {
    adminEditorStatus.textContent = "no source margin available";
    return;
  }
  const before = editorState.points.map((point) => ({ ...point }));
  editorState.points = imageTools.expandCropPoints(editorState.points, 0.18);
  const movement = editorState.points.reduce((total, point, index) => (
    total + Math.hypot(point.x - before[index].x, point.y - before[index].y)
  ), 0);
  adminEditorStatus.textContent = movement > 0.005
    ? "border recovered from source"
    : "source border already fully recovered";
  markEditorDirty();
  scheduleEditorRender();
});

adminResetCrop.addEventListener("click", () => {
  editorState.points = editorState.initialPoints.map((point) => ({ ...point }));
  markEditorDirty();
  scheduleEditorRender();
});

adminResetAdjustments.addEventListener("click", () => {
  editorState.settings = imageTools.normalizeSettings();
  editorState.whitePoint = null;
  setWhitePointMode(false);
  syncAdjustmentControls();
  markEditorDirty();
  scheduleEditorRender();
});

adminWhitePoint.addEventListener("click", () => {
  setWhitePointMode(!editorState.whitePointMode);
});

adminNearbyRadius.addEventListener("input", () => {
  adminNearbyRadiusValue.value = `${adminNearbyRadius.value} m`;
  window.clearTimeout(editorState.nearbyTimer);
  editorState.nearbyTimer = window.setTimeout(loadNearbyRecords, 260);
});

adminNearbyViewerClose.addEventListener("click", closeNearbyViewer);

adminNearbyViewerDuplicate.addEventListener("click", async () => {
  const reference = editorState.record;
  const candidate = editorState.nearbyRecord;
  if (!reference || !candidate) return;
  adminNearbyViewerDuplicate.disabled = true;
  adminNearbyViewerDuplicate.textContent = "recording...";
  try {
    const response = await fetch("/api/records", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        id: reference.id,
        relatedId: candidate.id,
        relationAction: "confirm-duplicate",
        score: Number.isFinite(candidate.visual_similarity) ? candidate.visual_similarity / 100 : null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `duplicate relation failed ${response.status}`);
    adminNearbyViewerDuplicate.textContent = "same tile recorded";
  } catch (error) {
    adminNearbyViewerDuplicate.disabled = false;
    adminNearbyViewerDuplicate.textContent = "same tile";
    adminNearbyViewerMeta.textContent = error.message;
  }
});

adminEditorPrev.addEventListener("click", () => openEditorAdjacent(-1));
adminEditorNext.addEventListener("click", () => openEditorAdjacent(1));

adminEditorSave.addEventListener("click", async () => {
  if (!editorState.record || !editorState.image) return;
  adminEditorSave.disabled = true;
  adminEditorSave.textContent = "saving...";
  adminEditorStatus.textContent = "rendering treatment...";
  try {
    const output = document.createElement("canvas");
    imageTools.renderEditedImage(output, editorState.image, editorState.points, editorState.settings, 1200, 28);
    const imageData = output.toDataURL("image/jpeg", 0.9);
    const imageFingerprint = similarityTools?.differenceHashFromCanvas(output) || null;
    const response = await fetch("/api/records", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        id: editorState.record.id,
        imageData,
        image_fingerprint: imageFingerprint,
        crop_points: editorState.record.original_image_url ? editorState.points : null,
        edit_settings: editorState.record.original_image_url ? editorState.settings : imageTools.normalizeSettings(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `save failed ${response.status}`);
    Object.assign(editorState.record, data.record || {});
    const cardImage = editorState.card?.querySelector("img");
    if (cardImage) cardImage.src = editorState.record.image_url;
    adminEditorStatus.textContent = "treatment saved";
    adminEditorSave.textContent = "saved";
  } catch (error) {
    adminEditorStatus.textContent = error.message;
    adminEditorSave.textContent = "save treatment";
  } finally {
    adminEditorSave.disabled = false;
  }
});

adminEditorClose.addEventListener("click", closeEditor);
document.addEventListener("keydown", (event) => {
  if (!adminEditor.classList.contains("is-open")) return;
  if (event.key === "Escape") {
    if (adminNearbyViewer.classList.contains("is-open")) closeNearbyViewer();
    else closeEditor();
    return;
  }
  if (adminNearbyViewer.classList.contains("is-open")) return;
  if (event.key === "ArrowLeft") {
    openEditorAdjacent(-1);
  } else if (event.key === "ArrowRight") {
    openEditorAdjacent(1);
  }
});

adminLogin.addEventListener("submit", async (event) => {
  event.preventDefault();
  const key = adminKeyInput.value.trim();
  if (!key) return;
  adminSaveKeyButton.disabled = true;
  adminSaveKeyButton.textContent = "opening...";
  adminLoginStatus.textContent = "";
  try {
    const response = await fetch("/api/admin-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ key }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `login failed ${response.status}`);
    adminAuthenticated = true;
    adminKeyInput.value = "";
    showAdminTools();
    await loadRecords();
    await refreshAdminAccountState();
  } catch (error) {
    adminAuthenticated = false;
    showAdminTools();
    adminLoginStatus.textContent = error.message === "invalid admin key" ? "invalid admin key" : error.message;
  } finally {
    adminSaveKeyButton.disabled = false;
    adminSaveKeyButton.textContent = "open";
  }
});

adminAccountLogin.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminAccountLoginButton.disabled = true;
  adminAccountLoginButton.textContent = "opening...";
  adminAccountLoginStatus.textContent = "";
  try {
    const response = await fetch("/api/admin-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        action: "sign-in",
        email: adminEmailInput.value.trim(),
        password: adminPasswordInput.value,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `login failed ${response.status}`);
    adminAuthenticated = true;
    adminPasswordInput.value = "";
    showAdminTools();
    await loadRecords();
    await refreshAdminAccountState();
  } catch (error) {
    adminAuthenticated = false;
    showAdminTools();
    adminAccountLoginStatus.textContent = error.message;
  } finally {
    adminAccountLoginButton.disabled = false;
    adminAccountLoginButton.textContent = "open";
  }
});

adminAccountSetup.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminSetupButton.disabled = true;
  adminSetupButton.textContent = "creating...";
  adminSetupStatus.textContent = "";
  try {
    const response = await fetch("/api/admin-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        action: "bootstrap",
        email: adminSetupEmail.value.trim(),
        password: adminSetupPassword.value,
        role: adminSetupRole.value,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `account creation failed ${response.status}`);
    adminSetupPassword.value = "";
    adminSetupEmail.value = "";
    adminSetupStatus.textContent = "account created";
  } catch (error) {
    adminSetupStatus.textContent = error.message;
  } finally {
    adminSetupButton.disabled = false;
    adminSetupButton.textContent = "create account";
  }
});

adminForgetKeyButton.addEventListener("click", async () => {
  await fetch("/api/admin-session", { method: "DELETE", credentials: "same-origin" }).catch(() => {});
  adminAuthenticated = false;
  adminGrid.textContent = "";
  showAdminTools();
});

adminRefreshButton.addEventListener("click", () => {
  loadRecords().catch((error) => setAdminStatus(error.message));
});

adminFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  adminRecordFilter = button.dataset.filter;
  renderRecords(adminRecords);
});

adminLoadMore.addEventListener("click", () => renderNextRecordBatch());

localStorage.removeItem("open-azulejos-admin-key");
showAdminTools();
fetch("/api/admin-session", { credentials: "same-origin", cache: "no-store" })
  .then((response) => {
    if (!response.ok) return;
    adminAuthenticated = true;
    showAdminTools();
    return Promise.all([loadRecords(), refreshAdminAccountState()]);
  })
  .catch((error) => {
    adminAuthenticated = false;
    showAdminTools();
    adminLoginStatus.textContent = error.message;
  });
