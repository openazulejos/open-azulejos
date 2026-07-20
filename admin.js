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
const adminPageLinks = [...document.querySelectorAll("[data-admin-page-link]")];
const adminPageSections = [...document.querySelectorAll("[data-admin-page]")];
const adminForgetKeyButton = document.querySelector("#adminForgetKeyButton");
const adminRefreshButton = document.querySelector("#adminRefreshButton");
const adminStatus = document.querySelector("#adminStatus");
const adminFilters = document.querySelector("#adminFilters");
const adminContributorFilter = document.querySelector("#adminContributorFilter");
const adminSortFilter = document.querySelector("#adminSortFilter");
const adminNeighborhoodFilter = document.querySelector("#adminNeighborhoodFilter");
const adminColorFilter = document.querySelector("#adminColorFilter");
const adminTypeFilter = document.querySelector("#adminTypeFilter");
const adminMotifFilter = document.querySelector("#adminMotifFilter");
const adminGrid = document.querySelector("#adminGrid");
const adminLoadMore = document.querySelector("#adminLoadMore");
const adminStatsPeriod = document.querySelector("#adminStatsPeriod");
const adminStatsStatus = document.querySelector("#adminStatsStatus");
const adminStatsNewContributors = document.querySelector("#adminStatsNewContributors");
const adminStatsPublished = document.querySelector("#adminStatsPublished");
const adminStatsSubmissions = document.querySelector("#adminStatsSubmissions");
const adminStatsPending = document.querySelector("#adminStatsPending");
const adminStatsApprovalRate = document.querySelector("#adminStatsApprovalRate");
const adminStatsActiveContributors = document.querySelector("#adminStatsActiveContributors");
const adminStatsLast24Hours = document.querySelector("#adminStatsLast24Hours");
const adminStatsGuestSubmissions = document.querySelector("#adminStatsGuestSubmissions");
const adminActivityChart = document.querySelector("#adminActivityChart");
const adminStatsSummary = document.querySelector("#adminStatsSummary");
const adminMembersStatus = document.querySelector("#adminMembersStatus");
const adminMembersList = document.querySelector("#adminMembersList");
const adminMembersRefresh = document.querySelector("#adminMembersRefresh");
const adminEditor = document.querySelector("#adminEditor");
const adminEditorClose = document.querySelector("#adminEditorClose");
const adminEditorMeta = document.querySelector("#adminEditorMeta");
const adminEditorStatus = document.querySelector("#adminEditorStatus");
const adminEditorSave = document.querySelector("#adminEditorSave");
const adminEditorApprove = document.querySelector("#adminEditorApprove");
const adminEditorReject = document.querySelector("#adminEditorReject");
const adminEditorDelete = document.querySelector("#adminEditorDelete");
const adminEditorPrev = document.querySelector("#adminEditorPrev");
const adminEditorNext = document.querySelector("#adminEditorNext");
const adminSourceCanvas = document.querySelector("#adminSourceCanvas");
const adminPreviewCanvas = document.querySelector("#adminPreviewCanvas");
const adminSourceResizer = document.querySelector("#adminSourceResizer");
const adminPreviewResizer = document.querySelector("#adminPreviewResizer");
const adminWorkspaceResizer = document.querySelector("#adminWorkspaceResizer");
const adminPointMagnifier = document.querySelector("#adminPointMagnifier");
const adminPointMagnifierCanvas = document.querySelector("#adminPointMagnifierCanvas");
const adminWhitePoint = document.querySelector("#adminWhitePoint");
const adminRecoverBorder = document.querySelector("#adminRecoverBorder");
const adminResetCrop = document.querySelector("#adminResetCrop");
const adminResetAdjustments = document.querySelector("#adminResetAdjustments");
const adminAdjustments = document.querySelector("#adminAdjustments");
const adminConditionCodes = document.querySelector("#adminConditionCodes");
const adminNearbyStatus = document.querySelector("#adminNearbyStatus");
const adminNearbyRadius = document.querySelector("#adminNearbyRadius");
const adminNearbyRadiusValue = document.querySelector("#adminNearbyRadiusValue");
const adminNearbyList = document.querySelector("#adminNearbyList");
const adminVisualStatus = document.querySelector("#adminVisualStatus");
const adminVisualThreshold = document.querySelector("#adminVisualThreshold");
const adminVisualThresholdValue = document.querySelector("#adminVisualThresholdValue");
const adminVisualList = document.querySelector("#adminVisualList");
const adminNearbyViewer = document.querySelector("#adminNearbyViewer");
const adminNearbyViewerClose = document.querySelector("#adminNearbyViewerClose");
const adminNearbyViewerImage = document.querySelector("#adminNearbyViewerImage");
const adminNearbyViewerDistance = document.querySelector("#adminNearbyViewerDistance");
const adminNearbyViewerMeta = document.querySelector("#adminNearbyViewerMeta");
const adminNearbyViewerMap = document.querySelector("#adminNearbyViewerMap");
const adminNearbyViewerRelation = document.querySelector("#adminNearbyViewerRelation");
const adminNearbyViewerEdit = document.querySelector("#adminNearbyViewerEdit");
const adminNearbyViewerDuplicate = document.querySelector("#adminNearbyViewerDuplicate");
const adminModerationDialog = document.querySelector("#adminModerationDialog");
const adminModerationForm = document.querySelector("#adminModerationForm");
const adminModerationReason = document.querySelector("#adminModerationReason");
const adminModerationDetails = document.querySelector("#adminModerationDetails");
const adminModerationStatus = document.querySelector("#adminModerationStatus");
const adminModerationCancel = document.querySelector("#adminModerationCancel");

const ADMIN_INITIAL_BATCH_SIZE = 18;
const ADMIN_BATCH_SIZE = 24;
const imageTools = window.AdminImageTools;
const similarityTools = window.AdminSimilarityTools;
let adminRecords = [];
let renderedRecordCount = 0;
let adminRecordFilter = "pending";
let adminContributorFilterValue = "all";
let adminSortFilterValue = "status-latest";
let adminNeighborhoodFilterValue = "all";
let adminColorFilterValue = "all";
let adminTypeFilterValue = "all";
let adminMotifFilterValue = "all";
let adminAuthenticated = false;
let adminAuthChecked = false;
let activeAdminPage = "moderation";
let adminColorAnalysisToken = 0;
const adminColorCache = new Map();
const ADMIN_LISBON_NEIGHBORHOODS = [
  { name: "belém", polygon: [[38.7047, -9.2298], [38.7111, -9.2053], [38.7019, -9.1859], [38.6902, -9.1912], [38.6881, -9.2195]] },
  { name: "ajuda", polygon: [[38.7194, -9.2181], [38.7241, -9.1965], [38.7106, -9.1833], [38.7003, -9.1897], [38.7047, -9.2104]] },
  { name: "estrela", polygon: [[38.7242, -9.1811], [38.7259, -9.1587], [38.7147, -9.1472], [38.7032, -9.1541], [38.7056, -9.1749]] },
  { name: "campo de ourique", polygon: [[38.7320, -9.1839], [38.7341, -9.1637], [38.7248, -9.1516], [38.7149, -9.1585], [38.7156, -9.1788]] },
  { name: "chiado", polygon: [[38.7175, -9.1512], [38.7172, -9.1392], [38.7091, -9.1347], [38.7041, -9.1429], [38.7082, -9.1519]] },
  { name: "baixa", polygon: [[38.7186, -9.1413], [38.7195, -9.1326], [38.7098, -9.1291], [38.7049, -9.1362], [38.7102, -9.1425]] },
  { name: "alfama", polygon: [[38.7200, -9.1340], [38.7184, -9.1212], [38.7113, -9.1177], [38.7049, -9.1258], [38.7098, -9.1332]] },
  { name: "mouraria", polygon: [[38.7246, -9.1403], [38.7227, -9.1290], [38.7166, -9.1259], [38.7118, -9.1324], [38.7173, -9.1415]] },
  { name: "graça", polygon: [[38.7292, -9.1374], [38.7280, -9.1235], [38.7201, -9.1179], [38.7139, -9.1258], [38.7203, -9.1365]] },
  { name: "avenidas novas", polygon: [[38.7516, -9.1652], [38.7505, -9.1396], [38.7347, -9.1321], [38.7248, -9.1462], [38.7333, -9.1668]] },
  { name: "arroios", polygon: [[38.7413, -9.1470], [38.7398, -9.1290], [38.7282, -9.1232], [38.7192, -9.1327], [38.7264, -9.1488]] },
  { name: "parque das nações", polygon: [[38.7958, -9.1082], [38.7898, -9.0841], [38.7505, -9.0872], [38.7428, -9.1030], [38.7667, -9.1161]] },
];
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
  visualTimer: null,
  visualSearchToken: 0,
  nearbyRecord: null,
  moderationTarget: null,
  usesOriginalSource: false,
  resizeTarget: null,
  reviewQueueIds: [],
  returnRecordIds: [],
};

