(function installAdminSimilarityTools(global) {
  "use strict";

  const hashCache = new Map();

  function hammingSimilarity(first, second) {
    if (!first || !second || first.length !== second.length) return null;
    let distance = 0;
    for (let index = 0; index < first.length; index += 1) {
      if (first[index] !== second[index]) distance += 1;
    }
    return Math.round((1 - distance / first.length) * 100);
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("comparison image could not be loaded"));
      image.src = url;
    });
  }

  async function differenceHash(url) {
    if (hashCache.has(url)) return hashCache.get(url);
    const pending = (async () => {
      const image = await loadImage(url);
      const canvas = document.createElement("canvas");
      canvas.width = 9;
      canvas.height = 8;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, 9, 8);
      const pixels = context.getImageData(0, 0, 9, 8).data;
      const luminance = [];
      for (let index = 0; index < pixels.length; index += 4) {
        luminance.push(pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114);
      }
      let hash = "";
      for (let row = 0; row < 8; row += 1) {
        for (let column = 0; column < 8; column += 1) {
          const offset = row * 9 + column;
          hash += luminance[offset] > luminance[offset + 1] ? "1" : "0";
        }
      }
      return hash;
    })();
    hashCache.set(url, pending);
    try {
      return await pending;
    } catch (error) {
      hashCache.delete(url);
      throw error;
    }
  }

  async function mapWithConcurrency(items, concurrency, task) {
    const results = new Array(items.length);
    let cursor = 0;
    async function worker() {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await task(items[index]);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return results;
  }

  async function scoreRecords(referenceUrl, records) {
    const referenceHash = await differenceHash(referenceUrl);
    const candidates = records.slice(0, 50);
    const scored = await mapWithConcurrency(candidates, 6, async (record) => {
      try {
        const candidateHash = await differenceHash(record.image_url);
        return { ...record, visual_similarity: hammingSimilarity(referenceHash, candidateHash) };
      } catch {
        return { ...record, visual_similarity: null };
      }
    });
    const unscored = records.slice(candidates.length).map((record) => ({ ...record, visual_similarity: null }));
    return [...scored, ...unscored].sort((first, second) => {
      const similarityDelta = (second.visual_similarity ?? -1) - (first.visual_similarity ?? -1);
      return similarityDelta || Number(first.distance_m || 0) - Number(second.distance_m || 0);
    });
  }

  global.AdminSimilarityTools = { hammingSimilarity, scoreRecords };
})(typeof window === "undefined" ? globalThis : window);
