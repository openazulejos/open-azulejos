(function installAdminSimilarityTools(global) {
  "use strict";

  const hashCache = new Map();
  const descriptorCache = new Map();
  const GRID_SIZE = 16;

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

  function luminanceOf(red, green, blue) {
    return red * 0.299 + green * 0.587 + blue * 0.114;
  }

  function binaryDHashFromCanvas(sourceCanvas) {
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(sourceCanvas, 0, 0, 9, 8);
    const pixels = context.getImageData(0, 0, 9, 8).data;
    const luminance = [];
    for (let index = 0; index < pixels.length; index += 4) {
      luminance.push(luminanceOf(pixels[index], pixels[index + 1], pixels[index + 2]));
    }
    let hash = "";
    for (let row = 0; row < 8; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        const offset = row * 9 + column;
        hash += luminance[offset] > luminance[offset + 1] ? "1" : "0";
      }
    }
    return hash;
  }

  async function differenceHash(url) {
    if (hashCache.has(url)) return hashCache.get(url);
    const pending = (async () => {
      const image = await loadImage(url);
      const canvas = document.createElement("canvas");
      canvas.width = 9;
      canvas.height = 8;
      canvas.getContext("2d").drawImage(image, 0, 0, 9, 8);
      return binaryDHashFromCanvas(canvas);
    })();
    hashCache.set(url, pending);
    try {
      return await pending;
    } catch (error) {
      hashCache.delete(url);
      throw error;
    }
  }

  function differenceHashFromCanvas(sourceCanvas) {
    return binaryDHashFromCanvas(sourceCanvas);
  }

  function cropSquare(image) {
    const width = image.naturalWidth || image.videoWidth || image.width;
    const height = image.naturalHeight || image.videoHeight || image.height;
    const size = Math.min(width, height);
    return {
      sx: Math.max(0, (width - size) / 2),
      sy: Math.max(0, (height - size) / 2),
      size,
    };
  }

  function hueBin(red, green, blue) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    if (chroma < 0.08) return null;
    let hue = 0;
    if (max === r) hue = ((g - b) / chroma) % 6;
    else if (max === g) hue = (b - r) / chroma + 2;
    else hue = (r - g) / chroma + 4;
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
    return Math.min(11, Math.floor(hue / 30));
  }

  function normalizeVector(values) {
    const max = Math.max(...values, 0.0001);
    return values.map((value) => value / max);
  }

  function descriptorFromCanvas(sourceCanvas) {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(sourceCanvas, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    const gray = new Array(size * size);
    const colorHist = new Array(12).fill(0);
    const lightHist = new Array(6).fill(0);
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const pixel = index / 4;
      const light = luminanceOf(red, green, blue);
      gray[pixel] = light;
      lightHist[Math.min(5, Math.floor(light / 43))] += 1;
      const bin = hueBin(red, green, blue);
      if (bin !== null) colorHist[bin] += 1;
    }

    const edge = new Array(GRID_SIZE * GRID_SIZE).fill(0);
    const ink = new Array(GRID_SIZE * GRID_SIZE).fill(0);
    const block = size / GRID_SIZE;
    for (let y = 1; y < size - 1; y += 1) {
      for (let x = 1; x < size - 1; x += 1) {
        const offset = y * size + x;
        const gx = gray[offset + 1] - gray[offset - 1];
        const gy = gray[offset + size] - gray[offset - size];
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const cellX = Math.min(GRID_SIZE - 1, Math.floor(x / block));
        const cellY = Math.min(GRID_SIZE - 1, Math.floor(y / block));
        const cell = cellY * GRID_SIZE + cellX;
        edge[cell] += magnitude;
        if (magnitude > 16 || gray[offset] < 150) ink[cell] += 1;
      }
    }

    return {
      edge: normalizeVector(edge),
      ink: normalizeVector(ink),
      color: normalizeVector(colorHist),
      light: normalizeVector(lightHist),
    };
  }

  function descriptorFromImage(image) {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const crop = cropSquare(image);
    context.drawImage(image, crop.sx, crop.sy, crop.size, crop.size, 0, 0, 160, 160);
    return descriptorFromCanvas(canvas);
  }

  async function patternDescriptor(url) {
    if (descriptorCache.has(url)) return descriptorCache.get(url);
    const pending = (async () => descriptorFromImage(await loadImage(url)))();
    descriptorCache.set(url, pending);
    try {
      return await pending;
    } catch (error) {
      descriptorCache.delete(url);
      throw error;
    }
  }

  function vectorCosine(first, second) {
    if (!first || !second || first.length !== second.length) return 0;
    let dot = 0;
    let firstNorm = 0;
    let secondNorm = 0;
    for (let index = 0; index < first.length; index += 1) {
      dot += first[index] * second[index];
      firstNorm += first[index] * first[index];
      secondNorm += second[index] * second[index];
    }
    if (!firstNorm || !secondNorm) return 0;
    return dot / Math.sqrt(firstNorm * secondNorm);
  }

  function histogramIntersection(first, second) {
    const firstTotal = first.reduce((sum, value) => sum + value, 0);
    const secondTotal = second.reduce((sum, value) => sum + value, 0);
    if (!firstTotal || !secondTotal) return 0;
    let overlap = 0;
    for (let index = 0; index < first.length; index += 1) {
      overlap += Math.min(first[index] / firstTotal, second[index] / secondTotal);
    }
    return overlap;
  }

  function transformGrid(values, transform) {
    const output = new Array(values.length);
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        let tx = x;
        let ty = y;
        if (transform === "rot90") {
          tx = GRID_SIZE - 1 - y;
          ty = x;
        } else if (transform === "rot180") {
          tx = GRID_SIZE - 1 - x;
          ty = GRID_SIZE - 1 - y;
        } else if (transform === "rot270") {
          tx = y;
          ty = GRID_SIZE - 1 - x;
        } else if (transform === "flipX") {
          tx = GRID_SIZE - 1 - x;
        } else if (transform === "flipY") {
          ty = GRID_SIZE - 1 - y;
        }
        output[ty * GRID_SIZE + tx] = values[y * GRID_SIZE + x];
      }
    }
    return output;
  }

  function descriptorSimilarity(first, second) {
    if (!first || !second) return null;
    const transforms = ["identity", "rot90", "rot180", "rot270", "flipX", "flipY"];
    let bestStructure = 0;
    transforms.forEach((transform) => {
      const edge = transform === "identity" ? second.edge : transformGrid(second.edge, transform);
      const ink = transform === "identity" ? second.ink : transformGrid(second.ink, transform);
      const structure = vectorCosine(first.edge, edge) * 0.62 + vectorCosine(first.ink, ink) * 0.38;
      bestStructure = Math.max(bestStructure, structure);
    });
    const color = histogramIntersection(first.color, second.color);
    const light = histogramIntersection(first.light, second.light);
    return Math.round(Math.max(0, Math.min(1, bestStructure * 0.78 + color * 0.14 + light * 0.08)) * 100);
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

  async function scoreRecords(referenceRecord, records, options = {}) {
    const storedReferenceHash = /^[01]{64}$/.test(referenceRecord.image_fingerprint || "")
      ? referenceRecord.image_fingerprint
      : null;
    const referenceHash = storedReferenceHash || await differenceHash(referenceRecord.image_url);
    const maxImageLoads = Math.max(0, Math.min(Number(options.maxImageLoads) || 50, 200));
    let imageLoadCount = 0;
    let referenceDescriptor = null;
    if (maxImageLoads > 0) {
      try {
        referenceDescriptor = await patternDescriptor(referenceRecord.image_url);
      } catch {
        referenceDescriptor = null;
      }
    }
    const scored = await mapWithConcurrency(records, 5, async (record) => {
      try {
        const storedHash = /^[01]{64}$/.test(record.image_fingerprint || "") ? record.image_fingerprint : null;
        let legacySimilarity = null;
        let richSimilarity = null;
        if (referenceDescriptor && imageLoadCount < maxImageLoads) {
          imageLoadCount += 1;
          try {
            richSimilarity = descriptorSimilarity(referenceDescriptor, await patternDescriptor(record.image_url));
          } catch {
            richSimilarity = null;
          }
        }
        const candidateHash = storedHash || await differenceHash(record.image_url);
        legacySimilarity = hammingSimilarity(referenceHash, candidateHash);
        const visualSimilarity = Number.isFinite(richSimilarity)
          ? Math.round(richSimilarity * 0.88 + (legacySimilarity ?? richSimilarity) * 0.12)
          : legacySimilarity;
        return {
          ...record,
          image_fingerprint: candidateHash,
          visual_similarity: visualSimilarity,
          visual_similarity_legacy: legacySimilarity,
        };
      } catch {
        return { ...record, visual_similarity: null };
      }
    });
    return scored.sort((first, second) => {
      const similarityDelta = (second.visual_similarity ?? -1) - (first.visual_similarity ?? -1);
      return similarityDelta || Number(first.distance_m || 0) - Number(second.distance_m || 0);
    });
  }

  global.AdminSimilarityTools = {
    differenceHash,
    differenceHashFromCanvas,
    descriptorSimilarity,
    hammingSimilarity,
    patternDescriptor,
    scoreRecords,
  };
})(typeof window === "undefined" ? globalThis : window);
