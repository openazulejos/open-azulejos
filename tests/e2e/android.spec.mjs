import path from "node:path";
import { expect, test } from "@playwright/test";

const projectRoot = process.cwd();
const leafletRoot = path.join(projectRoot, "node_modules", "leaflet", "dist");
const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLrWQAAAABJRU5ErkJggg==",
  "base64",
);

const records = [
  ["11111111-1111-4111-8111-111111111111", 38.719152, -9.134188, "blue", "arroios"],
  ["22222222-2222-4222-8222-222222222222", 38.7201, -9.136, "green", "arroios"],
  ["33333333-3333-4333-8333-333333333333", 38.7179, -9.1325, "yellow", "estrela"],
  ["44444444-4444-4444-8444-444444444444", 38.7212, -9.1314, "multicolor", "são vicente"],
].map(([id, lat, lng, dominantColor, neighborhood]) => ({
  id,
  title: "recorded azulejo",
  lat,
  lng,
  image_url: "/assets/favicon-32.png",
  moderation_status: "approved",
  source: "web-camera",
  dominant_color: dominantColor,
  color_metadata: { dominant: dominantColor, shares: { [dominantColor]: 1 } },
  neighborhood,
  words: `test.${dominantColor}.tile`,
  photographer_credit: "android test",
  photo_license: "cc-by-4.0",
}));

async function installDeterministicRoutes(page) {
  await page.route("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", (route) => route.fulfill({
    path: path.join(leafletRoot, "leaflet.js"),
    contentType: "application/javascript",
  }));
  await page.route("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", (route) => route.fulfill({
    path: path.join(leafletRoot, "leaflet.css"),
    contentType: "text/css",
  }));
  await page.route(/https:\/\/[^/]+\.tile\.openstreetmap\.org\/.*/, (route) => route.fulfill({
    body: transparentPng,
    contentType: "image/png",
  }));
  await page.route("**/api/records**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(new URL(route.request().url()).searchParams.has("facets")
      ? { combinations: records.map((record) => ({ neighborhood: record.neighborhood, color: record.dominant_color, count: 1 })) }
      : { records, visible: records.length, total: records.length }),
  }));
  await page.route("**/api/contributors**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ contributors: [] }),
  }));
  await page.route("**/api/contributor-account**", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: "not signed in" }),
  }));
  await page.route("**/api/admin-session**", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ authenticated: false }),
  }));
  await page.route("**/api/analytics", (route) => route.fulfill({
    status: 202,
    contentType: "application/json",
    body: JSON.stringify({ recorded: true }),
  }));
}

async function openApp(page) {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await installDeterministicRoutes(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("#mapAzulejoCount")).not.toHaveText("0/0");
  return pageErrors;
}

async function chooseView(page, mode) {
  if (await page.locator("#menuOpenButton").isVisible()) {
    await page.locator("#menuOpenButton").click();
    await expect(page.locator("#menuSheet")).toHaveClass(/is-open/);
    await page.locator(`#menuSheet [data-view-mode="${mode}"]`).click();
  } else {
    await page.locator("#viewSwitchButton").click();
    await page.locator(`#viewSwitchMenu [data-view-mode="${mode}"]`).click();
  }
}

function parseRgb(value) {
  const channels = String(value).match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
  return channels.length === 3 ? channels : [0, 0, 0];
}

