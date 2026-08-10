const loginPanel = document.querySelector("#dashboardLoginPanel");
const content = document.querySelector("#dashboardContent");
const accountLogin = document.querySelector("#dashboardAccountLogin");
const emailInput = document.querySelector("#dashboardEmail");
const passwordInput = document.querySelector("#dashboardPassword");
const loginButton = document.querySelector("#dashboardLoginButton");
const loginStatus = document.querySelector("#dashboardLoginStatus");
const keyLogin = document.querySelector("#dashboardKeyLogin");
const keyInput = document.querySelector("#dashboardAdminKey");
const keyButton = document.querySelector("#dashboardKeyButton");
const keyStatus = document.querySelector("#dashboardKeyStatus");
const refreshButton = document.querySelector("#dashboardRefreshButton");
const lockButton = document.querySelector("#dashboardLockButton");
const refreshIndicator = document.querySelector("#dashboardRefreshIndicator");
const statusText = document.querySelector("#dashboardStatus");
const periodText = document.querySelector("#dashboardPeriod");
const activityChart = document.querySelector("#dashboardActivityChart");
const trafficChart = document.querySelector("#dashboardTrafficChart");

const fields = {
  newContributors: document.querySelector("#dashboardNewContributors"),
  publishedSinceBeta: document.querySelector("#dashboardPublished"),
  submissionsSinceBeta: document.querySelector("#dashboardSubmissions"),
  pendingNow: document.querySelector("#dashboardPending"),
  approvalRate: document.querySelector("#dashboardApprovalRate"),
  activeContributors: document.querySelector("#dashboardActiveContributors"),
  submissionsLast24Hours: document.querySelector("#dashboardLast24Hours"),
  guestSubmissions: document.querySelector("#dashboardGuestSubmissions"),
  totalPublished: document.querySelector("#dashboardTotalPublished"),
  totalContributors: document.querySelector("#dashboardTotalContributors"),
  latestSubmissionAt: document.querySelector("#dashboardLatestSubmission"),
  pageViews: document.querySelector("#dashboardPageViews"),
  viewsToday: document.querySelector("#dashboardViewsToday"),
  topSource: document.querySelector("#dashboardTopSource"),
  trafficStartedAt: document.querySelector("#dashboardTrafficStarted"),
};

let authenticated = false;
let refreshInFlight = false;
let touchStartY = null;
let pullDistance = 0;

function setVisible(element, visible) {
  if (!element) return;
  element.hidden = !visible;
  element.style.display = visible ? "" : "none";
}

function setAuthenticated(value) {
  authenticated = value;
  setVisible(loginPanel, !value);
  setVisible(content, value);
}

function setField(element, value) {
  if (element) element.textContent = value;
}

function formatDate(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-BE", {
    dateStyle: options.dateStyle || "medium",
    timeStyle: options.timeStyle,
    timeZone: "Europe/Lisbon",
  }).format(date);
}

function numberText(value) {
  return new Intl.NumberFormat("fr-BE").format(Number(value) || 0);
}

function renderActivity(days) {
  if (!activityChart) return;
  activityChart.textContent = "";
  const maximum = Math.max(1, ...days.map((day) => Number(day.submitted) || 0));
  days.forEach((day) => {
    const row = document.createElement("article");
    row.className = "dashboard-activity-row";
    const time = document.createElement("time");
    time.dateTime = day.date;
    time.textContent = day.date?.slice(5).replace("-", "/") || "—";
    const track = document.createElement("div");
    track.className = "dashboard-activity-track";
    const submitted = document.createElement("span");
    submitted.className = "dashboard-activity-submitted";
    submitted.style.width = `${((Number(day.submitted) || 0) / maximum) * 100}%`;
    const approved = document.createElement("span");
    approved.className = "dashboard-activity-approved";
    approved.style.width = `${((Number(day.approved) || 0) / maximum) * 100}%`;
    const count = document.createElement("strong");
    count.textContent = numberText(day.submitted);
    track.append(submitted, approved);
    row.append(time, track, count);
    activityChart.append(row);
  });
}

function renderTraffic(days) {
  if (!trafficChart) return;
  trafficChart.textContent = "";
  const maximum = Math.max(1, ...days.map((day) => Number(day.views) || 0));
  days.forEach((day) => {
    const row = document.createElement("article");
    row.className = "dashboard-activity-row";
    const time = document.createElement("time");
    time.dateTime = day.date;
    time.textContent = day.date?.slice(5).replace("-", "/") || "—";
    const track = document.createElement("div");
    track.className = "dashboard-activity-track";
    const views = document.createElement("span");
    views.className = "dashboard-traffic-views";
    views.style.width = `${((Number(day.views) || 0) / maximum) * 100}%`;
    const count = document.createElement("strong");
    count.textContent = numberText(day.views);
    track.append(views);
    row.append(time, track, count);
    trafficChart.append(row);
  });
}

