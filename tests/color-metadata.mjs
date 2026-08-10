import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizedColorMetadata } = require("../api/_color-metadata.js");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const captured = normalizedColorMetadata({
  dominant_color: "blue",
  color_metadata: { dominant: "blue", families: { blue: 0.8, grey: 0.2 }, source: "capture" },
});
assert(captured.dominant === "blue", "valid dominant color should be retained");
assert(captured.metadata.source === "capture", "capture source should be retained");
assert(captured.metadata.families.blue === 0.8, "family proportions should be retained");
assert(Boolean(captured.metadata.analyzed_at), "server should add an analysis timestamp");

const unsafeSource = normalizedColorMetadata({
  dominant_color: "green",
  color_metadata: { source: "untrusted-source" },
}, "admin-approval");
assert(unsafeSource.metadata.source === "admin-approval", "unknown sources should use the trusted default");
assert(normalizedColorMetadata({ dominant_color: "orange" }) === null, "unknown colors should be rejected");

console.log("color metadata tests passed");