function setAdminStatus(message) {
  adminStatus.textContent = message;
}

function formatStatsDate(value, options = { dateStyle: "medium" }) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "Europe/Lisbon" }).format(date);
}

function renderActivityChart(days = []) {
  adminActivityChart.textContent = "";
  const maximum = Math.max(1, ...days.map((day) => Number(day.submitted) || 0));
  days.forEach((day) => {
    const row = document.createElement("div");
    row.className = "admin-activity-row";
    const time = document.createElement("time");
    time.dateTime = day.date;
    time.textContent = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      timeZone: "Europe/Lisbon",
    }).format(new Date(`${day.date}T12:00:00Z`));
    const bars = document.createElement("div");
    bars.className = "admin-activity-bars";
    bars.setAttribute("aria-label", `${day.submitted} submitted, ${day.approved} approved`);
    const submitted = document.createElement("span");
    submitted.className = "admin-activity-submitted";
    submitted.style.width = `${(Number(day.submitted) / maximum) * 100}%`;
    const approved = document.createElement("span");
    approved.className = "admin-activity-approved";
    approved.style.width = `${(Number(day.approved) / maximum) * 100}%`;
    const count = document.createElement("strong");
    count.textContent = String(day.submitted || 0);
    bars.append(submitted, approved);
    row.append(time, bars, count);
    adminActivityChart.append(row);
  });
}

async function loadAdminStats() {
  adminStatsStatus.textContent = "loading stats...";
  try {
    const response = await fetch(`/api/admin-stats?fresh=${Date.now()}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `stats failed ${response.status}`);
    const metrics = data.metrics || {};
    adminStatsPeriod.textContent = `since ${formatStatsDate(data.launch?.startedAt) || "beta launch"}`;
    adminStatsNewContributors.textContent = String(metrics.newContributors ?? 0);
    adminStatsPublished.textContent = String(metrics.publishedSinceBeta ?? 0);
    adminStatsSubmissions.textContent = String(metrics.submissionsSinceBeta ?? 0);
    adminStatsPending.textContent = String(metrics.pendingNow ?? 0);
    adminStatsApprovalRate.textContent = metrics.approvalRate === null || metrics.approvalRate === undefined
      ? "—"
      : `${metrics.approvalRate}%`;
    adminStatsActiveContributors.textContent = String(metrics.activeContributors ?? 0);
    adminStatsLast24Hours.textContent = String(metrics.submissionsLast24Hours ?? 0);
    adminStatsGuestSubmissions.textContent = String(metrics.guestSubmissions ?? 0);
    renderActivityChart(Array.isArray(data.daily) ? data.daily : []);
    const latest = formatStatsDate(metrics.latestSubmissionAt, { dateStyle: "medium", timeStyle: "short" });
    adminStatsSummary.textContent = `${metrics.totalPublished ?? 0} total published · ${metrics.totalContributors ?? 0} registered accounts${latest ? ` · latest submission ${latest}` : ""}`;
    adminStatsStatus.textContent = `updated ${formatStatsDate(new Date(), { timeStyle: "short" })}`;
  } catch (error) {
    adminStatsStatus.textContent = error.message;
  }
}

function showAdminTools() {
  document.body.classList.toggle("is-admin-authenticated", adminAuthChecked && adminAuthenticated);
  if (!adminAuthChecked) {
    adminAccessPanel.hidden = true;
    adminTools.hidden = true;
    return;
  }
  adminAccessPanel.hidden = adminAuthenticated;
  adminTools.hidden = !adminAuthenticated;
  if (adminAuthenticated) setAdminPage(pageFromHash() || activeAdminPage, { replace: true });
}

function pageFromHash() {
  const page = window.location.hash.replace(/^#/, "").trim();
  return ["dashboard", "moderation", "members", "accounts"].includes(page) ? page : "";
}

function requestedEditRecordId() {
  const id = new URLSearchParams(window.location.search).get("edit");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""))
    ? id
    : "";
}

function clearRequestedEditRecordId() {
  if (!requestedEditRecordId()) return;
  const url = new URL(window.location.href);
  url.searchParams.delete("edit");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash || "#moderation"}`);
}

function setAdminPage(page, options = {}) {
  const requestedPage = ["dashboard", "moderation", "members", "accounts"].includes(page) ? page : "moderation";
  const targetPage = requestedPage === "accounts" && adminAccountSetup.hidden ? "moderation" : requestedPage;
  activeAdminPage = targetPage;
  adminPageSections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.adminPage === targetPage);
  });
  adminPageLinks.forEach((link) => {
    const active = link.dataset.adminPageLink === targetPage;
    link.classList.toggle("is-active", active);
    link.setAttribute("aria-current", active ? "page" : "false");
  });
  if (options.hash !== false && window.location.hash.replace(/^#/, "") !== targetPage) {
    const method = options.replace ? "replaceState" : "pushState";
    window.history[method](null, "", `${window.location.pathname}${window.location.search}#${targetPage}`);
  }
}

function formatMemberDate(value) {
  const date = new Date(value || "");
  if (!Number.isFinite(date.getTime())) return "never";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(date);
}

function renderAdminMembers(members = []) {
  adminMembersList.textContent = "";
  if (!members.length) {
    adminMembersStatus.textContent = "no registered members yet";
    return;
  }
  members.forEach((member) => {
    const card = document.createElement("article");
    card.className = "admin-member-card";

    const form = document.createElement("form");
    form.className = "admin-member-name";
    const input = document.createElement("input");
    input.value = member.pseudonym || "";
    input.maxLength = 32;
    input.autocomplete = "off";
    input.setAttribute("aria-label", `pseudonym for ${member.pseudonym || "member"}`);
    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "save";
    form.append(input, save);

    const email = document.createElement("p");
    email.className = "admin-member-email";
    email.textContent = member.email || "email unavailable";

    const stats = document.createElement("div");
    stats.className = "admin-member-stats";
    stats.append(
      memberStat("total", member.totalCount),
      memberStat("accepted", member.approvedCount),
      memberStat("pending", member.pendingCount, () => showMemberPendingModeration(member)),
    );

    const meta = document.createElement("p");
    meta.className = "admin-member-meta";
    meta.textContent = `joined ${formatMemberDate(member.joinedAt)} · latest ${formatMemberDate(member.lastContributionAt)}`;

    const status = document.createElement("p");
    status.className = "admin-member-status";
    status.setAttribute("role", "status");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true;
      save.textContent = "saving...";
      status.textContent = "";
      try {
        const response = await fetch("/api/admin-members", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ userId: member.userId, pseudonym: input.value }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `member update failed ${response.status}`);
        member.pseudonym = data.member?.pseudonym || input.value.trim();
        input.value = member.pseudonym;
        status.textContent = "saved";
        loadAdminStats().catch(() => {});
      } catch (error) {
        status.textContent = error.message;
      } finally {
        save.disabled = false;
        save.textContent = "save";
      }
    });

    card.append(form, email, stats, meta, status);
    adminMembersList.append(card);
  });
  adminMembersStatus.textContent = `${members.length} member${members.length > 1 ? "s" : ""}`;
}

