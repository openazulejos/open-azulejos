const COLOR_FAMILIES = new Set([
  "blue", "green", "yellow", "red", "brown", "black", "white", "grey", "multicolor",
]);

const COLOR_SOURCES = new Set([
  "capture", "admin-approval", "admin-treatment", "archive-backfill-v1",
]);

const normalizedColorMetadata = (body, defaultSource = "capture") => {
  const dominant = String(body?.dominant_color || body?.color_metadata?.dominant || "").trim().toLowerCase();
  if (!COLOR_FAMILIES.has(dominant)) return null;
  const sourceFamilies = body?.color_metadata?.families;
  const families = {};
  if (sourceFamilies && typeof sourceFamilies === "object" && !Array.isArray(sourceFamilies)) {
    Object.entries(sourceFamilies).forEach(([family, value]) => {
      const key = String(family || "").trim().toLowerCase();
      const amount = Number(value);
      if (COLOR_FAMILIES.has(key) && Number.isFinite(amount) && amount >= 0) {
        families[key] = Math.min(1, Number(amount.toFixed(4)));
      }
    });
  }
  if (!Object.keys(families).length) families[dominant] = 1;
  const requestedSource = String(body?.color_metadata?.source || "").trim();
  const source = COLOR_SOURCES.has(requestedSource) ? requestedSource : defaultSource;
  return {
    dominant,
    metadata: {
      dominant,
      families,
      source,
      analyzed_at: new Date().toISOString(),
    },
  };
};

module.exports = { COLOR_FAMILIES, normalizedColorMetadata };