async function loadStats({ pulled = false } = {}) {
  if (!authenticated || refreshInFlight) return false;
  refreshInFlight = true;
  if (refreshButton) refreshButton.disabled = true;
  setField(statusText, pulled ? "refreshing..." : "loading stats...");
  try {
    const response = await fetch(`/api/admin-stats?fresh=${Date.now()}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `stats failed ${response.status}`);
    const metrics = data.metrics || {};
    const traffic = data.traffic || {};
    setField(periodText, `since ${formatDate(data.launch?.startedAt) || "beta launch"}`);
    setField(fields.newContributors, numberText(metrics.newContributors));
    setField(fields.publishedSinceBeta, numberText(metrics.publishedSinceBeta));
    setField(fields.submissionsSinceBeta, numberText(metrics.submissionsSinceBeta));
    setField(fields.pendingNow, numberText(metrics.pendingNow));
    setField(fields.approvalRate, metrics.approvalRate === null || metrics.approvalRate === undefined ? "—" : `${metrics.approvalRate}%`);
    setField(fields.activeContributors, numberText(metrics.activeContributors));
    setField(fields.submissionsLast24Hours, numberText(metrics.submissionsLast24Hours));
    setField(fields.guestSubmissions, numberText(metrics.guestSubmissions));
    setField(fields.totalPublished, numberText(metrics.totalPublished));
    setField(fields.totalContributors, numberText(metrics.totalContributors));
    setField(fields.latestSubmissionAt, formatDate(metrics.latestSubmissionAt, { dateStyle: "short", timeStyle: "short" }) || "—");
    setField(fields.pageViews, numberText(traffic.totalPageViews));
    setField(fields.viewsToday, numberText(traffic.todayPageViews));
    setField(fields.topSource, traffic.topSource || "—");
    setField(fields.trafficStartedAt, traffic.trackingStartedAt ? formatDate(traffic.trackingStartedAt) : "—");
    renderActivity(Array.isArray(data.daily) ? data.daily : []);
    renderTraffic(Array.isArray(traffic.daily) ? traffic.daily : []);
    setField(statusText, `updated ${formatDate(new Date(), { timeStyle: "short" })}`);
    return true;
  } catch (error) {
    setField(statusText, error.message || "dashboard stats unavailable");
    return false;
  } finally {
    refreshInFlight = false;
    if (refreshButton) refreshButton.disabled = false;
    resetPullIndicator();
  }
}

async function signInWithPassword(event) {
  event.preventDefault();
  loginButton.disabled = true;
  loginButton.textContent = "opening...";
  loginStatus.textContent = "";
  try {
    const response = await fetch("/api/admin-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        action: "sign-in",
        email: emailInput.value.trim(),
        password: passwordInput.value,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `login failed ${response.status}`);
    passwordInput.value = "";
    setAuthenticated(true);
    await loadStats();
  } catch (error) {
    setAuthenticated(false);
    loginStatus.textContent = error.message;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "open dashboard";
  }
}

async function signInWithKey(event) {
  event.preventDefault();
  const key = keyInput.value.trim();
  if (!key) return;
  keyButton.disabled = true;
  keyButton.textContent = "opening...";
  keyStatus.textContent = "";
  try {
    const response = await fetch("/api/admin-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ key }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `login failed ${response.status}`);
    keyInput.value = "";
    setAuthenticated(true);
    await loadStats();
  } catch (error) {
    setAuthenticated(false);
    keyStatus.textContent = error.message === "invalid admin key" ? "invalid admin key" : error.message;
  } finally {
    keyButton.disabled = false;
    keyButton.textContent = "open";
  }
}

function resetPullIndicator() {
  pullDistance = 0;
  if (!refreshIndicator) return;
  refreshIndicator.className = "dashboard-refresh-indicator";
  refreshIndicator.textContent = "pull to refresh";
  document.documentElement.style.setProperty("--dashboard-pull", "0px");
}

function updatePullIndicator(distance) {
  if (!refreshIndicator) return;
  pullDistance = Math.max(0, Math.min(110, distance));
  const ready = pullDistance > 76;
  refreshIndicator.classList.toggle("is-visible", pullDistance > 8);
  refreshIndicator.classList.toggle("is-ready", ready);
  refreshIndicator.textContent = ready ? "release to refresh" : "pull to refresh";
  document.documentElement.style.setProperty("--dashboard-pull", `${pullDistance * 0.45}px`);
}

window.addEventListener("touchstart", (event) => {
  if (!authenticated || window.scrollY > 0 || refreshInFlight) return;
  touchStartY = event.touches[0]?.clientY ?? null;
}, { passive: true });

window.addEventListener("touchmove", (event) => {
  if (touchStartY === null) return;
  const y = event.touches[0]?.clientY ?? touchStartY;
  const distance = y - touchStartY;
  if (distance <= 0) return;
  updatePullIndicator(distance);
}, { passive: true });

window.addEventListener("touchend", () => {
  if (touchStartY === null) return;
  const shouldRefresh = pullDistance > 76;
  touchStartY = null;
  if (shouldRefresh) loadStats({ pulled: true });
  else resetPullIndicator();
}, { passive: true });

accountLogin.addEventListener("submit", signInWithPassword);
keyLogin.addEventListener("submit", signInWithKey);
refreshButton.addEventListener("click", () => loadStats());
lockButton.addEventListener("click", async () => {
  await fetch("/api/admin-session", { method: "DELETE", credentials: "same-origin" }).catch(() => {});
  setAuthenticated(false);
});

setAuthenticated(false);
fetch("/api/admin-session", { credentials: "same-origin", cache: "no-store" })
  .then((response) => {
    if (!response.ok) return;
    setAuthenticated(true);
    return loadStats();
  })
  .catch((error) => {
    loginStatus.textContent = error.message;
  });