function memberStat(label, value, action = null) {
  const tagName = action && Number(value) > 0 ? "button" : "span";
  const element = document.createElement(tagName);
  element.className = "admin-member-stat";
  if (tagName === "button") {
    element.type = "button";
    element.addEventListener("click", action);
    element.title = `show ${label} in moderation`;
  }
  const count = document.createElement("strong");
  count.textContent = String(value ?? 0);
  const text = document.createElement("span");
  text.textContent = label;
  element.append(count, text);
  return element;
}

function showMemberPendingModeration(member) {
  adminRecordFilter = "pending";
  adminContributorFilterValue = String(member.userId || "").trim() || "anonymous";
  adminSortFilterValue = "status-latest";
  adminNeighborhoodFilterValue = "all";
  adminColorFilterValue = "all";
  adminTypeFilterValue = "all";
  adminMotifFilterValue = "all";
  if (adminSortFilter) adminSortFilter.value = "status-latest";
  if (adminColorFilter) adminColorFilter.value = "all";
  if (adminTypeFilter) adminTypeFilter.value = "all";
  if (adminMotifFilter) adminMotifFilter.value = "all";
  renderRecords(adminRecords);
  setAdminPage("moderation");
}

async function loadAdminMembers() {
  if (!adminMembersList || !adminMembersStatus) return;
  adminMembersStatus.textContent = "loading members...";
  try {
    const response = await fetch("/api/admin-members?limit=300", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `members failed ${response.status}`);
    renderAdminMembers(Array.isArray(data.members) ? data.members : []);
  } catch (error) {
    adminMembersStatus.textContent = error.message;
  }
}

async function refreshAdminAccountState() {
  if (!adminAuthenticated) return;
  const response = await fetch("/api/admin-account", { credentials: "same-origin", cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  adminAccountSetup.hidden = !response.ok || data.role !== "owner";
  setAdminPage(pageFromHash() || activeAdminPage, { replace: true });
}

function googleMapsUrl(record) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${record.lat},${record.lng}`)}`;
}

function publicRecordUrl(record) {
  const code = String(record?.cell_code || "").trim();
  return code ? `./#cell=${encodeURIComponent(code)}` : "";
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
  return 150;
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

function recordDistanceFrom(reference, candidate) {
  const firstLat = Number(reference?.lat);
  const firstLng = Number(reference?.lng);
  const secondLat = Number(candidate?.lat);
  const secondLng = Number(candidate?.lng);
  if (![firstLat, firstLng, secondLat, secondLng].every(Number.isFinite)) return null;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const lat1 = toRadians(firstLat);
  const lat2 = toRadians(secondLat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(secondLng - firstLng);
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function updateCardStatus(card, record) {
  const status = card.querySelector(".admin-status-pill");
  const moderationStatus = recordStatus(record);
  status.className = `admin-status-pill is-${moderationStatus}`;
  status.textContent = moderationStatus;
  const reason = card.querySelector(".admin-moderation-reason");
  if (reason) {
    const reasonText = String(record.moderation_reason || "").trim();
    reason.hidden = moderationStatus !== "rejected" || !reasonText;
    reason.textContent = reasonText ? `reason: ${reasonText}` : "";
  }
  const approve = card.querySelector(".admin-approve");
  approve.hidden = moderationStatus === "approved";
  const reject = card.querySelector(".admin-reject");
  reject.hidden = moderationStatus === "rejected";
  const publicLink = card.querySelector(".admin-public-link");
  if (publicLink) {
    const href = publicRecordUrl(record);
    publicLink.href = href;
    publicLink.hidden = moderationStatus !== "approved" || !href;
  }
}

function recordStatus(record) {
  return record?.moderation_status || "approved";
}

function contributorKey(record) {
  return String(record.contributor_id || "").trim() || "anonymous";
}

function contributorLabel(record) {
  return String(record.contributor_pseudonym || record.photographer_credit || "").trim() || "anonymous";
}

function normalizedAdminFilterValue(value) {
  return String(value || "all").trim().toLowerCase();
}

function pointInsideAdminPolygon(lat, lng, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const currentLat = Number(currentPoint?.[0]);
    const currentLng = Number(currentPoint?.[1]);
    const previousLat = Number(previousPoint?.[0]);
    const previousLng = Number(previousPoint?.[1]);
    if (![currentLat, currentLng, previousLat, previousLng].every(Number.isFinite)) continue;
    const intersects = ((currentLng > lng) !== (previousLng > lng))
      && (lat < ((previousLat - currentLat) * (lng - currentLng)) / (previousLng - currentLng) + currentLat);
    if (intersects) inside = !inside;
  }
  return inside;
}

function adminNeighborhoodForRecord(record) {
  if (record.__neighborhood) return record.__neighborhood;
  const lat = Number(record?.lat);
  const lng = Number(record?.lng);
  const neighborhood = Number.isFinite(lat) && Number.isFinite(lng)
    ? ADMIN_LISBON_NEIGHBORHOODS.find((item) => pointInsideAdminPolygon(lat, lng, item.polygon))
    : null;
  record.__neighborhood = neighborhood?.name || "unknown";
  return record.__neighborhood;
}

function adminColorFamilyFromRgb(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  if (max < 48) return "black";
  if (min > 214 && delta < 36) return "white";
  if (delta < 22) return lightness < 150 ? "grey" : "white";
  let hue = 0;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue >= 195 && hue <= 258) return "blue";
  if (hue >= 80 && hue < 175) return "green";
  if (hue >= 38 && hue < 80) return "yellow";
  if (hue >= 350 || hue < 16) return "red";
  if (hue >= 16 && hue < 38) return "brown";
  return "multicolor";
}

function dominantAdminColorFamily(data) {
  const counts = new Map();
  for (let index = 0; index < data.length; index += 16) {
    if (data[index + 3] < 180) continue;
    const family = adminColorFamilyFromRgb(data[index], data[index + 1], data[index + 2]);
    if (family === "white") continue;
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  if (!counts.size) return "white";
  const ranked = [...counts.entries()].sort((first, second) => second[1] - first[1]);
  const total = ranked.reduce((sum, [, count]) => sum + count, 0);
  if (ranked.length >= 3 && ranked[0][1] / total < 0.45) return "multicolor";
  return ranked[0][0];
}

function adminColorMetadataFromCanvas(canvas) {
  const sample = document.createElement("canvas");
  sample.width = 32;
  sample.height = 32;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(canvas, 0, 0, sample.width, sample.height);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  const counts = new Map();
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 180) continue;
    const family = adminColorFamilyFromRgb(pixels[index], pixels[index + 1], pixels[index + 2]);
    if (family === "white") continue;
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  if (!counts.size) {
    return {
      dominant: "white",
      families: { white: 1 },
      source: "admin-treatment",
    };
  }
  const ranked = [...counts.entries()].sort((first, second) => second[1] - first[1]);
  const total = ranked.reduce((sum, [, count]) => sum + count, 0);
  const dominant = ranked.length >= 3 && ranked[0][1] / total < 0.45 ? "multicolor" : ranked[0][0];
  const families = Object.fromEntries(ranked.map(([family, count]) => [family, Number((count / total).toFixed(4))]));
  return { dominant, families, source: "admin-treatment" };
}

function thumbnailImageUrl(imageUrl, size = 96) {
  const source = String(imageUrl || "");
  const marker = "/storage/v1/object/public/";
  if (!source.startsWith("http") || !source.includes(marker)) return source;
  const params = new URLSearchParams({
    src: source,
    w: String(size),
    h: String(size),
    q: "45",
  });
  return `/api/image?${params}`;
}

function analyzeAdminRecordColor(record, token) {
  if (!record?.id || adminColorCache.has(record.id) || typeof Image === "undefined") return;
  if (record.dominant_color) {
    adminColorCache.set(record.id, String(record.dominant_color));
    return;
  }
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    if (token !== adminColorAnalysisToken) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 24;
      canvas.height = 24;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, 24, 24);
      adminColorCache.set(record.id, dominantAdminColorFamily(context.getImageData(0, 0, 24, 24).data));
      if (adminColorFilterValue !== "all") renderRecords(adminRecords);
    } catch {
      adminColorCache.set(record.id, "multicolor");
    }
  };
  image.onerror = () => {
    adminColorCache.set(record.id, "multicolor");
  };
  image.src = thumbnailImageUrl(record.image_url, 96);
}

