(function installAdminImageTools(scope) {
  const DEFAULT_SETTINGS = Object.freeze({
    brightness: 0,
    highlights: 0,
    shadows: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    tint: 0,
  });

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

  function normalizeSettings(settings = {}) {
    return Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((key) => [
      key,
      clamp(Number(settings[key]) || 0, -100, 100),
    ]));
  }

  function validPoints(points) {
    return Array.isArray(points)
      && points.length === 4
      && points.every((point) => Number.isFinite(Number(point?.x))
        && Number.isFinite(Number(point?.y)));
  }

  function normalizePoints(points, inset = 0) {
    const fallback = [
      { x: inset, y: inset },
      { x: 1 - inset, y: inset },
      { x: 1 - inset, y: 1 - inset },
      { x: inset, y: 1 - inset },
    ];
    return (validPoints(points) ? points : fallback).map((point) => ({
      x: clamp(Number(point.x)),
      y: clamp(Number(point.y)),
    }));
  }

  function expandCropPoints(points, amount = 0.14) {
    const normalized = normalizePoints(points);
    const center = normalized.reduce((sum, point) => ({
      x: sum.x + point.x / normalized.length,
      y: sum.y + point.y / normalized.length,
    }), { x: 0, y: 0 });
    const expanded = normalized.map((point) => ({
      x: center.x + (point.x - center.x) * (1 + amount),
      y: center.y + (point.y - center.y) * (1 + amount),
    }));
    const overflow = expanded.reduce((maximum, point) => Math.max(
      maximum,
      Math.max(0, -point.x),
      Math.max(0, point.x - 1),
      Math.max(0, -point.y),
      Math.max(0, point.y - 1),
    ), 0);
    if (!overflow) return expanded;
    const scale = Math.max(0, 1 - overflow / Math.max(overflow + amount, 0.0001));
    return normalized.map((point) => ({
      x: clamp(center.x + (point.x - center.x) * (1 + amount * scale)),
      y: clamp(center.y + (point.y - center.y) * (1 + amount * scale)),
    }));
  }

  function projectiveCoefficients(points) {
    const [p0, p1, p2, p3] = points;
    const dx1 = p1.x - p2.x;
    const dx2 = p3.x - p2.x;
    const dx3 = p0.x - p1.x + p2.x - p3.x;
    const dy1 = p1.y - p2.y;
    const dy2 = p3.y - p2.y;
    const dy3 = p0.y - p1.y + p2.y - p3.y;
    const denominator = dx1 * dy2 - dx2 * dy1;
    let g = 0;
    let h = 0;
    if (Math.abs(denominator) > 1e-9) {
      g = (dx3 * dy2 - dx2 * dy3) / denominator;
      h = (dx1 * dy3 - dx3 * dy1) / denominator;
    }
    return {
      a: p1.x - p0.x + g * p1.x,
      b: p3.x - p0.x + h * p3.x,
      c: p0.x,
      d: p1.y - p0.y + g * p1.y,
      e: p3.y - p0.y + h * p3.y,
      f: p0.y,
      g,
      h,
    };
  }

  function projectivePoint(coefficients, u, v) {
    const denominator = coefficients.g * u + coefficients.h * v + 1;
    return {
      x: (coefficients.a * u + coefficients.b * v + coefficients.c) / denominator,
      y: (coefficients.d * u + coefficients.e * v + coefficients.f) / denominator,
    };
  }

  function createCanvas(width, height) {
    if (typeof scope.OffscreenCanvas === "function") return new scope.OffscreenCanvas(width, height);
    const canvas = scope.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function sampleBilinear(sourcePixels, width, height, x, y, outputPixels, outputIndex) {
    const safeX = clamp(x, 0, width - 1);
    const safeY = clamp(y, 0, height - 1);
    const x0 = Math.floor(safeX);
    const y0 = Math.floor(safeY);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    const tx = safeX - x0;
    const ty = safeY - y0;
    const topLeft = (y0 * width + x0) * 4;
    const topRight = (y0 * width + x1) * 4;
    const bottomLeft = (y1 * width + x0) * 4;
    const bottomRight = (y1 * width + x1) * 4;
    const topWeight = 1 - ty;
    const bottomWeight = ty;
    const leftWeight = 1 - tx;
    const rightWeight = tx;
    for (let channel = 0; channel < 4; channel += 1) {
      outputPixels[outputIndex + channel] = (
        sourcePixels[topLeft + channel] * leftWeight * topWeight
        + sourcePixels[topRight + channel] * rightWeight * topWeight
        + sourcePixels[bottomLeft + channel] * leftWeight * bottomWeight
        + sourcePixels[bottomRight + channel] * rightWeight * bottomWeight
      );
    }
  }

  function drawPerspective(ctx, image, normalizedPoints, size) {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const coefficients = projectiveCoefficients(normalizePoints(normalizedPoints).map((point) => ({
      x: point.x * width,
      y: point.y * height,
    })));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);

    const sourceCanvas = createCanvas(width, height);
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    sourceContext.drawImage(image, 0, 0, width, height);
    const sourcePixels = sourceContext.getImageData(0, 0, width, height).data;
    const output = ctx.createImageData(size, size);
    const outputPixels = output.data;
    for (let y = 0; y < size; y += 1) {
      const v = (y + 0.5) / size;
      for (let x = 0; x < size; x += 1) {
        const u = (x + 0.5) / size;
        const sourcePoint = projectivePoint(coefficients, u, v);
        sampleBilinear(sourcePixels, width, height, sourcePoint.x, sourcePoint.y, outputPixels, (y * size + x) * 4);
      }
    }
    ctx.putImageData(output, 0, 0);
  }

  function applyAdjustments(ctx, size, rawSettings = {}) {
    const settings = normalizeSettings(rawSettings);
    if (Object.values(settings).every((value) => value === 0)) return;
    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;
    const brightness = settings.brightness * 1.15;
    const contrast = (100 + settings.contrast) / 100;
    const saturation = (100 + settings.saturation) / 100;
    const warmth = settings.warmth * 0.28;
    const tint = settings.tint * 0.18;
    const highlightAmount = settings.highlights / 100;
    const shadowAmount = settings.shadows / 100;
    for (let index = 0; index < pixels.length; index += 4) {
      let red = pixels[index] + brightness;
      let green = pixels[index + 1] + brightness;
      let blue = pixels[index + 2] + brightness;
      let luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
      const highlightWeight = clamp((luminance - 0.46) / 0.54) ** 2;
      const shadowWeight = clamp((0.54 - luminance) / 0.54) ** 2;
      const highlightShift = highlightAmount < 0
        ? highlightAmount * highlightWeight * Math.max(0, luminance - 0.38) * 150
        : highlightAmount * highlightWeight * (1 - luminance) * 110;
      const shadowShift = shadowAmount * shadowWeight * (shadowAmount < 0 ? luminance : 1 - luminance) * 100;
      red += highlightShift + shadowShift;
      green += highlightShift + shadowShift;
      blue += highlightShift + shadowShift;
      red = (red - 127.5) * contrast + 127.5;
      green = (green - 127.5) * contrast + 127.5;
      blue = (blue - 127.5) * contrast + 127.5;
      luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      red = luminance + (red - luminance) * saturation + warmth;
      green = luminance + (green - luminance) * saturation - tint;
      blue = luminance + (blue - luminance) * saturation - warmth;
      red += tint * 0.5;
      blue += tint * 0.5;
      pixels[index] = clamp(red, 0, 255);
      pixels[index + 1] = clamp(green, 0, 255);
      pixels[index + 2] = clamp(blue, 0, 255);
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function renderEditedImage(canvas, image, points, settings, size = 720) {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    drawPerspective(ctx, image, points, size);
    applyAdjustments(ctx, size, settings);
    return canvas;
  }

  scope.AdminImageTools = {
    DEFAULT_SETTINGS,
    normalizePoints,
    normalizeSettings,
    projectiveCoefficients,
    projectivePoint,
    expandCropPoints,
    renderEditedImage,
  };
}(window));