test("Filter menus keep selection, keyboard access and narrow-screen positioning", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const pageErrors = await openApp(page);
  await chooseView(page, "grid");
  await expect(page.locator("#gridColorFilter option[value='blue']")).toHaveCount(1);
  const color = page.locator("#gridColorFilterButton");
  const colors = page.locator("#gridColorFilterMenu");
  await expect(color).toContainText("all colors");
  await color.focus();
  await color.press("ArrowDown");
  await expect(colors).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(colors.getByRole("option", { name: /blue/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(colors).toBeHidden();
  await expect(color).toBeFocused();
  await expect(page.locator("#gridColorFilter")).toHaveValue("blue");
  await expect(page.locator(".azulejo-grid-card")).toHaveCount(1);

  await color.click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(color).toBeFocused();
  await expect(page.locator("#gridColorFilter")).toHaveValue("blue");
  await color.click();
  await colors.getByRole("option", { name: "all colors", exact: true }).click();
  await expect(page.locator(".azulejo-grid-card")).toHaveCount(records.length);
  await color.click();
  await page.keyboard.press("Tab");
  await expect(colors).toBeHidden();
  await expect(color).not.toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#gridTypeFilterButton")).toBeDisabled();
  await expect(page.locator("#gridMotifFilterButton")).toBeDisabled();

  await page.setViewportSize({ width: 320, height: 700 });
  await page.locator("#filterSwitchButton").click();
  await color.click();
  await page.locator("#gridNeighborhoodFilterButton").click();
  const neighborhoods = page.locator("#gridNeighborhoodFilterMenu");
  await expect(colors).toBeHidden();
  await expect(neighborhoods).toBeVisible();
  const box = await neighborhoods.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(11);
  expect(box.x + box.width).toBeLessThanOrEqual(309);
  expect(box.y + box.height).toBeLessThanOrEqual(700);
  await page.locator("#filterSwitchButton").click();
  await expect(neighborhoods).toBeHidden();
  expect(pageErrors).toEqual([]);
});

function contrastRatio(first, second) {
  const luminance = (channels) => {
    const converted = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * converted[0] + 0.7152 * converted[1] + 0.0722 * converted[2];
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

async function boundaryPixels(page) {
  return page.locator(".leaflet-boundaries-pane canvas").evaluate((canvas) => {
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let white = 0;
    let dark = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 100) continue;
      if (pixels[i] > 240 && pixels[i + 1] > 240 && pixels[i + 2] > 240) white++;
      if (pixels[i] < 50 && pixels[i + 1] < 50 && pixels[i + 2] < 50) dark++;
    }
    return { white, dark };
  });
}

test("Android map fills the viewport without clipping controls", async ({ page }) => {
  const pageErrors = await openApp(page);
  await expect(page.locator("#recordHistoryButton")).toBeVisible();
  await expect(page.locator("#mapLocationButton")).toBeVisible();
  await expect(page.locator("#targetCoordinates")).toContainText("38.719");

  const layout = await page.evaluate(() => {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const controls = ["#recordHistoryButton", "#recordHelpButton", "#mapLocationButton", "#targetCoordinates"]
      .map((selector) => document.querySelector(selector)?.getBoundingClientRect())
      .filter(Boolean)
      .map(({ top, right, bottom, left }) => ({ top, right, bottom, left }));
    return {
      viewportHeight,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyHeight: document.body.getBoundingClientRect().height,
      controls,
    };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.bodyHeight).toBeGreaterThanOrEqual(layout.viewportHeight - 2);
  layout.controls.forEach((box) => {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  });
  expect(pageErrors).toEqual([]);
});

test("Android navigation switches between grid and generative canva", async ({ page }) => {
  const pageErrors = await openApp(page);
  await chooseView(page, "grid");
  await expect(page.locator("#azulejoGridView")).toBeVisible();
  await expect(page.locator("#recordHistoryButton")).toBeHidden();
  await expect(page.locator(".azulejo-grid-card")).toHaveCount(records.length);

  await page.locator(".azulejo-grid-card").first().click();
  await expect(page.locator("#azulejoViewer")).toHaveClass(/is-open/);
  await page.locator("#azulejoViewerClose").click();

  await chooseView(page, "canva");
  await expect(page.locator("#azulejoCanvaView")).toBeVisible();
  await expect(page.locator(".azulejo-canva-tile").first()).toBeVisible();
  await expect(page.locator("#recordHistoryButton")).toBeHidden();
  expect(pageErrors).toEqual([]);
});

test("Android map keeps larger squares aligned through zoom and pan", async ({ page }) => {
  const pageErrors = await openApp(page);
  const square = page.locator(".azulejo-cell").first();
  const openingCell = await page.evaluate(() => window.AzulejoAtlas.cellForLatLng(38.719152, -9.134188).code);
  const openingHeader = await page.locator(".topbar").boundingBox();

  for (const zoom of [16, 17, 18, 19, 20]) {
    if (zoom > 16) await page.locator(".leaflet-control-zoom-in").click();
    await expect(page.locator("#mapZoomPercent")).toHaveText(`${100 * (2 ** (zoom - 16))}%`);
    await expect.poll(async () => {
      const box = await square.boundingBox();
      return box?.width >= 34 && box.width <= 36 && box.height >= 34 && box.height <= 36;
    }).toBe(true);
    expect(await page.locator(".topbar").boundingBox()).toEqual(openingHeader);
    expect((await page.locator(".leaflet-control-zoom-in").boundingBox()).width).toBe(34);
  }

  await square.click();
  await expect(page.locator("#azulejoViewer")).toHaveClass(/is-open/);
  await expect(page.locator("#azulejoViewerCaption")).toHaveText(`38.719152, -9.134188 · ${openingCell}`);
  await page.locator("#azulejoViewerClose").click();

  const movedCenter = await page.evaluate(() => {
    map.panBy([80, 60], { animate: false });
    return map.getCenter();
  });
  expect(movedCenter.lat).not.toBe(38.719152);
  expect(movedCenter.lng).not.toBe(-9.134188);
  const alignment = await page.evaluate(() => {
    const tile = displayedTiles[0];
    const point = map.latLngToContainerPoint(tile.displayBounds.getCenter());
    const roundTrip = map.containerPointToLatLng(point);
    const center = tile.displayBounds.getCenter();
    return { latError: Math.abs(roundTrip.lat - center.lat), lngError: Math.abs(roundTrip.lng - center.lng),
      cell: window.AzulejoAtlas.cellForLatLng(tile.lat, tile.lng).code };
  });
  expect(alignment.latError).toBeLessThan(0.000001);
  expect(alignment.lngError).toBeLessThan(0.000001);
  expect(alignment.cell).toBe(openingCell);
  expect(pageErrors).toEqual([]);
});

test("Android dark mode keeps navigation legible", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  const pageErrors = await openApp(page);
  await expect.poll(async () => (await boundaryPixels(page)).white).toBeGreaterThan(0);
  expect((await boundaryPixels(page)).dark).toBe(0);

  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(async () => (await boundaryPixels(page)).dark).toBeGreaterThan(0);
  expect((await boundaryPixels(page)).white).toBe(0);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(async () => (await boundaryPixels(page)).white).toBeGreaterThan(0);
  expect((await boundaryPixels(page)).dark).toBe(0);
  const colors = await page.locator(".topbar").evaluate((topbar) => {
    const brand = topbar.querySelector(".brand");
    return {
      foreground: getComputedStyle(brand).color,
      background: getComputedStyle(topbar).backgroundColor,
    };
  });
  expect(contrastRatio(parseRgb(colors.foreground), parseRgb(colors.background))).toBeGreaterThanOrEqual(4.5);

  if (await page.locator("#menuOpenButton").isVisible()) {
    await page.locator("#menuOpenButton").click();
    await expect(page.locator("#menuSheet")).toBeVisible();
    const selectedColors = await page.locator("#menuSheet [data-view-mode=map]").evaluate((item) => ({
      foreground: getComputedStyle(item).color,
      background: getComputedStyle(item.closest("#menuSheet")).backgroundColor,
    }));
    const selectedForeground = parseRgb(selectedColors.foreground);
    expect(contrastRatio(selectedForeground, parseRgb(selectedColors.background))).toBeGreaterThanOrEqual(4.5);
    expect(selectedForeground[2]).toBeGreaterThan(selectedForeground[0]);
  }
  expect(pageErrors).toEqual([]);
});

test("Android GPS and first-record onboarding are available", async ({ page }) => {
  const pageErrors = await openApp(page);
  await page.locator("#mapLocationButton").click();
  await expect(page.locator("#mapLocationButton")).toHaveClass(/is-active/);

  await page.locator("#recordHistoryButton").click();
  await expect(page.locator("#recordOnboarding")).toHaveClass(/is-open/);
  await expect(page.locator('[data-record-step="0"]')).toBeVisible();
  await page.locator("#recordOnboardingNext").click();
  await expect(page.locator('[data-record-step="1"]')).toBeVisible();
  await page.locator("#recordOnboardingNext").click();
  await expect(page.locator('[data-record-step="2"]')).toBeVisible();
  await page.locator("#recordOnboardingNext").click();
  await expect(page.locator('[data-record-step="3"]')).toBeVisible();
  await page.locator("#recordOnboardingClose").click();
  await expect(page.locator("#recordOnboarding")).not.toHaveClass(/is-open/);
  expect(pageErrors).toEqual([]);
});

test("Android can obtain camera and Lisbon location permissions", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("open-azulejos-record-onboarding-anonymous-v2", "seen");
  });
  const pageErrors = await openApp(page);
  await page.locator("#recordHistoryButton").click();
  await expect(page.locator("#squareCamera")).toHaveClass(/is-open/, { timeout: 30_000 });
  await expect(page.locator("#cameraPermissionStep")).toHaveClass(/is-granted/);
  await expect(page.locator("#locationPermissionStep")).toHaveClass(/is-granted/);
  await expect(page.locator("#squareCameraCapture")).toBeEnabled();
  await page.locator("#squareCameraCancel").click();
  await expect(page.locator("#squareCamera")).not.toHaveClass(/is-open/);
  expect(pageErrors).toEqual([]);
});
