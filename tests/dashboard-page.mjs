import fs from "node:fs";
import vm from "node:vm";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const source = fs.readFileSync(new URL("../dashboard.js", import.meta.url), "utf8");

function createElement(id) {
  const listeners = {};
  const classes = new Set();
  return {
    id,
    hidden: false,
    disabled: false,
    value: "",
    textContent: "",
    style: {
      display: "",
      setProperty() {},
    },
    classList: {
      toggle(name, force) {
        const active = force === undefined ? !classes.has(name) : Boolean(force);
        if (active) classes.add(name);
        else classes.delete(name);
        return active;
      },
    },
    append(...children) {
      this.children = children;
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    listeners,
  };
}

const elements = new Map();
const element = (selector) => {
  if (!elements.has(selector)) elements.set(selector, createElement(selector));
  return elements.get(selector);
};

element("#dashboardEmail").value = "orson@openazulejos.com";
element("#dashboardPassword").value = "valid-password";

const fetchCalls = [];
const context = {
  console,
  Intl,
  Date,
  Number,
  Math,
  URLSearchParams,
  document: {
    documentElement: { style: { setProperty() {} } },
    querySelector: element,
    createElement: (tag) => createElement(tag),
  },
  window: {
    scrollY: 0,
    addEventListener() {},
  },
  fetch: async (url, options = {}) => {
    fetchCalls.push({ url: String(url), method: options.method || "GET" });
    if (String(url) === "/api/admin-session") {
      return { ok: false, status: 401, json: async () => ({ authenticated: false }) };
    }
    if (String(url) === "/api/admin-account" && options.method === "POST") {
      return { ok: true, status: 200, json: async () => ({ authenticated: true }) };
    }
    if (String(url).startsWith("/api/admin-stats")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          launch: { startedAt: "2026-07-04T00:00:00.000Z" },
          metrics: {
            newContributors: 3,
            publishedSinceBeta: 8,
            submissionsSinceBeta: 13,
            pendingNow: 2,
            approvalRate: 72,
            activeContributors: 4,
            submissionsLast24Hours: 5,
            guestSubmissions: 1,
            totalPublished: 109,
            totalContributors: 6,
            latestSubmissionAt: "2026-07-04T13:00:00.000Z",
          },
          daily: [{ date: "2026-07-04", submitted: 13, approved: 8 }],
        }),
      };
    }
    throw new Error(`unexpected fetch ${url}`);
  },
};

vm.runInNewContext(source, context, { filename: "dashboard.js" });
await Promise.resolve();
await element("#dashboardAccountLogin").listeners.submit({ preventDefault() {} });

assert(element("#dashboardLoginPanel").hidden === true, "dashboard login should hide after successful admin login");
assert(element("#dashboardContent").hidden === false, "dashboard content should show after successful admin login");
assert(element("#dashboardNewContributors").textContent === "3", "dashboard should render contributor count");
assert(element("#dashboardPublished").textContent === "8", "dashboard should render published count");
assert(fetchCalls.some((call) => call.url.startsWith("/api/admin-stats")), "dashboard should request admin stats");

console.log("dashboard page tests passed");