function scheduleAdminColorAnalysis(records) {
  const token = ++adminColorAnalysisToken;
  records.slice(0, 1200).forEach((record, index) => {
    window.setTimeout(() => analyzeAdminRecordColor(record, token), index * 10);
  });
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

function timestampForRecord(record, field) {
  const value = record?.[field];
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function moderationSortTime(record, targetStatus) {
  if (recordStatus(record) !== targetStatus) return 0;
  return timestampForRecord(record, "moderation_updated_at") || timestampForRecord(record, "created_at");
}

function sortAdminRecords(records) {
  const statusRank = { pending: 0, rejected: 1, approved: 2 };
  const byLatestCreated = (first, second) => timestampForRecord(second, "created_at") - timestampForRecord(first, "created_at");
  return records.slice().sort((first, second) => {
    if (adminSortFilterValue === "latest-published") return byLatestCreated(first, second);
    if (adminSortFilterValue === "oldest-published") return timestampForRecord(first, "created_at") - timestampForRecord(second, "created_at");
    if (adminSortFilterValue === "latest-approved") {
      const statusDelta = (recordStatus(second) === "approved") - (recordStatus(first) === "approved");
      if (statusDelta) return statusDelta;
      return moderationSortTime(second, "approved") - moderationSortTime(first, "approved") || byLatestCreated(first, second);
    }
    if (adminSortFilterValue === "latest-rejected") {
      const statusDelta = (recordStatus(second) === "rejected") - (recordStatus(first) === "rejected");
      if (statusDelta) return statusDelta;
      return moderationSortTime(second, "rejected") - moderationSortTime(first, "rejected") || byLatestCreated(first, second);
    }
    const statusDelta = (statusRank[recordStatus(first)] ?? 3) - (statusRank[recordStatus(second)] ?? 3);
    if (statusDelta) return statusDelta;
    return byLatestCreated(first, second);
  });
}

function filteredAdminRecords() {
  const byStatus = adminRecordFilter === "all"
    ? adminRecords
    : adminRecords.filter((record) => recordStatus(record) === adminRecordFilter);
  const byContributor = adminContributorFilterValue === "all"
    ? byStatus
    : byStatus.filter((record) => contributorKey(record) === adminContributorFilterValue);
  return byContributor.filter((record) => {
    if (adminNeighborhoodFilterValue !== "all" && normalizedAdminFilterValue(adminNeighborhoodForRecord(record)) !== adminNeighborhoodFilterValue) return false;
    if (adminColorFilterValue !== "all" && adminColorCache.get(record.id) !== adminColorFilterValue) return false;
    if (adminTypeFilterValue !== "all" && normalizedAdminFilterValue(record.tile_type) !== adminTypeFilterValue) return false;
    if (adminMotifFilterValue !== "all" && normalizedAdminFilterValue(record.motif_group_id || record.motif_id || record.physical_instance_id) !== adminMotifFilterValue) return false;
    return true;
  });
}

function contributorFilterOptions(records) {
  const options = new Map();
  records.forEach((record) => {
    const key = contributorKey(record);
    const label = contributorLabel(record);
    if (!options.has(key)) options.set(key, { key, label, count: 0 });
    options.get(key).count += 1;
  });
  return [...options.values()].sort((first, second) => {
    if (first.key === "anonymous") return 1;
    if (second.key === "anonymous") return -1;
    return first.label.localeCompare(second.label, undefined, { sensitivity: "base" });
  });
}

function updateContributorFilter(records) {
  const options = contributorFilterOptions(records);
  const available = new Set(["all", ...options.map((option) => option.key)]);
  if (!available.has(adminContributorFilterValue)) adminContributorFilterValue = "all";
  adminContributorFilter.textContent = "";
  const all = document.createElement("option");
  all.value = "all";
  all.textContent = "all contributors";
  adminContributorFilter.append(all);
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.key;
    item.textContent = `${option.label} (${option.count})`;
    adminContributorFilter.append(item);
  });
  adminContributorFilter.value = adminContributorFilterValue;
}

function updateNeighborhoodFilter(records) {
  if (!adminNeighborhoodFilter) return;
  const counts = new Map();
  records.forEach((record) => {
    const name = adminNeighborhoodForRecord(record);
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  const available = new Set(["all", ...counts.keys()]);
  if (!available.has(adminNeighborhoodFilterValue)) adminNeighborhoodFilterValue = "all";
  adminNeighborhoodFilter.textContent = "";
  const all = document.createElement("option");
  all.value = "all";
  all.textContent = "all neighborhoods";
  adminNeighborhoodFilter.append(all);
  [...counts.entries()]
    .sort((first, second) => first[0].localeCompare(second[0], undefined, { sensitivity: "base" }))
    .forEach(([name, count]) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = `${name} (${count})`;
      adminNeighborhoodFilter.append(option);
    });
  adminNeighborhoodFilter.value = adminNeighborhoodFilterValue;
}

function updateMotifFilter(records) {
  if (!adminMotifFilter) return;
  const counts = new Map();
  records.forEach((record) => {
    const key = normalizedAdminFilterValue(record.motif_group_id || "");
    if (!key) return;
    const label = String(record.motif_group_label || "motif").trim() || "motif";
    const size = Number(record.motif_group_size) || 0;
    if (!counts.has(key)) counts.set(key, { key, label, count: 0, size });
    counts.get(key).count += 1;
    counts.get(key).size = Math.max(counts.get(key).size, size);
  });
  const options = [...counts.values()]
    .filter((option) => option.count > 1 || option.size > 1)
    .sort((first, second) => second.size - first.size || first.label.localeCompare(second.label, undefined, { sensitivity: "base" }));
  const available = new Set(["all", ...options.map((option) => option.key)]);
  if (!available.has(adminMotifFilterValue)) adminMotifFilterValue = "all";
  adminMotifFilter.textContent = "";
  const all = document.createElement("option");
  all.value = "all";
  all.textContent = options.length ? "all motifs" : "no linked motifs yet";
  adminMotifFilter.append(all);
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.key;
    item.textContent = `${option.label} (${option.size || option.count})`;
    adminMotifFilter.append(item);
  });
  adminMotifFilter.disabled = options.length === 0;
  adminMotifFilter.value = adminMotifFilterValue;
}

function activeAdvancedFilterLabel() {
  const parts = [];
  if (adminSortFilterValue !== "status-latest") parts.push(adminSortFilter?.selectedOptions?.[0]?.textContent || adminSortFilterValue);
  if (adminNeighborhoodFilterValue !== "all") parts.push(adminNeighborhoodFilter?.selectedOptions?.[0]?.textContent || adminNeighborhoodFilterValue);
  if (adminColorFilterValue !== "all") parts.push(adminColorFilter?.selectedOptions?.[0]?.textContent || adminColorFilterValue);
  if (adminTypeFilterValue !== "all") parts.push(adminTypeFilter?.selectedOptions?.[0]?.textContent || adminTypeFilterValue);
  if (adminMotifFilterValue !== "all") parts.push(adminMotifFilter?.selectedOptions?.[0]?.textContent || adminMotifFilterValue);
  return parts.length ? ` · ${parts.join(" · ")}` : "";
}

function editorRecordIndex() {
  const queuedRecords = editorState.reviewQueueIds
    .map((id) => adminRecords.find((record) => record.id === id))
    .filter(Boolean);
  const records = queuedRecords.length ? queuedRecords : filteredAdminRecords();
  const index = records.findIndex((record) => record.id === editorState.record?.id);
  return { records, index };
}

