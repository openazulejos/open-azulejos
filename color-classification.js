"use strict";

(function exposeColorClassification(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OpenAzulejosColor = api;
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function familyFromRgb(red, green, blue) {
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

    if (hue >= 16 && hue < 38) return "brown";
    if (hue >= 38 && hue < 80) return "yellow";
    if (hue >= 80 && hue < 190) return "green";
    if (hue >= 190 && hue < 290) return "blue";
    return "red";
  }

  function familyCountsFromPixels(data, step = 4) {
    const counts = new Map();
    const increment = Math.max(4, Math.floor(step / 4) * 4);
    for (let index = 0; index < data.length; index += increment) {
      if (data[index + 3] < 180) continue;
      const family = familyFromRgb(data[index], data[index + 1], data[index + 2]);
      if (family === "white") continue;
      counts.set(family, (counts.get(family) || 0) + 1);
    }
    return counts;
  }

  function rankedFamilies(counts) {
    return [...counts.entries()].sort((first, second) => second[1] - first[1]);
  }

  function dominantFromRanked(ranked) {
    if (!ranked.length) return "white";
    const total = ranked.reduce((sum, [, count]) => sum + count, 0);
    if (ranked.length >= 3 && ranked[0][1] / total < 0.45) return "multicolor";
    return ranked[0][0];
  }

  function dominantFamilyFromPixels(data, step = 16) {
    return dominantFromRanked(rankedFamilies(familyCountsFromPixels(data, step)));
  }

  function metadataFromPixels(data, source, step = 4) {
    const ranked = rankedFamilies(familyCountsFromPixels(data, step));
    if (!ranked.length) {
      return {
        dominant: "white",
        families: { white: 1 },
        source,
      };
    }
    const total = ranked.reduce((sum, [, count]) => sum + count, 0);
    return {
      dominant: dominantFromRanked(ranked),
      families: Object.fromEntries(
        ranked.map(([family, count]) => [family, Number((count / total).toFixed(4))]),
      ),
      source,
    };
  }

  return {
    dominantFamilyFromPixels,
    familyFromRgb,
    metadataFromPixels,
  };
}));
