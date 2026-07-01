import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../admin-image.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "admin-image.js" });
const tools = context.window.AdminImageTools;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function near(actual, expected, tolerance = 1e-8) {
  return Math.abs(actual - expected) <= tolerance;
}

const quadrilateral = [
  { x: 0.12, y: 0.08 },
  { x: 0.91, y: 0.16 },
  { x: 0.83, y: 0.94 },
  { x: 0.06, y: 0.82 },
];
const coefficients = tools.projectiveCoefficients(quadrilateral);
const mappedCorners = [
  tools.projectivePoint(coefficients, 0, 0),
  tools.projectivePoint(coefficients, 1, 0),
  tools.projectivePoint(coefficients, 1, 1),
  tools.projectivePoint(coefficients, 0, 1),
];
mappedCorners.forEach((point, index) => {
  assert(near(point.x, quadrilateral[index].x), `corner ${index + 1} x should map exactly`);
  assert(near(point.y, quadrilateral[index].y), `corner ${index + 1} y should map exactly`);
});

const recovered = tools.normalizePoints(null, 0.015);
assert(near(recovered[0].x, 0.015) && near(recovered[2].x, 0.985), "recover border should use the full source margin");

const expandedCrop = tools.expandCropPoints([
  { x: 0.09, y: 0.09 },
  { x: 0.91, y: 0.09 },
  { x: 0.91, y: 0.91 },
  { x: 0.09, y: 0.91 },
], 0.18);
assert(expandedCrop[0].x < 0.09 && expandedCrop[0].y < 0.09, "recover border should expand the top-left point outward");
assert(expandedCrop[2].x > 0.91 && expandedCrop[2].y > 0.91, "recover border should expand the bottom-right point outward");
assert(expandedCrop.every((point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1), "expanded crop should stay inside the source image");

const settings = tools.normalizeSettings({ highlights: -160, warmth: 42, tint: -37, contrast: "12" });
assert(settings.highlights === -100, "highlight correction should be clamped");
assert(settings.warmth === 42 && settings.tint === -37 && settings.contrast === 12, "valid adjustments should be preserved");

console.log("admin image tests passed");
