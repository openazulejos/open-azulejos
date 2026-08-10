import fs from "node:fs";

const html = fs.readFileSync(new URL("../admin.html", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../admin.js", import.meta.url), "utf8");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

[
  "adminStatsPageViews",
  "adminStatsViewsToday",
  "adminStatsTopSource",
  "adminStatsTrackingStarted",
  "adminTrafficChart",
].forEach((id) => {
  assert(html.includes(`id="${id}"`), `admin statistics should include ${id}`);
  assert(source.includes(`#${id}`), `admin script should bind ${id}`);
});

assert(html.includes("site traffic · last 7 days"), "admin should display the seven-day traffic chart");
assert(source.includes("traffic.totalPageViews"), "admin should render aggregate page views");
assert(source.includes("renderTrafficChart"), "admin should render daily traffic data");

console.log("admin dashboard traffic tests passed");
