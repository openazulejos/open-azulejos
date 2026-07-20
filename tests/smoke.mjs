import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app-source-capture.js", import.meta.url), "utf8");

function createElement(id, registry) {
  if (registry.has(id)) return registry.get(id);
  const classes = new Set();
  const element = {
    id,
    checked: true,
    value: id === "#gridDensity" ? "3" : "0",
    min: "0",
    max: "1000",
    disabled: false,
    textContent: "",
    files: [],
    addEventListener() {},
    getBoundingClientRect: () => ({ width: 1280, height: 668 }),
    getContext: () => ({
      setTransform() {},
      clearRect() {},
      beginPath() {},
      closePath() {},
      clip() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fillRect() {},
      drawImage() {},
      setLineDash() {},
      strokeRect() {},
      measureText: (text) => ({ width: text.length * 6 }),
      fillText() {},
      save() {},
      restore() {},
      getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    }),
    toDataURL: () => "data:image/png;base64,test",
    append() {},
    click() {},
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : Boolean(force);
        if (enabled) classes.add(name);
        else classes.delete(name);
        return enabled;
      },
    },
    querySelector: () => ({ src: "", alt: "", textContent: "" }),
    cloneNode: () => createElement("clone", registry),
  };
  registry.set(id, element);
  return element;
}