function updateEditorNavigation() {
  const { records, index } = editorRecordIndex();
  const hasRecord = index >= 0;
  const status = recordStatus(editorState.record);
  adminEditorPrev.disabled = !hasRecord || index <= 0;
  adminEditorNext.disabled = !hasRecord || index >= records.length - 1;
  adminEditorApprove.hidden = !hasRecord || status === "approved";
  adminEditorReject.hidden = !hasRecord || status === "rejected";
  adminEditorDelete.disabled = !hasRecord;
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
  window.clearTimeout(editorState.visualTimer);
  editorState.visualSearchToken += 1;
  await openEditor(next, cardForRecord(next), { preserveQueue: true });
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

    const contributor = document.createElement("span");
    contributor.className = "admin-card-contributor";
    contributor.textContent = `contributor: ${contributorLabel(record)}`;

    const status = document.createElement("span");
    status.className = "admin-status-pill";

    const motifButton = document.createElement("button");
    motifButton.type = "button";
    motifButton.className = "admin-motif-chip";
    motifButton.hidden = !record.motif_group_id;
    motifButton.textContent = record.motif_group_label
      ? `${record.motif_group_label} · ${record.motif_group_size || 2}`
      : "linked motif";
    motifButton.addEventListener("click", () => {
      adminMotifFilterValue = normalizedAdminFilterValue(record.motif_group_id);
      if (adminMotifFilter) adminMotifFilter.value = adminMotifFilterValue;
      renderRecords(adminRecords);
    });

    const moderationReason = document.createElement("p");
    moderationReason.className = "admin-moderation-reason";
    moderationReason.hidden = true;

    const mapLink = document.createElement("a");
    mapLink.href = googleMapsUrl(record);
    mapLink.target = "_blank";
    mapLink.rel = "noopener";
    mapLink.textContent = "map";

    const publicLink = document.createElement("a");
    publicLink.className = "admin-public-link";
    publicLink.href = publicRecordUrl(record);
    publicLink.target = "_blank";
    publicLink.rel = "noopener";
    publicLink.textContent = "website";

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
    rejectButton.addEventListener("click", () => openModerationDialog(record, card));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "admin-delete";
    deleteButton.textContent = "delete";
    deleteButton.addEventListener("click", () => deleteRecord(record, card));

    actions.append(editButton, approveButton, rejectButton, deleteButton);
    card.append(image, title, status, motifButton, moderationReason, meta, submissionDate, contributor, mapLink, publicLink, id, actions);
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
  const contributor = adminContributorFilterValue === "all"
    ? ""
    : ` · ${adminContributorFilter.selectedOptions[0]?.textContent || "selected contributor"}`;
  setAdminStatus(`${renderedRecordCount} / ${records.length} ${adminRecordFilter} contributions loaded${contributor}${activeAdvancedFilterLabel()} · ${adminRecords.length} total`);
  adminLoadMore.hidden = renderedRecordCount >= records.length;
}

function renderRecords(records, note = "") {
  adminRecords = sortAdminRecords(records);
  const counts = moderationCounts(adminRecords);
  if (!counts[adminRecordFilter] && counts.pending) adminRecordFilter = "pending";
  else if (!counts[adminRecordFilter] && adminRecordFilter !== "all") adminRecordFilter = "all";
  updateAdminFilters(adminRecords);
  updateContributorFilter(adminRecords);
  updateNeighborhoodFilter(adminRecords);
  updateMotifFilter(adminRecords);
  renderedRecordCount = 0;
  adminGrid.textContent = "";
  adminLoadMore.hidden = true;
  if (!adminRecords.length) {
    setAdminStatus(note || "no records returned by the database");
    return;
  }
  if (!filteredAdminRecords().length) {
    const contributor = adminContributorFilterValue === "all"
      ? ""
      : ` for ${adminContributorFilter.selectedOptions[0]?.textContent || "selected contributor"}`;
    setAdminStatus(`no ${adminRecordFilter} records${contributor}${activeAdvancedFilterLabel()} · ${adminRecords.length} total`);
    return;
  }
  renderNextRecordBatch(ADMIN_INITIAL_BATCH_SIZE);
  if (note) setAdminStatus(`${renderedRecordCount} / ${filteredAdminRecords().length} ${adminRecordFilter} contributions loaded${activeAdvancedFilterLabel()} · ${note}`);
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
    scheduleAdminColorAnalysis(data.records);
    renderRecords(data.records);
    const editId = requestedEditRecordId();
    if (editId) {
      const record = adminRecords.find((candidate) => candidate.id === editId);
      if (record) {
        setAdminPage("moderation", { replace: true });
        await openEditor(record, cardForRecord(record));
        clearRequestedEditRecordId();
      } else {
        setAdminStatus(`record ${editId} was not found in moderation`);
      }
    }
    return;
  }
  renderRecords([], "admin database returned 0 records");
}

async function deleteRecord(record, card = cardForRecord(record)) {
  if (!window.confirm(`delete ${record.title || record.id}?`)) return;
  const button = card?.querySelector(".admin-delete");
  if (button) {
    button.disabled = true;
    button.textContent = "deleting...";
  }
  if (editorState.record?.id === record.id) {
    adminEditorDelete.disabled = true;
    adminEditorDelete.textContent = "deleting...";
  }
  const response = await fetch("/api/records", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ id: record.id }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (button) {
      button.disabled = false;
      button.textContent = "delete";
    }
    if (editorState.record?.id === record.id) {
      adminEditorDelete.disabled = false;
      adminEditorDelete.textContent = "delete";
    }
    setAdminStatus(data.error || `delete failed ${response.status}`);
    return;
  }
  card?.remove();
  adminRecords = adminRecords.filter((candidate) => candidate.id !== record.id);
  renderRecords(adminRecords, `deleted ${data.deleted}`);
  loadAdminStats();
  if (editorState.record?.id === record.id) closeEditor();
}

function openModerationDialog(record, card) {
  editorState.moderationTarget = { record, card };
  adminModerationReason.value = "";
  adminModerationDetails.value = "";
  adminModerationStatus.textContent = "";
  adminModerationDialog.classList.add("is-open");
  adminModerationDialog.setAttribute("aria-hidden", "false");
}

function closeModerationDialog() {
  editorState.moderationTarget = null;
  adminModerationDialog.classList.remove("is-open");
  adminModerationDialog.setAttribute("aria-hidden", "true");
}

async function moderateRecord(record, card, moderationStatus, moderationReason = "") {
  const currentCard = card || cardForRecord(record);
  const button = currentCard?.querySelector(moderationStatus === "approved" ? ".admin-approve" : ".admin-reject");
  const editorButton = moderationStatus === "approved" ? adminEditorApprove : adminEditorReject;
  const activeInEditor = editorState.record?.id === record.id;
  if (button) {
    button.disabled = true;
    button.textContent = moderationStatus === "approved" ? "approving..." : "rejecting...";
  }
  if (activeInEditor) {
    editorButton.disabled = true;
    editorButton.textContent = moderationStatus === "approved" ? "approving..." : "rejecting...";
  }
  const response = await fetch("/api/records", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ id: record.id, moderation_status: moderationStatus, moderation_reason: moderationReason || null }),
  });
  const data = await response.json().catch(() => ({}));
  if (button) {
    button.disabled = false;
    button.textContent = moderationStatus === "approved" ? "approve" : "reject";
  }
  if (activeInEditor) {
    editorButton.disabled = false;
    editorButton.textContent = moderationStatus === "approved" ? "approve" : "reject";
  }
  if (!response.ok) {
    setAdminStatus(data.error || `moderation failed ${response.status}`);
    return;
  }
  Object.assign(record, data.record || {}, { moderation_status: moderationStatus });
  renderRecords(adminRecords, `${moderationStatus} ${record.id}`);
  loadAdminStats();
  if (editorState.record?.id === record.id) {
    editorState.card = cardForRecord(record);
    updateEditorNavigation();
  }
}

adminModerationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = editorState.moderationTarget;
  if (!target) return;
  const category = adminModerationReason.value;
  const details = adminModerationDetails.value.trim();
  if (!category) {
    adminModerationStatus.textContent = "choose a reason";
    return;
  }
  const reason = category === "other" ? details : [category, details].filter(Boolean).join(": ");
  if (!reason) {
    adminModerationStatus.textContent = "add a concise explanation";
    return;
  }
  adminModerationForm.querySelector('button[type="submit"]').disabled = true;
  await moderateRecord(target.record, target.card, "rejected", reason);
  adminModerationForm.querySelector('button[type="submit"]').disabled = false;
  if (recordStatus(target.record) === "rejected") closeModerationDialog();
});

adminModerationCancel.addEventListener("click", closeModerationDialog);

function loadEditorImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("source image could not be loaded"));
      return;
    }
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

function syncConditionControls() {
  const selected = new Set(editorState.record?.condition_codes || []);
  adminConditionCodes.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function selectedConditionCodes() {
  return [...adminConditionCodes.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
}

function fullSourceCropPoints() {
  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
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
  adminNearbyViewerRelation.value = "duplicate";
  adminNearbyViewerRelation.disabled = false;
  adminNearbyViewerEdit.disabled = false;
  adminNearbyViewerDuplicate.disabled = false;
  adminNearbyViewerDuplicate.textContent = "record relation";
  adminNearbyViewer.classList.add("is-open");
  adminNearbyViewer.setAttribute("aria-hidden", "false");
}

async function editNearbyViewerRecord() {
  const reference = editorState.record;
  const candidate = editorState.nearbyRecord;
  if (!reference || !candidate) return;
  adminNearbyViewerEdit.disabled = true;
  closeNearbyViewer();
  editorState.returnRecordIds.push(reference.id);
  const storedCandidate = adminRecords.find((record) => record.id === candidate.id) || candidate;
  if (!adminRecords.some((record) => record.id === storedCandidate.id)) adminRecords.push(storedCandidate);
  await openEditor(storedCandidate, cardForRecord(storedCandidate), { preserveQueue: true });
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

function renderVisualRecords(records, threshold) {
  adminVisualList.textContent = "";
  adminVisualStatus.textContent = records.length
    ? `${records.length} tile${records.length > 1 ? "s" : ""} at ${threshold}% or more`
    : `no visual match at ${threshold}% or more`;
  records.forEach((record) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-nearby-card";
    button.title = `${nearbySimilarityLabel(record)} · ${nearbyDistanceLabel(record)} · ${formatSubmissionDate(record.created_at)}`;
    const image = document.createElement("img");
    image.src = record.image_url;
    image.alt = record.title || "visually similar azulejo";
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
    adminVisualList.append(button);
  });
}

async function loadVisualRecords() {
  const record = editorState.record;
  if (!record || !adminVisualList || !adminVisualStatus) return;
  const token = editorState.visualSearchToken + 1;
  editorState.visualSearchToken = token;
  const threshold = Math.max(0, Math.min(Number(adminVisualThreshold.value) || 65, 100));
  adminVisualThresholdValue.value = `${threshold}%`;
  if (!similarityTools) {
    adminVisualStatus.textContent = "visual comparison unavailable";
    adminVisualList.textContent = "";
    return;
  }
  const candidates = adminRecords
    .filter((candidate) => candidate.id !== record.id && candidate.image_url)
    .map((candidate) => ({
      ...candidate,
      distance_m: recordDistanceFrom(record, candidate),
      fingerprint_was_stored: /^[01]{64}$/.test(candidate.image_fingerprint || ""),
    }));
  if (!candidates.length) {
    renderVisualRecords([], threshold);
    return;
  }
  adminVisualStatus.textContent = `comparing ${candidates.length} tile${candidates.length > 1 ? "s" : ""}...`;
  try {
    const rankedRecords = await similarityTools.scoreRecords(record, candidates, { maxImageLoads: 140 });
    if (editorState.record?.id !== record.id || editorState.visualSearchToken !== token) return;
    persistVisualFingerprints(record, rankedRecords).catch(() => {});
    renderVisualRecords(
      rankedRecords.filter((candidate) => Number.isFinite(candidate.visual_similarity) && candidate.visual_similarity >= threshold),
      threshold,
    );
  } catch (error) {
    if (editorState.record?.id === record.id && editorState.visualSearchToken === token) {
      adminVisualStatus.textContent = error.message || "visual comparison failed";
      adminVisualList.textContent = "";
    }
  }
}

async function loadNearbyRecords() {
  const record = editorState.record;
  if (!record) return;
  editorState.nearbyController?.abort();
  const controller = new AbortController();
  editorState.nearbyController = controller;
  const radius = Number(adminNearbyRadius.value) || 150;
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

async function openEditor(record, card, options = {}) {
  adminEditor.classList.add("is-open");
  adminEditor.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  adminEditorMeta.textContent = `${formatSubmissionDate(record.created_at)} · ${record.id}`;
  adminEditorStatus.textContent = "loading source...";
  adminEditorSave.disabled = true;
  adminEditorSave.textContent = "save treatment";
  adminEditorApprove.disabled = false;
  adminEditorApprove.textContent = "approve";
  adminEditorReject.disabled = false;
  adminEditorReject.textContent = "reject";
  adminEditorDelete.disabled = false;
  adminEditorDelete.textContent = "delete";
  if (!options.preserveQueue) {
    const queue = filteredAdminRecords();
    editorState.reviewQueueIds = queue.some((candidate) => candidate.id === record.id)
      ? queue.map((candidate) => candidate.id)
      : [record.id];
  }
  editorState.record = record;
  editorState.card = card;
  updateEditorNavigation();
  const nearbyRadius = recommendedNearbyRadius(record);
  adminNearbyRadius.value = String(nearbyRadius);
  adminNearbyRadiusValue.value = `${nearbyRadius} m`;
  adminNearbyList.textContent = "";
  adminVisualThreshold.value = adminVisualThreshold.value || "65";
  adminVisualThresholdValue.value = `${adminVisualThreshold.value}%`;
  adminVisualList.textContent = "";
  syncConditionControls();
  loadNearbyRecords();
  loadVisualRecords();
  try {
    let image = null;
    let usesOriginalSource = false;
    let originalLoadError = null;
    if (record.original_image_url) {
      try {
        image = await loadEditorImage(record.original_image_url);
        usesOriginalSource = true;
      } catch (error) {
        originalLoadError = error;
      }
    }
    if (!image) image = await loadEditorImage(record.image_url);
    const defaultInset = usesOriginalSource ? 0.09 : 0;
    const points = imageTools.normalizePoints(record.crop_points, defaultInset);
    editorState.image = image;
    editorState.usesOriginalSource = usesOriginalSource;
    editorState.points = points;
    editorState.initialPoints = points.map((point) => ({ ...point }));
    editorState.settings = imageTools.normalizeSettings(record.edit_settings);
    editorState.whitePoint = record.edit_settings?.whitePoint || null;
    if (editorState.whitePoint) editorState.settings.whitePoint = { ...editorState.whitePoint };
    setWhitePointMode(false);
    adminRecoverBorder.disabled = !usesOriginalSource;
    syncAdjustmentControls();
    scheduleEditorRender();
    adminEditorStatus.textContent = usesOriginalSource
      ? "editing from original source"
      : originalLoadError
        ? "original source could not be loaded; editing published image only"
        : "published image only";
    adminEditorSave.disabled = false;
    updateEditorNavigation();
  } catch (error) {
    editorState.usesOriginalSource = false;
    adminEditorStatus.textContent = error.message;
    updateEditorNavigation();
  }
}

function stopEditorAsyncWork() {
  hidePointMagnifier();
  closeNearbyViewer();
  editorState.nearbyController?.abort();
  window.clearTimeout(editorState.nearbyTimer);
  window.clearTimeout(editorState.visualTimer);
  editorState.visualSearchToken += 1;
  if (adminVisualList) adminVisualList.textContent = "";
}

function closeEditor() {
  stopEditorAsyncWork();
  const returnRecordId = editorState.returnRecordIds.pop();
  if (returnRecordId) {
    const returnRecord = adminRecords.find((record) => record.id === returnRecordId);
    if (returnRecord) {
      openEditor(returnRecord, cardForRecord(returnRecord), { preserveQueue: true });
      return;
    }
  }
  adminEditor.classList.remove("is-open");
  adminEditor.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  editorState.record = null;
  editorState.card = null;
  editorState.image = null;
  editorState.reviewQueueIds = [];
  editorState.returnRecordIds = [];
  editorState.draggedPoint = null;
  editorState.whitePoint = null;
  setWhitePointMode(false);
}

function clampNumber(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function beginEditorResize(kind, event) {
  if (window.matchMedia("(max-width: 680px)").matches) return;
  const workspaceRect = adminEditor.querySelector(".admin-editor-workspace").getBoundingClientRect();
  editorState.resizeTarget = {
    kind,
    startX: event.clientX,
    startY: event.clientY,
    workspaceWidth: workspaceRect.width,
    workspaceHeight: workspaceRect.height,
    sourceWidth: adminEditor.style.getPropertyValue("--admin-source-width"),
    previewWidth: adminEditor.style.getPropertyValue("--admin-preview-width"),
  };
  adminEditor.classList.add("is-resizing");
  event.currentTarget.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function resizeEditorPanels(event) {
  const target = editorState.resizeTarget;
  if (!target) return;
  if (target.kind === "workspace") {
    const nextHeight = clampNumber(target.workspaceHeight + event.clientY - target.startY, 320, window.innerHeight - 230);
    adminEditor.style.setProperty("--admin-editor-workspace-height", `${Math.round(nextHeight)}px`);
  } else {
    const minimum = 260;
    const maximum = Math.max(minimum, target.workspaceWidth - 360);
    const currentValue = target.kind === "source" ? target.sourceWidth : target.previewWidth;
    const fallback = target.kind === "source"
      ? adminSourceCanvas.getBoundingClientRect().width
      : adminPreviewCanvas.getBoundingClientRect().width;
    const currentWidth = Number.parseFloat(currentValue) || fallback;
    const nextWidth = clampNumber(currentWidth + event.clientX - target.startX, minimum, maximum);
    adminEditor.style.setProperty(target.kind === "source" ? "--admin-source-width" : "--admin-preview-width", `${Math.round(nextWidth)}px`);
  }
  scheduleEditorRender();
}

function endEditorResize(event) {
  if (!editorState.resizeTarget) return;
  event.target.releasePointerCapture?.(event.pointerId);
  editorState.resizeTarget = null;
  adminEditor.classList.remove("is-resizing");
}

function canvasContentRect(canvas) {
  const rect = canvas.getBoundingClientRect();
  const style = window.getComputedStyle ? window.getComputedStyle(canvas) : null;
  const borderLeft = Number.parseFloat(style?.borderLeftWidth || "0") || 0;
  const borderTop = Number.parseFloat(style?.borderTopWidth || "0") || 0;
  const borderRight = Number.parseFloat(style?.borderRightWidth || "0") || 0;
  const borderBottom = Number.parseFloat(style?.borderBottomWidth || "0") || 0;
  return {
    left: rect.left + borderLeft,
    top: rect.top + borderTop,
    width: Math.max(1, rect.width - borderLeft - borderRight),
    height: Math.max(1, rect.height - borderTop - borderBottom),
  };
}

function sourcePointerPosition(event) {
  const rect = canvasContentRect(adminSourceCanvas);
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

function hidePointMagnifier() {
  if (!adminPointMagnifier) return;
  adminPointMagnifier.hidden = true;
}

function positionPointMagnifier(event) {
  if (!adminPointMagnifier) return;
  const size = 180;
  const margin = 14;
  const preferredLeft = event.clientX + 22;
  const preferredTop = event.clientY - size - 22;
  const fallbackLeft = event.clientX - size - 22;
  const fallbackTop = event.clientY + 22;
  const left = preferredLeft + size + margin <= window.innerWidth
    ? preferredLeft
    : Math.max(margin, fallbackLeft);
  const top = preferredTop >= margin
    ? preferredTop
    : Math.min(window.innerHeight - size - margin, fallbackTop);
  adminPointMagnifier.style.left = `${Math.round(left)}px`;
  adminPointMagnifier.style.top = `${Math.round(Math.max(margin, top))}px`;
}

function drawPointMagnifier(position, event) {
  const { image } = editorState;
  if (!image || !adminPointMagnifier || !adminPointMagnifierCanvas) return;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const context = adminPointMagnifierCanvas.getContext("2d");
  if (!context) return;
  const outputSize = adminPointMagnifierCanvas.width;
  const cropSize = Math.max(54, Math.min(126, Math.min(sourceWidth, sourceHeight) / 10));
  const sourceX = Math.max(0, Math.min(sourceWidth, position.x * sourceWidth));
  const sourceY = Math.max(0, Math.min(sourceHeight, position.y * sourceHeight));
  const sourceLeft = Math.max(0, sourceX - cropSize / 2);
  const sourceTop = Math.max(0, sourceY - cropSize / 2);
  const sourceRight = Math.min(sourceWidth, sourceX + cropSize / 2);
  const sourceBottom = Math.min(sourceHeight, sourceY + cropSize / 2);
  const sampleWidth = Math.max(1, sourceRight - sourceLeft);
  const sampleHeight = Math.max(1, sourceBottom - sourceTop);
  const scale = outputSize / cropSize;
  const destinationX = outputSize / 2 - (sourceX - sourceLeft) * scale;
  const destinationY = outputSize / 2 - (sourceY - sourceTop) * scale;
  context.clearRect(0, 0, outputSize, outputSize);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(
    image,
    sourceLeft,
    sourceTop,
    sampleWidth,
    sampleHeight,
    destinationX,
    destinationY,
    sampleWidth * scale,
    sampleHeight * scale,
  );
  const center = outputSize / 2;
  context.save();
  context.strokeStyle = "rgba(255, 231, 106, 0.92)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(center - 28, center);
  context.lineTo(center + 28, center);
  context.moveTo(center, center - 28);
  context.lineTo(center, center + 28);
  context.stroke();
  context.strokeStyle = "#111";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(center, center, 8, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  positionPointMagnifier(event);
  adminPointMagnifier.hidden = false;
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
  drawPointMagnifier(position, event);
  markEditorDirty();
  scheduleEditorRender();
});

adminSourceCanvas.addEventListener("pointermove", (event) => {
  if (editorState.draggedPoint === null) return;
  const position = sourcePointerPosition(event);
  editorState.points[editorState.draggedPoint] = position;
  drawPointMagnifier(position, event);
  markEditorDirty();
  scheduleEditorRender();
});

const stopPointDrag = () => {
  editorState.draggedPoint = null;
  hidePointMagnifier();
};
adminSourceCanvas.addEventListener("pointerup", stopPointDrag);
adminSourceCanvas.addEventListener("pointercancel", stopPointDrag);
adminSourceResizer.addEventListener("pointerdown", (event) => beginEditorResize("source", event));
adminPreviewResizer.addEventListener("pointerdown", (event) => beginEditorResize("preview", event));
adminWorkspaceResizer.addEventListener("pointerdown", (event) => beginEditorResize("workspace", event));
window.addEventListener("pointermove", resizeEditorPanels);
window.addEventListener("pointerup", endEditorResize);
window.addEventListener("pointercancel", endEditorResize);

adminAdjustments.querySelectorAll('input[type="range"]').forEach((input) => {
  input.addEventListener("input", () => {
    editorState.settings[input.name] = Number(input.value);
    input.closest("label").querySelector("output").value = input.value;
    markEditorDirty();
    scheduleEditorRender();
  });
});

adminConditionCodes.querySelectorAll('input[type="checkbox"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (input.value === "unknown" && input.checked) {
      adminConditionCodes.querySelectorAll('input[type="checkbox"]').forEach((candidate) => {
        if (candidate !== input) candidate.checked = false;
      });
    } else if (input.checked) {
      const unknown = adminConditionCodes.querySelector('input[value="unknown"]');
      if (unknown) unknown.checked = false;
    }
    markEditorDirty();
  });
});

adminRecoverBorder.addEventListener("click", () => {
  if (!editorState.usesOriginalSource) {
    adminEditorStatus.textContent = "no source margin available";
    return;
  }
  editorState.points = fullSourceCropPoints();
  adminEditorStatus.textContent = "full original source recovered";
  markEditorDirty();
  scheduleEditorRender();
});

adminResetCrop.addEventListener("click", () => {
  editorState.points = editorState.usesOriginalSource
    ? fullSourceCropPoints()
    : editorState.initialPoints.map((point) => ({ ...point }));
  adminEditorStatus.textContent = editorState.usesOriginalSource
    ? "crop reset to full original source"
    : "crop reset";
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

adminVisualThreshold.addEventListener("input", () => {
  adminVisualThresholdValue.value = `${adminVisualThreshold.value}%`;
  window.clearTimeout(editorState.visualTimer);
  editorState.visualTimer = window.setTimeout(loadVisualRecords, 220);
});

adminNearbyViewerClose.addEventListener("click", closeNearbyViewer);
adminNearbyViewerEdit.addEventListener("click", () => {
  editNearbyViewerRecord().catch((error) => {
    adminNearbyViewerMeta.textContent = error.message;
    adminNearbyViewerEdit.disabled = false;
  });
});

adminNearbyViewerDuplicate.addEventListener("click", async () => {
  const reference = editorState.record;
  const candidate = editorState.nearbyRecord;
  if (!reference || !candidate) return;
  const relation = adminNearbyViewerRelation.value;
  adminNearbyViewerDuplicate.disabled = true;
  adminNearbyViewerRelation.disabled = true;
  adminNearbyViewerDuplicate.textContent = "recording...";
  try {
    const response = await fetch("/api/records", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        id: reference.id,
        relatedId: candidate.id,
        relationAction: relation === "duplicate" ? "attach-observation" : "review-relation",
        relation,
        score: Number.isFinite(candidate.visual_similarity) ? candidate.visual_similarity / 100 : null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `duplicate relation failed ${response.status}`);
    adminNearbyViewerDuplicate.textContent = relation === "duplicate" ? "observation attached" : "relation recorded";
  } catch (error) {
    adminNearbyViewerDuplicate.disabled = false;
    adminNearbyViewerRelation.disabled = false;
    adminNearbyViewerDuplicate.textContent = "record relation";
    adminNearbyViewerMeta.textContent = error.message;
  }
});

adminEditorPrev.addEventListener("click", () => openEditorAdjacent(-1));
adminEditorNext.addEventListener("click", () => openEditorAdjacent(1));
adminEditorApprove.addEventListener("click", () => {
  if (!editorState.record) return;
  moderateRecord(editorState.record, cardForRecord(editorState.record), "approved");
});
adminEditorReject.addEventListener("click", () => {
  if (!editorState.record) return;
  openModerationDialog(editorState.record, cardForRecord(editorState.record));
});
adminEditorDelete.addEventListener("click", () => {
  if (!editorState.record) return;
  deleteRecord(editorState.record, cardForRecord(editorState.record));
});

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
    const colorMetadata = adminColorMetadataFromCanvas(output);
    const response = await fetch("/api/records", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        id: editorState.record.id,
        imageData,
        image_fingerprint: imageFingerprint,
        dominant_color: colorMetadata?.dominant || null,
        color_metadata: colorMetadata,
        condition_codes: selectedConditionCodes(),
        crop_points: editorState.usesOriginalSource ? editorState.points : null,
        edit_settings: editorState.usesOriginalSource ? editorState.settings : imageTools.normalizeSettings(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `save failed ${response.status}`);
    const sourceBeforeSave = {
      original_image_url: editorState.record.original_image_url || null,
      original_image_path: editorState.record.original_image_path || null,
      original_image_bucket: editorState.record.original_image_bucket || null,
    };
    Object.assign(editorState.record, data.record || {});
    if (!editorState.record.original_image_url && sourceBeforeSave.original_image_url) {
      editorState.record.original_image_url = sourceBeforeSave.original_image_url;
    }
    if (!editorState.record.original_image_path && sourceBeforeSave.original_image_path) {
      editorState.record.original_image_path = sourceBeforeSave.original_image_path;
    }
    if (!editorState.record.original_image_bucket && sourceBeforeSave.original_image_bucket) {
      editorState.record.original_image_bucket = sourceBeforeSave.original_image_bucket;
    }
    const cardImage = editorState.card?.querySelector("img");
    if (cardImage) cardImage.src = editorState.record.image_url;
    if (editorState.record.dominant_color) adminColorCache.set(editorState.record.id, editorState.record.dominant_color);
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
    if (adminModerationDialog.classList.contains("is-open")) closeModerationDialog();
    else if (adminNearbyViewer.classList.contains("is-open")) closeNearbyViewer();
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
    adminAuthChecked = true;
    adminPasswordInput.value = "";
    showAdminTools();
    await Promise.all([loadRecords(), loadAdminStats(), loadAdminMembers(), refreshAdminAccountState()]);
  } catch (error) {
    adminAuthenticated = false;
    adminAuthChecked = true;
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
  adminAuthChecked = true;
  adminGrid.textContent = "";
  showAdminTools();
});

adminRefreshButton.addEventListener("click", () => {
  Promise.all([loadRecords(), loadAdminStats(), loadAdminMembers()]).catch((error) => setAdminStatus(error.message));
});

adminMembersRefresh.addEventListener("click", () => {
  loadAdminMembers().catch((error) => {
    adminMembersStatus.textContent = error.message;
  });
});

adminFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  adminRecordFilter = button.dataset.filter;
  renderRecords(adminRecords);
});

adminContributorFilter.addEventListener("change", () => {
  adminContributorFilterValue = adminContributorFilter.value || "all";
  renderRecords(adminRecords);
});

[adminSortFilter, adminNeighborhoodFilter, adminColorFilter, adminTypeFilter, adminMotifFilter].forEach((filter) => {
  filter?.addEventListener("change", () => {
    adminSortFilterValue = adminSortFilter?.value || "status-latest";
    adminNeighborhoodFilterValue = adminNeighborhoodFilter?.value || "all";
    adminColorFilterValue = adminColorFilter?.value || "all";
    adminTypeFilterValue = adminTypeFilter?.value || "all";
    adminMotifFilterValue = adminMotifFilter?.value || "all";
    renderRecords(adminRecords);
  });
});

adminLoadMore.addEventListener("click", () => renderNextRecordBatch());

adminPageLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    setAdminPage(link.dataset.adminPageLink);
  });
});

window.addEventListener("hashchange", () => {
  if (adminAuthenticated) setAdminPage(pageFromHash() || "moderation", { hash: false });
});

localStorage.removeItem("open-azulejos-admin-key");
showAdminTools();

async function bootstrapAdminSession() {
  try {
    let response = await fetch("/api/admin-session", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) {
      response = await fetch("/api/admin-account", { credentials: "same-origin", cache: "no-store" });
    }
    adminAuthenticated = response.ok;
    adminAuthChecked = true;
    showAdminTools();
    if (response.ok) {
      await Promise.all([loadRecords(), loadAdminStats(), loadAdminMembers(), refreshAdminAccountState()]);
    }
  } catch (error) {
    adminAuthenticated = false;
    adminAuthChecked = true;
    showAdminTools();
    adminAccountLoginStatus.textContent = error.message;
  }
}

bootstrapAdminSession();
