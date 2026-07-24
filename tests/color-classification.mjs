import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  dominantFamilyFromPixels,
  familyFromRgb,
  metadataFromPixels,
} = require("../color-classification.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pixels(colors) {
  return new Uint8ClampedArray(colors.flatMap((color) => [...color, 255]));
}

assert(familyFromRgb(75, 188, 190) === "green", "turquoise should belong to the green family");
assert(familyFromRgb(40, 100, 200) === "blue", "blue should remain in the blue family");
assert(familyFromRgb(180, 45, 155) === "red", "magenta should map to the nearest available red family");
assert(
  !["multicolor"].includes(familyFromRgb(75, 188, 190)),
  "a single RGB colour must never be classified as multicolor",
);

const turquoiseTile = pixels([
  ...Array.from({ length: 8 }, () => [75, 188, 190]),
  [22, 24, 28],
  [120, 125, 126],
]);
assert(
  dominantFamilyFromPixels(turquoiseTile, 4) === "green",
  "a predominantly turquoise tile should be green",
);
assert(
  metadataFromPixels(turquoiseTile, "test").dominant === "green",
  "stored metadata should use the same dominant family",
);

const trulyMulticolor = pixels([
  [200, 20, 20],
  [200, 20, 20],
  [20, 170, 70],
  [20, 170, 70],
  [20, 70, 200],
  [20, 70, 200],
]);
assert(
  dominantFamilyFromPixels(trulyMulticolor, 4) === "multicolor",
  "balanced red, green and blue pixels should remain multicolor",
);

console.log("color classification tests passed");