function bootApp() {
  const registry = new Map();
  let watchSuccess = null;
  const currentPositionRequests = [];
  const templateNode = {
    content: {
      cloneNode: () => ({
        querySelector: () => ({ src: "", alt: "", textContent: "" }),
      }),
    },
  };
  const documentStub = {
    addEventListener() {},
    querySelector(selector) {
      if (selector === "#tilePopupTemplate") return templateNode;
      if (selector === ".map-stage") return createElement("map-stage", registry);
      return createElement(selector, registry);
    },
    querySelectorAll() {
      return [];
    },
    createElement(tag) {
      return createElement(tag, registry);
    },
  };
  const map = {
    attributionControl: { setPrefix() {} },
    setView() { return this; },
    getZoom: () => 15,
    getCenter: () => ({ lat: 38.7223, lng: -9.1393 }),
    getBounds: () => ({
      getWest: () => -9.2,
      getEast: () => -9.1,
      getNorth: () => 38.75,
      getSouth: () => 38.70,
    }),
    latLngToContainerPoint: () => ({ x: 0, y: 0 }),
    fitBounds() {},
    addLayer() {},
    removeLayer() {},
    panTo() {},
    flyTo() {},
    createPane: () => ({ style: {} }),
    on() {},
  };
  const context = {
    console,
    window: {
      location: { hash: "" },
      history: { replaceState() {} },
      setTimeout: () => 99,
      clearTimeout() {},
    },
    URLSearchParams,
    localStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
    navigator: {
      geolocation: {
        getCurrentPosition(success, error, options) { currentPositionRequests.push({ success, error, options }); },
        watchPosition(success) { watchSuccess = success; return 7; },
        clearWatch() {},
      },
    },
    document: documentStub,
    URL: { createObjectURL: () => "", revokeObjectURL() {} },
    Blob,
    File,
    Image: function Image() {},
    L: {
      map: () => map,
      control: { zoom: () => ({ addTo() {} }) },
      tileLayer: () => ({ addTo() {} }),
      layerGroup: () => {
        const layers = new Set();
        return {
          addTo() { return this; },
          remove() { layers.clear(); },
          addLayer(layer) { layers.add(layer); return this; },
          removeLayer(layer) { layers.delete(layer); return this; },
          hasLayer(layer) { return layers.has(layer); },
          clearLayers() { layers.clear(); },
        };
      },
      divIcon: (options) => options,
      marker: () => ({ bindPopup() {}, addTo() { return this; } }),
      circleMarker: (point, options) => ({ point, options, addTo() { return this; }, setLatLng(next) { this.point = next; } }),
      imageOverlay: () => ({ bindPopup() {}, on() {}, addTo() { return this; }, setBounds() {}, setOpacity() {} }),
      polygon: () => ({ addTo() { return this; } }),
      rectangle: () => ({ addTo() { return this; }, remove() {}, getElement: () => null }),
      latLngBounds: () => ({
        pad() { return this; },
        getCenter: () => ({ lat: 38.7, lng: -9.1 }),
        toBBoxString: () => "-9.1,38.7,-9.0,38.8",
      }),
    },
  };
  vm.runInNewContext(source, context, { filename: "app-source-capture.js" });
  context.window.AzulejoAtlas.__emitGps = (lat, lng, accuracy = 5) => watchSuccess?.({ coords: { latitude: lat, longitude: lng, accuracy } });
  context.window.AzulejoAtlas.__emitLowAccuracyGps = (lat, lng, accuracy = 50) => {
    const request = currentPositionRequests.slice().reverse().find((item) => item.options?.enableHighAccuracy === false);
    request?.success({ coords: { latitude: lat, longitude: lng, accuracy } });
  };
  context.window.AzulejoAtlas.__currentGpsRequestCount = () => currentPositionRequests.length;
  context.window.AzulejoAtlas.__denyLatestGps = (code = 1) => currentPositionRequests.at(-1)?.error({ code });
  return context.window.AzulejoAtlas;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeU16BE(bytes, value) {
  bytes.push((value >> 8) & 255, value & 255);
}

function writeU16LE(bytes, value) {
  bytes.push(value & 255, (value >> 8) & 255);
}

function writeU32LE(bytes, value) {
  bytes.push(value & 255, (value >> 8) & 255, (value >> 16) & 255, (value >> 24) & 255);
}

function writeEntry(bytes, tag, type, count, value) {
  writeU16LE(bytes, tag);
  writeU16LE(bytes, type);
  writeU32LE(bytes, count);
  writeU32LE(bytes, value);
}

function writeRational(bytes, numerator, denominator) {
  writeU32LE(bytes, numerator);
  writeU32LE(bytes, denominator);
}

function createGpsJpeg() {
  const tiff = [];
  tiff.push(0x49, 0x49);
  writeU16LE(tiff, 42);
  writeU32LE(tiff, 8);
  writeU16LE(tiff, 1);
  writeEntry(tiff, 0x8825, 4, 1, 26);
  writeU32LE(tiff, 0);
  while (tiff.length < 26) tiff.push(0);
  writeU16LE(tiff, 4);
  writeEntry(tiff, 1, 2, 2, "N".charCodeAt(0));
  writeEntry(tiff, 2, 5, 3, 80);
  writeEntry(tiff, 3, 2, 2, "W".charCodeAt(0));
  writeEntry(tiff, 4, 5, 3, 104);
  writeU32LE(tiff, 0);
  while (tiff.length < 80) tiff.push(0);
  writeRational(tiff, 38, 1);
  writeRational(tiff, 42, 1);
  writeRational(tiff, 494, 10);
  while (tiff.length < 104) tiff.push(0);
  writeRational(tiff, 9, 1);
  writeRational(tiff, 8, 1);
  writeRational(tiff, 216, 10);

  const exifPayload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const bytes = [0xff, 0xd8, 0xff, 0xe1];
  writeU16BE(bytes, exifPayload.length + 2);
  bytes.push(...exifPayload, 0xff, 0xd9);
  return new File([Uint8Array.from(bytes)], "gps.jpg", { type: "image/jpeg" });
}

const api = bootApp();

api.locateUserOnMap();
api.__emitGps(38.7201, -9.1391, 8);
assert(api.getState().userLocationWatchId === 7, "live location should keep a geolocation watch active");
assert(api.getState().latestUserLocation.lat === 38.7201, "live location should store its first GPS fix");
api.__emitGps(38.7204, -9.1387, 6);
assert(api.getState().latestUserLocation.lat === 38.7204 && api.getState().latestUserLocation.lng === -9.1387, "live location should update on later GPS fixes");
const fallbackPositionPromise = api.readCurrentBrowserPosition();
api.__emitLowAccuracyGps(38.721, -9.137, 65);
const fallbackPosition = await fallbackPositionPromise;
assert(fallbackPosition.lat === 38.721 && fallbackPosition.accuracy === 65, "iPad location should accept a lower-accuracy Wi-Fi fix");
const encodedUpload = api.encodeCanvasForMobileUpload({
  width: 1024,
  toDataURL: (_mime, quality) => quality > 0.8 ? "x".repeat(3_000_000) : "data:image/jpeg;base64,small",
});
assert(encodedUpload.length < 2_800_000, "mobile encoder should retry oversized JPEG output at a lower quality");

const mosaicCells = api.viewerMosaicCells();
assert(mosaicCells.length === 25, "viewer mosaic should contain 25 tiles");
assert([1, 3, 5, 7, 5, 3, 1].every((count, row) => mosaicCells.filter((cell) => cell.row === row).length === count), "viewer mosaic should follow the 7-row diamond shape");
assert(api.viewerMosaicRotation(1, 2, 3) === 0, "first mosaic mode should keep a uniform orientation");
assert(api.viewerMosaicRotation(2, 2, 3) !== api.viewerMosaicRotation(2, 2, 4), "second mosaic mode should alternate orientations");
assert(api.viewerMosaicRotation(3, 3, 0) !== api.viewerMosaicRotation(3, 3, 6), "third mosaic mode should orient tiles radially");
assert(api.shouldRestoreViewerMapSelection("map") === true, "map-opened viewer should restore the selected cell on close");
assert(api.shouldRestoreViewerMapSelection("contributions") === false, "contribution-opened viewer should close back to account without restoring map selection");
assert(api.shouldRestoreViewerMapSelection("map", { restoreMapSelection: false }) === false, "show-on-map flow should be able to suppress viewer close restoration");
assert(api.shouldReopenAccountAfterViewerClose("contributions") === true, "contribution-opened viewer should reopen account when closed");
assert(api.shouldReopenAccountAfterViewerClose("contributions", { reopenAccount: false }) === false, "show-on-map flow should suppress account reopen");
assert(api.shouldReopenAccountAfterViewerClose("map") === false, "map-opened viewer should not open account when closed");
const horizontalEdgeCosts = Array.from({ length: 4 }, (_, first) => Array.from({ length: 4 }, (_, second) => second === (first + 1) % 4 ? 0 : 100));
const verticalEdgeCosts = Array.from({ length: 4 }, (_, first) => Array.from({ length: 4 }, (_, second) => second === (first + 2) % 4 ? 0 : 100));
const matchedRotations = api.edgeMatchedMosaicRotations(horizontalEdgeCosts, verticalEdgeCosts, mosaicCells);
const rotationByCell = new Map(mosaicCells.map((cell, index) => [`${cell.row}:${cell.column}`, matchedRotations[index]]));
mosaicCells.forEach((cell) => {
  const current = rotationByCell.get(`${cell.row}:${cell.column}`);
  const right = rotationByCell.get(`${cell.row}:${cell.column + 1}`);
  const below = rotationByCell.get(`${cell.row + 1}:${cell.column}`);
  if (right !== undefined) assert(right === (current + 1) % 4, "edge matcher should solve horizontal seams");
  if (below !== undefined) assert(below === (current + 2) % 4, "edge matcher should solve vertical seams");
});
const sceneBounds = {
  getSouth: () => 38.70,
  getNorth: () => 38.74,
  getWest: () => -9.16,
  getEast: () => -9.12,
};
const sceneTiles = [
  { source: "supabase-camera", lat: 38.72, lng: -9.14, minZoom: 12 },
  { source: "supabase-camera", lat: 38.76, lng: -9.14, minZoom: 12 },
  { source: "local-camera", lat: 38.72, lng: -9.14, minZoom: 12 },
];
assert(api.tileInsideMapScene(sceneTiles[0], sceneBounds), "scene counter should include a registered tile inside map bounds");
assert(!api.tileInsideMapScene(sceneTiles[1], sceneBounds), "scene counter should exclude a registered tile outside map bounds");
const sceneCounts = api.sceneAzulejoCounts(sceneTiles, sceneBounds, 18);
assert(sceneCounts.visible === 1 && sceneCounts.total === 2, "scene counter should report visible and total registered azulejos");
const completeServerCounts = api.normalizeServerSceneCounts({ visibleCount: 23, totalCount: 64 }, [], { visible: 1, total: 2 });
assert(completeServerCounts.visible === 23 && completeServerCounts.total === 64, "scene counter should prefer complete server counts");
const recordDerivedCounts = api.normalizeServerSceneCounts({}, [{ id: "a" }, { id: "b" }], { visible: 0, total: 64 });
assert(recordDerivedCounts.visible === 2 && recordDerivedCounts.total === 64, "scene counter should derive visible count from returned records when server counts are missing");
const fallbackTotalCounts = api.normalizeServerSceneCounts({ visibleCount: 0 }, [], { visible: 0, total: 64 });
assert(fallbackTotalCounts.visible === 0 && fallbackTotalCounts.total === 64, "scene counter should preserve a known total instead of falling back to 0/0");
const sceneOnlyTiles = api.tilesInMapScene(sceneTiles, sceneBounds, 18);
assert(sceneOnlyTiles.length === 2 && !sceneOnlyTiles.includes(sceneTiles[1]), "viewer scene filter should exclude azulejos outside current map bounds");
const contributionViewerTile = api.viewerTileFromContribution({
  id: "contribution-1",
  title: "My tile",
  lat: 38.72,
  lng: -9.14,
  imageUrl: "https://example.com/tile.jpg",
});
assert(contributionViewerTile.id === "contribution-1" && contributionViewerTile.image.endsWith("tile.jpg"), "approved contributions should become viewer tiles immediately");
assert(contributionViewerTile.cell === api.cellForLatLng(38.72, -9.14).code, "contribution viewer tiles should retain their map cell");
assert(api.selectionCellForTile(contributionViewerTile).code === contributionViewerTile.cell, "viewer tiles should restore their selected cell when closed");
assert(api.viewerTileFromContribution({ id: "missing-image", lat: 38.72, lng: -9.14 }) === null, "contributions without an image should not open an empty viewer");

const cell = api.cellForLatLng(38.71374, -9.13934);
assert(/^lis\./.test(cell.code), "cell code should use lis prefix");
assert(api.normalizedCellFromCell({ cx: cell.cx, cy: cell.cy }).code === cell.code, "cell normalization should rebuild code from indexes");
assert(api.normalizedCellFromCell({ lat: 38.71374, lng: -9.13934 }).code === cell.code, "cell normalization should accept coordinates");
const activeText = api.activeCellText(cell);
assert(activeText.includes(cell.code), "active cell copy text should include the cell code");
assert(!activeText.includes(cell.words), "active cell copy text should not expose synthetic cell words");
assert(/\| -?\d+\.\d{6}, -?\d+\.\d{6}$/.test(activeText), "active cell copy text should include fixed center coordinates");
assert(api.cellHash(cell) === `cell=${encodeURIComponent(cell.code)}`, "cell hash should encode the cell code");
assert(api.cellFromHash(`#cell=${encodeURIComponent(cell.code)}`).code === cell.code, "cell hash parser should restore cell code");
assert(api.cellFromHash(`#${cell.code}`).code === cell.code, "cell hash parser should support compact legacy hashes");
assert(api.formatZoomPercent(16, 16) === "100%", "opening zoom should display as 100 percent");
assert(api.formatZoomPercent(17, 16) === "200%", "one zoom level in should double the zoom percentage");
assert(api.formatZoomPercent(14, 16) === "25%", "two zoom levels out should quarter the zoom percentage");
assert(
  api.formatTargetCoordinates({ lat: api.homeView.center[0], lng: api.homeView.center[1] }) === "38.719152, -9.134188",
  "default map view should open on the denser azulejo cluster",
);
assert(api.gridStepForZoom(15, 3) === 96, "grid should show a coarse city-scale mesh at opening zoom");
assert(api.gridStepForZoom(12, 3) === 768, "grid should remain visible at city overview zoom");
assert(api.gridStepForZoom(20, 3) === 3, "grid should resolve to true 3 m cells at fine zoom");
const primaryTile = { id: "primary", cx: 10, cy: 10 };
const duplicateTile = { id: "duplicate", cx: 10, cy: 10 };
const trueNeighborTile = { id: "neighbor", cx: 10, cy: 11 };
const fineGridLayout = api.allocateFineGridDisplayCells([
  primaryTile,
  duplicateTile,
  trueNeighborTile,
], 22, 3);
assert(fineGridLayout.get(primaryTile).cx === 10 && fineGridLayout.get(primaryTile).cy === 10, "first tile should keep its true GPS cell");
assert(fineGridLayout.get(trueNeighborTile).cx === 10 && fineGridLayout.get(trueNeighborTile).cy === 11, "a true GPS cell should take priority over displaced duplicates");
assert(fineGridLayout.get(duplicateTile).cx === 11 && fineGridLayout.get(duplicateTile).cy === 10, "duplicate should use the next free adjacent cell");
assert(api.allocateFineGridDisplayCells([primaryTile, duplicateTile], 19, 3) === null, "duplicate displacement should only run on the finest grid");
const crowdedCenter = { id: "crowded-center", cx: 20, cy: 20 };
const crowdedDuplicate = { id: "crowded-duplicate", cx: 20, cy: 20 };
const occupiedNeighbors = [
  [20, 21], [21, 20], [20, 19], [19, 20],
  [21, 21], [21, 19], [19, 19], [19, 21],
].map(([cx, cy], index) => ({ id: `occupied-${index}`, cx, cy }));
const crowdedLayout = api.allocateFineGridDisplayCells([
  crowdedCenter,
  crowdedDuplicate,
  ...occupiedNeighbors,
], 22, 3);
assert(crowdedLayout.get(crowdedDuplicate) === null, "duplicate should stay hidden when every adjacent cell has a true GPS occupant");
assert(api.gridStepForZoom(20, 1) > api.gridStepForZoom(20, 5), "density slider should affect grid detail");
const capturePoints = api.normalizedCropPoints({ sx: 90, sy: 45, side: 820 }, { width: 1000, height: 910 });
assert(capturePoints[0].x === 0.09 && capturePoints[1].x === 0.91, "capture metadata should retain the hidden horizontal margin");
assert(capturePoints[0].y < capturePoints[2].y, "capture metadata should preserve ordered crop corners");
const gpsNow = Date.now();
assert(api.isReliableGpsFix({ lat: 38.706083, lng: -9.1455, accuracy: 12, timestamp: gpsNow }, gpsNow), "fresh accurate Lisbon GPS should be accepted");
assert(!api.isReliableGpsFix({ lat: 38.706083, lng: -9.1455, accuracy: 90, timestamp: gpsNow }, gpsNow), "imprecise GPS should be rejected");
assert(!api.isReliableGpsFix({ lat: 38.706083, lng: -9.1455, accuracy: 12, timestamp: gpsNow - 45_000 }, gpsNow), "stale GPS should be rejected");
assert(api.isUsableUploadGpsFix({ lat: 38.706083, lng: -9.1455, accuracy: 90, timestamp: gpsNow }, gpsNow), "fresh 100 m Lisbon GPS should be usable for uploads");
assert(!api.isUsableUploadGpsFix({ lat: 38.706083, lng: -9.1455, accuracy: 120, timestamp: gpsNow }, gpsNow), "GPS worse than 100 m should be rejected for uploads");
assert(!api.isUsableUploadGpsFix({ lat: 50.8467, lng: 4.3525, accuracy: 12, timestamp: gpsNow }, gpsNow), "non-admin uploads outside Lisbon should be rejected");
assert(api.isUsableUploadGpsFixForContext(
  { lat: 50.8467, lng: 4.3525, accuracy: 12, timestamp: gpsNow },
  gpsNow,
  { allowOutsideLisbon: true },
), "admin beta uploads outside Lisbon should be accepted");
assert(api.gpsDistanceMeters(
  { lat: 38.7060732862235, lng: -9.14551055735526 },
  { lat: 38.7060833333333, lng: -9.1455 },
) < 2, "GPS distance should resolve meter-scale corrections");
assert(api.locationPermissionCopy("Mozilla/5.0 (iPhone)").instructions.includes("safari websites"), "iPhone location help should point to Safari settings");
assert(api.locationPermissionCopy("Mozilla/5.0 (Linux; Android 15)").helpUrl.includes("support.google.com"), "Android location help should use official Chrome guidance");
const permissionRequestCount = api.__currentGpsRequestCount();
const deniedPermissionPromise = api.requestLocationPermission();
await Promise.resolve();
assert(api.__currentGpsRequestCount() === permissionRequestCount + 2, "recording should explicitly request precise geolocation and a Safari fallback");
api.__denyLatestGps(1);
assert((await deniedPermissionPromise).state === "denied", "permission denial should be reported to the location guidance UI");
const imprecisePermissionPromise = api.requestLocationPermission();
await Promise.resolve();
api.__emitLowAccuracyGps(38.706083, -9.1455, 160);
const imprecisePermission = await imprecisePermissionPromise;
assert(imprecisePermission.state === "granted" && imprecisePermission.gps === null, "imprecise iOS permission fix should allow camera flow without upload GPS");
const outsidePermissionPromise = api.requestLocationPermissionForContext();
await Promise.resolve();
api.__emitLowAccuracyGps(50.8467, 4.3525, 12);
assert((await outsidePermissionPromise).state === "outside-lisbon", "public capture should explain valid GPS outside Lisbon");
const outsideAdminPermissionPromise = api.requestLocationPermissionForContext({ allowOutsideLisbon: true });
await Promise.resolve();
api.__emitLowAccuracyGps(50.8467, 4.3525, 12);
const outsideAdminPermission = await outsideAdminPermissionPromise;
assert(outsideAdminPermission.state === "granted" && outsideAdminPermission.gps?.lat === 50.8467, "admin capture should allow beta GPS outside Lisbon");
assert(api.tileMatchesArchiveQuery({
  id: "x",
  title: "Alfama",
  words: "arquivo.estrela.vidro",
  cell: "lis.-79e9.xft4",
  source: "demo",
}, "Alfama demo"), "archive filter should match title and source together");
assert(api.tileMatchesArchiveQuery({
  id: "x",
  title: "Alfama",
  words: "arquivo.estrela.vidro",
  cell: "lis.-79e9.xft4",
  source: "demo",
}, "lis.-79e9"), "archive filter should match cell codes");
assert(!api.tileMatchesArchiveQuery({
  id: "x",
  title: "Alfama",
  words: "arquivo.estrela.vidro",
  cell: "lis.-79e9.xft4",
  source: "demo",
}, "Chiado"), "archive filter should reject unrelated fragments");
const batchReport = api.computeBatchReport(
  new Map([["a.jpg", {}], ["unused.jpg", {}]]),
  [
    { imageKey: "a.jpg", lat: 38.71, lng: -9.13 },
    { imageKey: "missing.jpg", lat: 38.72, lng: -9.14 },
    { imageKey: "far.jpg", lat: 40.64, lng: -8.65, insideLisbon: false },
    { imageKey: "swapped.jpg", lat: -9.13934, lng: 38.71374, insideLisbon: false, possibleCoordinateSwap: true },
  ],
  { ignored: 1 },
);
assert(batchReport.readyCount === 1, "batch report should count matched image/geodata rows");
assert(batchReport.missingImages[0].imageKey === "missing.jpg", "batch report should list geodata without uploaded image");
assert(batchReport.unusedImages[0] === "unused.jpg", "batch report should list uploaded images without geodata");
assert(batchReport.ignoredRows === 1, "batch report should preserve ignored geodata count");
assert(batchReport.outsideLisbon[0].imageKey === "far.jpg", "batch report should list coordinates outside Lisbon bounds");
assert(batchReport.possibleSwaps[0].imageKey === "swapped.jpg", "batch report should list likely swapped coordinates");
assert(api.isInsideLisbonBounds(38.71374, -9.13934), "Lisbon bounds should include central Lisbon");
assert(!api.isInsideLisbonBounds(40.64, -8.65), "Lisbon bounds should reject distant coordinates");
assert(api.looksLikeSwappedLisbonCoordinates(-9.13934, 38.71374), "swap detector should catch reversed Lisbon coordinates");
assert(!api.looksLikeSwappedLisbonCoordinates(38.71374, -9.13934), "swap detector should ignore valid Lisbon coordinates");
const tileBounds = api.boundsArrayForTiles([
  { lat: "38.72", lng: "-9.16" },
  { lat: 38.70, lng: -9.12 },
  { lat: "bad", lng: -9.13 },
]);
assert(tileBounds[0][0] === 38.70 && tileBounds[0][1] === -9.16, "tile bounds should use southwest corner");
assert(tileBounds[1][0] === 38.72 && tileBounds[1][1] === -9.12, "tile bounds should use northeast corner");
assert(api.boundsArrayForTiles([{ lat: "bad", lng: -9.13 }]) === null, "tile bounds should return null with no valid coordinates");
assert(api.detectCsvDelimiter("image;lat;lng;title") === ";", "CSV delimiter detection should accept semicolons");
assert(api.detectCsvDelimiter("image\tlat\tlng\ttitle") === "\t", "CSV delimiter detection should accept tabs");
const semicolonRows = api.parseCsv("image;lat;lng;title\nazulejo.jpg;38,71374;-9,13934;Alfama");
const semicolonTile = api.rowToTile(semicolonRows[0], 0);
assert(semicolonTile.image === "azulejo.jpg", "semicolon CSV should parse image column");
assert(Math.abs(semicolonTile.lat - 38.71374) < 0.00001, "semicolon CSV should allow decimal commas");
assert(Math.abs(semicolonTile.lng + 9.13934) < 0.00001, "semicolon CSV should allow negative decimal commas");
assert(semicolonTile.insideLisbon === true, "parsed Lisbon coordinates should be marked inside the working bounds");
assert(semicolonTile.possibleCoordinateSwap === false, "valid Lisbon coordinates should not be flagged as swapped");
const tabRows = api.parseCsv("image\tlat\tlng\ttitle\nazulejo.jpg\t38.7\t-9.1\tAlfama");
assert(tabRows[0].title === "Alfama", "tab-separated CSV should parse title column");

const rows = api.parseGeoJson(JSON.stringify({
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { media: "a.jpg", label: "A" }, geometry: { type: "Point", coordinates: [-9.13, 38.71] } },
    { type: "Feature", properties: { photo_file: "b.jpg", latitude: "38.72", longitude: "-9.14", caption: "B" }, geometry: null },
    { type: "Feature", properties: { label: "bad" }, geometry: { type: "Point", coordinates: [-9.15, 38.73] } },
  ],
}));
assert(rows.length === 2, "GeoJSON parser should ignore incomplete features");
assert(rows[0].image === "a.jpg" && rows[1].title === "B", "GeoJSON parser should accept flexible field names");

const feature = api.fragmentToGeoJsonFeature({
  id: "x",
  title: "X",
  lat: "38.7",
  lng: "-9.1",
  cell: "lis.a.b",
  words: "a.b.c",
  source: "test",
  bounds: "-9.2,38.7,-9.1,38.8",
  crop: { method: "manuel", score: 80 },
});
assert(feature.geometry.type === "Polygon", "GeoJSON export should produce polygon features");
assert(feature.geometry.coordinates[0].length === 5, "GeoJSON polygon should be closed");
assert(feature.properties.cropMethod === "manuel", "GeoJSON export should preserve crop metadata");
assert(feature.properties.lat === 38.7 && feature.properties.lng === -9.1, "GeoJSON export should preserve source point coordinates");
assert(feature.properties.bbox === "-9.2,38.7,-9.1,38.8", "GeoJSON export should preserve cell bbox");
const pointFeature = api.fragmentToPointGeoJsonFeature({
  id: "x",
  title: "X",
  lat: "38.7",
  lng: "-9.1",
  cell: "lis.a.b",
  words: "a.b.c",
  source: "test",
  bounds: "-9.2,38.7,-9.1,38.8",
  crop: { method: "manuel", score: 80 },
});
assert(pointFeature.geometry.type === "Point", "Point GeoJSON export should produce point features");
assert(pointFeature.geometry.coordinates[0] === -9.1 && pointFeature.geometry.coordinates[1] === 38.7, "Point GeoJSON should use [lng, lat] coordinates");
assert(pointFeature.properties.cell === "lis.a.b", "Point GeoJSON should preserve cell metadata");
assert(api.escapeCsvValue('A "quoted", value') === '"A ""quoted"", value"', "CSV escaping should quote commas and quotes");
assert(
  api.lqipPixelCounts().join(",") === "1,4,16,64,256,1024,4096,16384",
  "LQIP stages should quadruple their pixel count before the full-resolution image",
);
assert(api.viewportRenderBudget(390, 844) === 235, "mobile viewport should keep a bounded image-render budget");
assert(api.viewportRenderBudget(1920, 1080) === 900, "large viewports should respect the maximum image-render budget");
assert(api.viewportRenderBudget(1, 1) === 160, "tiny viewports should retain a useful minimum render budget");
assert(
  api.formatTargetCoordinates({ lat: 38.7148123, lng: -9.1452456 }) === "38.714812, -9.145246",
  "target coordinate readout should use stable six-decimal GPS formatting",
);
assert(
  api.thumbnailImageUrl("https://example.supabase.co/storage/v1/object/public/azulejos/captures/a.jpg")
    === "/api/image?src=https%3A%2F%2Fexample.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fazulejos%2Fcaptures%2Fa.jpg&w=128&h=128&q=50",
  "Supabase map images should use compact same-origin cached thumbnails",
);
assert(api.thumbnailImageUrl("./assets/local.jpg") === "./assets/local.jpg", "local images should keep their original URL");
const recoveryHandlers = {};
const recoveryClasses = new Set(["is-lqip"]);
const recoveryOverlay = {
  url: "thumbnail.jpg",
  on(name, handler) { recoveryHandlers[name] = handler; },
  setUrl(url) { this.url = url; },
  getElement() {
    return {
      getAttribute: () => this.url,
      classList: {
        add: (name) => recoveryClasses.add(name),
        remove: (name) => recoveryClasses.delete(name),
        toggle(name, enabled) {
          if (enabled) recoveryClasses.add(name);
          else recoveryClasses.delete(name);
        },
      },
    };
  },
};
api.installOverlayImageRecovery(recoveryOverlay, "thumbnail.jpg", "original.jpg");
recoveryHandlers.error();
assert(recoveryOverlay.url === "original.jpg", "a failed thumbnail should retry the original image");
recoveryHandlers.error();
assert(recoveryOverlay.url.startsWith("data:image/"), "a failed original should use a valid neutral image");
assert(recoveryClasses.has("is-image-unavailable"), "an unavailable image should be styled without a broken-image icon");
api.rememberLoadedImageUrl("https://example.test/tile.jpg");
assert(api.isImageUrlLoaded("https://example.test/tile.jpg"), "decoded image URLs should remain ready across viewport changes");
api.rememberLoadedImageUrl("data:image/png;base64,temporary");
assert(!api.isImageUrlLoaded("data:image/png;base64,temporary"), "temporary LQIP data URLs should not pollute the decoded image cache");
const csv = api.fragmentsToCsv([{
  id: "x",
  title: "Azulejo, bleu",
  lat: 38.7,
  lng: -9.1,
  cell: "lis.a.b",
  words: "a.b.c",
  source: "photo terrain",
  crop: { method: "contours", score: 91 },
}]);
assert(csv.startsWith("id,title,lat,lng,cell,words,source,cropMethod,cropScore"), "CSV export should include stable headers");
assert(csv.includes('"Azulejo, bleu"'), "CSV export should escape titles with commas");
assert(csv.includes("contours,91"), "CSV export should include crop metadata");

const gps = await api.readGpsFromExif(createGpsJpeg());
assert(Math.abs(gps.lat - 38.7137222) < 0.0001, "EXIF latitude should parse");
assert(Math.abs(gps.lng + 9.1393333) < 0.0001, "EXIF west longitude should parse negative");

console.log("smoke tests passed");
