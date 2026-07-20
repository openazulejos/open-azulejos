const LISBON = [38.7223, -9.1393];
const HOME_VIEW = {
  center: [38.719152, -9.134188],
  zoom: 16,
};
const LISBON_BOUNDS = {
  south: 38.58,
  west: -9.38,
  north: 38.90,
  east: -8.90,
};
const GRID_METERS = 3;
const FINE_GRID_NEIGHBOR_OFFSETS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, -1],
  [-1, 1],
];
const WEB_MERCATOR_RADIUS = 6378137;
const TILE_SIZE = 34;
const LQIP_SIZES = [1, 2, 4, 8, 16, 32, 64, 128];
const LQIP_STAGE_DELAY_MS = 85;
const LQIP_FALLBACK_PIXEL = "data:image/gif;base64,R0lGODlhAQABAPAAAOjo5P///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
const MAX_LQIP_CACHE_ENTRIES = 1200;
const MAX_LOADED_IMAGE_URLS = 1800;
const MAX_INACTIVE_SERVER_TILES = 360;
const FRAGMENT_INDEX_RENDER_LIMIT = 150;
const MAX_UPLOAD_GPS_ACCURACY_METERS = 100;
const MAX_UPLOAD_GPS_AGE_MS = 120_000;
const RELIABLE_GPS_TIMEOUT_MS = 25_000;
const lqipStageCache = new Map();
const loadedImageUrls = new Map();
const FREGUESIAS_LAYER_URL = "./assets/lisbon-freguesias.geojson";
const LOCAL_WORDS = [
  "azul", "tejo", "alfama", "baixa", "chiado", "graca", "estrela", "belem",
  "azulejo", "calcada", "miradouro", "fado", "rua", "patio", "janela", "fachada",
  "igreja", "fonte", "ponte", "colina", "luz", "sombra", "branco", "cobalto",
  "barro", "vidro", "atelier", "arquivo", "mosaico", "linha", "praca", "porto",
  "tram", "seta", "porta", "torre", "rio", "vento", "pedra", "bairro",
];
const LISBON_NEIGHBORHOODS = [
  {
    name: "belém",
    center: [38.6977, -9.2079],
    polygon: [[38.7047, -9.2298], [38.7111, -9.2053], [38.7019, -9.1859], [38.6902, -9.1912], [38.6881, -9.2195]],
  },
  {
    name: "ajuda",
    center: [38.7088, -9.1999],
    polygon: [[38.7194, -9.2181], [38.7241, -9.1965], [38.7106, -9.1833], [38.7003, -9.1897], [38.7047, -9.2104]],
  },
  {
    name: "estrela",
    center: [38.7133, -9.1602],
    polygon: [[38.7242, -9.1811], [38.7259, -9.1587], [38.7147, -9.1472], [38.7032, -9.1541], [38.7056, -9.1749]],
  },
  {
    name: "campo de ourique",
    center: [38.7193, -9.1687],
    polygon: [[38.7320, -9.1839], [38.7341, -9.1637], [38.7248, -9.1516], [38.7149, -9.1585], [38.7156, -9.1788]],
  },
  {
    name: "chiado",
    center: [38.7108, -9.1432],
    polygon: [[38.7175, -9.1512], [38.7172, -9.1392], [38.7091, -9.1347], [38.7041, -9.1429], [38.7082, -9.1519]],
  },
  {
    name: "baixa",
    center: [38.7116, -9.1361],
    polygon: [[38.7186, -9.1413], [38.7195, -9.1326], [38.7098, -9.1291], [38.7049, -9.1362], [38.7102, -9.1425]],
  },
  {
    name: "alfama",
    center: [38.7129, -9.1278],
    polygon: [[38.7200, -9.1340], [38.7184, -9.1212], [38.7113, -9.1177], [38.7049, -9.1258], [38.7098, -9.1332]],
  },
  {
    name: "mouraria",
    center: [38.7164, -9.1342],
    polygon: [[38.7246, -9.1403], [38.7227, -9.1290], [38.7166, -9.1259], [38.7118, -9.1324], [38.7173, -9.1415]],
  },
  {
    name: "graça",
    center: [38.7197, -9.1291],
    polygon: [[38.7292, -9.1374], [38.7280, -9.1235], [38.7201, -9.1179], [38.7139, -9.1258], [38.7203, -9.1365]],
  },
  {
    name: "avenidas novas",
    center: [38.7357, -9.1501],
    polygon: [[38.7516, -9.1652], [38.7505, -9.1396], [38.7347, -9.1321], [38.7248, -9.1462], [38.7333, -9.1668]],
  },
  {
    name: "arroios",
    center: [38.7281, -9.1377],
    polygon: [[38.7413, -9.1470], [38.7398, -9.1290], [38.7282, -9.1232], [38.7192, -9.1327], [38.7264, -9.1488]],
  },
  {
    name: "parque das nações",
    center: [38.7686, -9.0963],
    polygon: [[38.7958, -9.1082], [38.7898, -9.0841], [38.7505, -9.0872], [38.7428, -9.1030], [38.7667, -9.1161]],
  },
];

const map = L.map("map", {
  zoomControl: false,
  preferCanvas: true,
  minZoom: 12,
  maxZoom: 22,
}).setView(HOME_VIEW.center, HOME_VIEW.zoom);

map.attributionControl.setPrefix(false);
L.control.zoom({ position: "bottomleft" }).addTo(map);
const azulejoPane = typeof map.createPane === "function" ? map.createPane("azulejos") : null;
if (azulejoPane) {
  azulejoPane.style.zIndex = 520;
}
const boundaryPane = typeof map.createPane === "function" ? map.createPane("boundaries") : null;
if (boundaryPane) {
  boundaryPane.style.zIndex = 560;
  boundaryPane.style.pointerEvents = "none";
}
const selectionPane = typeof map.createPane === "function" ? map.createPane("selection") : null;
if (selectionPane) {
  selectionPane.style.zIndex = 620;
  selectionPane.style.pointerEvents = "none";
}
const userLocationPane = typeof map.createPane === "function" ? map.createPane("user-location") : null;
if (userLocationPane) {
  userLocationPane.style.zIndex = 640;
  userLocationPane.style.pointerEvents = "none";
}

const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 22,
  maxNativeZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});

const neighborhoodLayer = L.layerGroup().addTo(map);
const tileLayer = L.layerGroup().addTo(map);
const sampleLayer = L.layerGroup().addTo(tileLayer);
const userLayer = L.layerGroup().addTo(tileLayer);
const gridCanvas = document.querySelector("#gridCanvas");
const gridCtx = gridCanvas.getContext("2d");
const mapAzulejoCount = document.querySelector("#mapAzulejoCount");
const mapZoomPercent = document.querySelector("#mapZoomPercent");
const mapLocationButton = document.querySelector("#mapLocationButton");
const targetCoordinates = document.querySelector("#targetCoordinates");
const cursorReadout = document.querySelector("#cursorReadout");
const tileCount = document.querySelector("#tileCount");
const cellCount = document.querySelector("#cellCount");
const fragmentIndexList = document.querySelector("#fragmentIndexList");
const activeCellCode = document.querySelector("#activeCellCode");
const activeCellCoords = document.querySelector("#activeCellCoords");
const copyActiveCellButton = document.querySelector("#copyActiveCellButton");
const activeCellCopyValue = document.querySelector("#activeCellCopyValue");
const archiveFilterInput = document.querySelector("#archiveFilterInput");
const archiveFilterClearButton = document.querySelector("#archiveFilterClearButton");
const archiveFilterStatus = document.querySelector("#archiveFilterStatus");
const fitMosaicButton = document.querySelector("#fitMosaicButton");
const gridToggle = document.querySelector("#gridToggle");
const mosaicToggle = document.querySelector("#mosaicToggle");
const sampleToggle = document.querySelector("#sampleToggle");
const gridDensity = document.querySelector("#gridDensity");
const mosaicOpacity = document.querySelector("#mosaicOpacity");
const azulejoViewer = document.querySelector("#azulejoViewer");
const azulejoViewerVisual = document.querySelector("#azulejoViewerVisual");
const azulejoViewerImage = document.querySelector("#azulejoViewerImage");
const azulejoViewerMosaic = document.querySelector("#azulejoViewerMosaic");
const azulejoViewerMeta = document.querySelector("#azulejoViewerMeta");
const azulejoViewerCaption = document.querySelector("#azulejoViewerCaption");
const azulejoViewerCredit = document.querySelector("#azulejoViewerCredit");
const azulejoViewerDownload = document.querySelector("#azulejoViewerDownload");
const azulejoViewerEditSeparator = document.querySelector("#azulejoViewerEditSeparator");
const azulejoViewerEdit = document.querySelector("#azulejoViewerEdit");
const azulejoViewerMapLink = document.querySelector("#azulejoViewerMapLink");
const azulejoViewerClose = document.querySelector("#azulejoViewerClose");
const aboutOpenButton = document.querySelector("#aboutOpenButton");
const aboutSheet = document.querySelector("#aboutSheet");
const aboutCloseButton = document.querySelector("#aboutCloseButton");
const aboutContributorsStatus = document.querySelector("#aboutContributorsStatus");
const aboutContributorsList = document.querySelector("#aboutContributorsList");
const adminOpenButton = document.querySelector("#adminOpenButton");
const viewSwitchButton = document.querySelector("#viewSwitchButton");
const viewSwitchLabel = document.querySelector("#viewSwitchLabel");
const viewSwitchMenu = document.querySelector("#viewSwitchMenu");
const azulejoGridView = document.querySelector("#azulejoGridView");
const azulejoGridList = document.querySelector("#azulejoGridList");
const azulejoGridStatus = document.querySelector("#azulejoGridStatus");
const gridNeighborhoodFilter = document.querySelector("#gridNeighborhoodFilter");
const gridColorFilter = document.querySelector("#gridColorFilter");
const gridTypeFilter = document.querySelector("#gridTypeFilter");
const gridMotifFilter = document.querySelector("#gridMotifFilter");
const accountOpenButton = document.querySelector("#accountOpenButton");
const accountSheet = document.querySelector("#accountSheet");
const accountCloseButton = document.querySelector("#accountCloseButton");
const accountGuest = document.querySelector("#accountGuest");
const accountMember = document.querySelector("#accountMember");
const accountLoginMode = document.querySelector("#accountLoginMode");
const accountSignupMode = document.querySelector("#accountSignupMode");
const accountLoginForm = document.querySelector("#accountLoginForm");
const accountSignupForm = document.querySelector("#accountSignupForm");
const accountResetForm = document.querySelector("#accountResetForm");
const accountUpdatePasswordForm = document.querySelector("#accountUpdatePasswordForm");
const accountForgotButton = document.querySelector("#accountForgotButton");
const accountLoginEmail = document.querySelector("#accountLoginEmail");
const accountLoginPassword = document.querySelector("#accountLoginPassword");
const accountSignupPseudonym = document.querySelector("#accountSignupPseudonym");
const accountSignupEmail = document.querySelector("#accountSignupEmail");
const accountSignupPassword = document.querySelector("#accountSignupPassword");
const accountSignupPasswordConfirm = document.querySelector("#accountSignupPasswordConfirm");
const accountResetEmail = document.querySelector("#accountResetEmail");
const accountNewPassword = document.querySelector("#accountNewPassword");
const accountNewPasswordConfirm = document.querySelector("#accountNewPasswordConfirm");
const accountStatus = document.querySelector("#accountStatus");
const accountSettingsStatus = document.querySelector("#accountSettingsStatus");
const accountPseudonym = document.querySelector("#accountPseudonym");
const accountLogoutButton = document.querySelector("#accountLogoutButton");
const accountProfileForm = document.querySelector("#accountProfileForm");
const accountProfilePseudonym = document.querySelector("#accountProfilePseudonym");
const myContributions = document.querySelector("#myContributions");
const myContributionsStatus = document.querySelector("#myContributionsStatus");
const myContributionsTitle = document.querySelector("#myContributionsTitle");
const myContributionsList = document.querySelector("#myContributionsList");
const contributionsGridView = document.querySelector("#contributionsGridView");
const contributionsListView = document.querySelector("#contributionsListView");
const recordHistoryButton = document.querySelector("#recordHistoryButton");
const recordCameraInput = document.querySelector("#recordCameraInput");
const recordOnboarding = document.querySelector("#recordOnboarding");
const recordOnboardingClose = document.querySelector("#recordOnboardingClose");
const recordOnboardingBack = document.querySelector("#recordOnboardingBack");
const recordOnboardingNext = document.querySelector("#recordOnboardingNext");
const recordOnboardingSteps = Array.from(document.querySelectorAll("[data-record-step]"));
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const squareCamera = document.querySelector("#squareCamera");
const squareCameraVideo = document.querySelector("#squareCameraVideo");
const squareCameraCapture = document.querySelector("#squareCameraCapture");
const squareCameraCancel = document.querySelector("#squareCameraCancel");
const squareCameraFallback = document.querySelector("#squareCameraFallback");
const squareCameraPermissions = document.querySelector("#squareCameraPermissions");
const cameraPermissionStep = document.querySelector("#cameraPermissionStep");
const locationPermissionStep = document.querySelector("#locationPermissionStep");
const capturePreview = document.querySelector("#capturePreview");
const captureCropCanvas = document.querySelector("#captureCropCanvas");
const captureCropZoom = document.querySelector("#captureCropZoom");
const captureCropX = document.querySelector("#captureCropX");
const captureCropY = document.querySelector("#captureCropY");
const captureRetakeButton = document.querySelector("#captureRetakeButton");
const captureSendButton = document.querySelector("#captureSendButton");
const locationPermissionSheet = document.querySelector("#locationPermissionSheet");
const locationPermissionClose = document.querySelector("#locationPermissionClose");
const locationPermissionMessage = document.querySelector("#locationPermissionMessage");
const locationPermissionInstructions = document.querySelector("#locationPermissionInstructions");
const locationPermissionHelp = document.querySelector("#locationPermissionHelp");
const locationPermissionRetry = document.querySelector("#locationPermissionRetry");
const cellSearchForm = document.querySelector("#cellSearchForm");
const cellSearchInput = document.querySelector("#cellSearchInput");
const cellSearchStatus = document.querySelector("#cellSearchStatus");
const sourcePreview = document.querySelector("#sourcePreview");
const tilePreview = document.querySelector("#tilePreview");
const cropStatus = document.querySelector("#cropStatus");
const cropXInput = document.querySelector("#cropXInput");
const cropYInput = document.querySelector("#cropYInput");
const cropSizeInput = document.querySelector("#cropSizeInput");
const imageInput = document.querySelector("#imageInput");
const placeTileButton = document.querySelector("#placeTileButton");
const latInput = document.querySelector("#latInput");
const lngInput = document.querySelector("#lngInput");
const batchImagesInput = document.querySelector("#batchImagesInput");
const geoDataInput = document.querySelector("#geoDataInput");
const archiveInput = document.querySelector("#archiveInput");
const batchStatus = document.querySelector("#batchStatus");
const loadDemoButton = document.querySelector("#loadDemoButton");
const processBatchButton = document.querySelector("#processBatchButton");
const exportButton = document.querySelector("#exportButton");
const exportGeoJsonButton = document.querySelector("#exportGeoJsonButton");
const exportPointGeoJsonButton = document.querySelector("#exportPointGeoJsonButton");
const exportCsvButton = document.querySelector("#exportCsvButton");
const clearImportsButton = document.querySelector("#clearImportsButton");

let extractedTileDataUrl = "";
let currentImportImage = null;
let currentCrop = null;
let markerIndex = 0;
let uploadedImages = new Map();
let importedGeoRows = [];
let placedTiles = [];
let highlightedCell = null;
let activeCell = null;
let displayedTiles = [];
let lastGeoReport = { total: 0, valid: 0, ignored: 0 };
let cityClipPolygons = [];
let highlightedSelection = null;
let squareCameraStream = null;
let pendingCapture = null;
const CAPTURE_MIN_ZOOM = 1.22;
let activeViewerTileId = null;
let activeViewerTile = null;
let activeViewerOrigin = "map";
let viewerMosaicMode = 0;
let viewerGesture = null;
let viewerMosaicRenderToken = 0;
let targetCoordinatesCopyTimer = null;
const viewerMosaicMatchCache = new Map();
let userLocationMarker = null;
let userLocationWatchId = null;
let latestUserLocation = null;
let userLocationSearchTimer = null;
let adminCaptureSession = false;
let adminSessionChecked = false;
const CONTRIBUTION_RECEIPTS_KEY = "open-azulejos-contribution-receipts";
const CONTRIBUTION_VIEW_KEY = "open-azulejos-contribution-view";
const ACCOUNT_INVITE_COUNT_KEY = "open-azulejos-account-invite-count";
const ACCOUNT_INVITE_THRESHOLD = 3;
let contributorAccount = null;
let serverTilesById = new Map();
let serverTileCacheById = new Map();
let serverViewportCount = 0;
let serverTotalCount = 0;
let serverCountsLoaded = false;
let serverViewportRequest = null;
let serverViewportSequence = 0;
let serverViewportTimer = null;
let accountRecoveryAccessToken = "";
let contributorStatsLoaded = false;
let activeViewMode = "map";
let gridRecords = [];
let gridRecordsLoaded = false;
let gridRecordsLoading = false;
let gridRecordsError = "";
const gridColorCache = new Map();
let gridColorAnalysisToken = 0;
let allCityClipPolygons = [];
const neighborhoodClipPolygons = new Map();

const sampleTiles = [
  {
    id: "terrain-flower-006",
    title: "terrain flower",
    lat: 38.71518,
    lng: -9.13764,
    image: "./assets/azulejo-field-flower.jpg",
    minZoom: 12,
  },
  {
    id: "terrain-bird-007",
    title: "terrain bird",
    lat: 38.71692,
    lng: -9.13200,
    image: "./assets/azulejo-field-bird.jpg",
    minZoom: 12,
  },
];

function normalizeNeighborhoodKey(value) {
  return normalizeGridFilterValue(value);
}

function selectedNeighborhoodKey() {
  const key = normalizeNeighborhoodKey(gridNeighborhoodFilter?.value);
  return key && key !== "all" ? key : "";
}

function activeClipPolygons() {
  const selected = selectedNeighborhoodKey();
  if (selected && neighborhoodClipPolygons.has(selected)) return neighborhoodClipPolygons.get(selected);
  return allCityClipPolygons.length ? allCityClipPolygons : cityClipPolygons;
}

function drawBoundaryPolygon(latLngPolygons) {
  L.polygon(latLngPolygons.length === 1 ? latLngPolygons[0] : latLngPolygons, {
    className: "neighborhood-cut",
    color: "#151515",
    weight: 1,
    fillColor: "#ffffff",
    fillOpacity: 0,
    opacity: 0.72,
    pane: "boundaries",
    interactive: false,
  }).addTo(neighborhoodLayer);
}

function drawFallbackNeighborhoods() {
  allCityClipPolygons = LISBON_NEIGHBORHOODS.map((neighborhood) => [neighborhood.polygon]);
  cityClipPolygons = allCityClipPolygons;
  neighborhoodClipPolygons.clear();
  LISBON_NEIGHBORHOODS.forEach((neighborhood) => {
    neighborhoodClipPolygons.set(normalizeNeighborhoodKey(neighborhood.name), [[...neighborhood.polygon]]);
  });
  renderNeighborhoodLayer();
}

function renderNeighborhoodLayer() {
  neighborhoodLayer.clearLayers();
  const selected = selectedNeighborhoodKey();
  if (selected && neighborhoodClipPolygons.has(selected)) {
    drawBoundaryPolygon(neighborhoodClipPolygons.get(selected));
    return;
  }
  const polygons = allCityClipPolygons.length ? allCityClipPolygons : cityClipPolygons;
  polygons.forEach((polygon) => {
    drawBoundaryPolygon(polygon);
  });
}

function fitSelectedNeighborhoodOnMap() {
  const selected = selectedNeighborhoodKey();
  if (!selected || !neighborhoodClipPolygons.has(selected)) return;
  const points = neighborhoodClipPolygons.get(selected)
    .flatMap((polygon) => polygon.flatMap((ring) => ring));
  if (!points.length) return;
  const bounds = L.latLngBounds(points);
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [90, 90], maxZoom: 17 });
  }
}

function featurePolygons(feature) {
  if (!feature?.geometry) return [];
  if (feature.geometry.type === "Polygon") return [feature.geometry.coordinates];
  if (feature.geometry.type === "MultiPolygon") return feature.geometry.coordinates;
  return [];
}

function polygonToLatLngs(polygon) {
  return polygon
    .map((ring) => ring.map(([lng, lat]) => [lat, lng]))
    .filter((ring) => ring.length >= 4);
}

async function loadNeighborhoodLayer() {
  if (typeof fetch !== "function") {
    drawFallbackNeighborhoods();
    return false;
  }
  try {
    const response = await fetch(FREGUESIAS_LAYER_URL);
    if (!response.ok) throw new Error(`layer ${response.status}`);
    const collection = await response.json();
    neighborhoodLayer.clearLayers();
    neighborhoodClipPolygons.clear();
    allCityClipPolygons = collection.features
      .flatMap((feature) => featurePolygons(feature).map(polygonToLatLngs))
      .filter((polygon) => polygon.length);
    cityClipPolygons = allCityClipPolygons;
    collection.features.forEach((feature) => {
      const latLngPolygons = featurePolygons(feature)
        .map(polygonToLatLngs)
        .filter((polygon) => polygon.length);
      const name = feature.properties?.name;
      if (name && latLngPolygons.length) neighborhoodClipPolygons.set(normalizeNeighborhoodKey(name), latLngPolygons);
    });
    renderNeighborhoodLayer();
    drawGrid();
    return true;
  } catch {
    neighborhoodLayer.clearLayers();
    drawFallbackNeighborhoods();
    drawGrid();
    return false;
  }
}

function lonLatToMeters(lng, lat) {
  const x = WEB_MERCATOR_RADIUS * lng * Math.PI / 180;
  const y = WEB_MERCATOR_RADIUS * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  return { x, y };
}

function metersToLonLat(x, y) {
  const lng = x / WEB_MERCATOR_RADIUS * 180 / Math.PI;
  const lat = (2 * Math.atan(Math.exp(y / WEB_MERCATOR_RADIUS)) - Math.PI / 2) * 180 / Math.PI;
  return { lat, lng };
}

function cellForLatLng(lat, lng) {
  const meters = lonLatToMeters(lng, lat);
  const cx = Math.floor(meters.x / GRID_METERS);
  const cy = Math.floor(meters.y / GRID_METERS);
  const code = `lis.${cx.toString(36)}.${cy.toString(36)}`;
  return { cx, cy, code, words: localWordsForCell(cx, cy) };
}

function positiveHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function localWordsForCell(cx, cy) {
  const seed = `${cx}:${cy}`;
  const a = positiveHash(`${seed}:a`);
  const b = positiveHash(`${seed}:b`);
  const c = positiveHash(`${seed}:c`);
  return [
    LOCAL_WORDS[a % LOCAL_WORDS.length],
    LOCAL_WORDS[b % LOCAL_WORDS.length],
    LOCAL_WORDS[c % LOCAL_WORDS.length],
  ].join(".");
}

function parseCellCode(value) {
  const match = value.trim().toLowerCase().match(/^lis\.(-?[0-9a-z]+)\.(-?[0-9a-z]+)$/);
  if (!match) return null;
  const cx = Number.parseInt(match[1], 36);
  const cy = Number.parseInt(match[2], 36);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return { cx, cy, code: `lis.${cx.toString(36)}.${cy.toString(36)}`, words: localWordsForCell(cx, cy) };
}

function boundsForCell(cell) {
  const westSouth = metersToLonLat(cell.cx * GRID_METERS, cell.cy * GRID_METERS);
  const eastNorth = metersToLonLat((cell.cx + 1) * GRID_METERS, (cell.cy + 1) * GRID_METERS);
  return L.latLngBounds(
    [westSouth.lat, westSouth.lng],
    [eastNorth.lat, eastNorth.lng],
  );
}

function normalizedCellFromCell(cell) {
  if (!cell) return null;
  if (Number.isFinite(cell.cx) && Number.isFinite(cell.cy)) {
    return {
      cx: cell.cx,
      cy: cell.cy,
      code: cell.code || `lis.${cell.cx.toString(36)}.${cell.cy.toString(36)}`,
      words: cell.words || localWordsForCell(cell.cx, cell.cy),
    };
  }
  if (Number.isFinite(cell.lat) && Number.isFinite(cell.lng)) {
    return cellForLatLng(cell.lat, cell.lng);
  }
  return null;
}

function cellCenter(cell) {
  const bounds = boundsForCell(cell);
  const center = bounds.getCenter();
  return { lat: center.lat, lng: center.lng };
}

function activeCellText(cell = activeCell) {
  const normalized = normalizedCellFromCell(cell);
  if (!normalized) return "";
  const center = cellCenter(normalized);
  return `${normalized.code} | ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
}

function cellHash(cell) {
  const normalized = normalizedCellFromCell(cell);
  return normalized ? `cell=${encodeURIComponent(normalized.code)}` : "";
}

function cellFromHash(hash) {
  const cleanHash = hash.replace(/^#/, "");
  if (!cleanHash) return null;
  if (cleanHash.startsWith("lis.")) return parseCellCode(cleanHash);
  const params = new URLSearchParams(cleanHash);
  const code = params.get("cell");
  return code ? parseCellCode(code) : null;
}

function updateCellHash(cell) {
  const hash = cellHash(cell);
  if (!hash || window.location.hash.replace(/^#/, "") === hash) return;
  window.history.replaceState(null, "", `#${hash}`);
}

function setActiveCell(cell) {
  const normalized = normalizedCellFromCell(cell);
  if (!normalized) return null;
  activeCell = normalized;
  const center = cellCenter(normalized);
  activeCellCode.textContent = normalized.code;
  activeCellCoords.textContent = `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
  activeCellCopyValue.value = activeCellText(normalized);
  activeCellCopyValue.classList.remove("is-visible");
  copyActiveCellButton.disabled = false;
  copyActiveCellButton.textContent = "copier cellule";
  return normalized;
}

async function copyTextToClipboard(text, fallbackInput = activeCellCopyValue) {
  if (!text) return false;
  if (fallbackInput) fallbackInput.value = text;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    fallbackInput?.classList.add("is-visible");
    fallbackInput?.focus();
    fallbackInput?.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    return copied;
  }
}

async function copyActiveCell() {
  const text = activeCellText();
  if (!text) return false;
  const copied = await copyTextToClipboard(text, activeCellCopyValue);
  if (copied) activeCellCopyValue.classList.remove("is-visible");
  copyActiveCellButton.textContent = copied ? "copié" : "texte prêt";
  return copied;
}

function highlightCell(cell, options = {}) {
  const normalized = setActiveCell(cell);
  if (!normalized) return;
  if (options.hash !== false) {
    updateCellHash(normalized);
  }
  const selectionPoint = options.latlng
    || (Number.isFinite(cell.lat) && Number.isFinite(cell.lng) ? { lat: cell.lat, lng: cell.lng } : null)
    || cellCenter(normalized);
  highlightedSelection = {
    cell: normalized,
    lat: selectionPoint.lat,
    lng: selectionPoint.lng,
  };
  renderHighlightedSelection(options);
  cursorReadout.textContent = normalized.code;
  cellSearchStatus.textContent = normalized.code;
}

function renderHighlightedSelection(options = {}) {
  if (!highlightedSelection) return;
  if (highlightedCell) {
    highlightedCell.remove();
  }
  const bounds = boundsForSnappedGridSquare(highlightedSelection.lat, highlightedSelection.lng);
  highlightedCell = L.layerGroup().addTo(map);
  L.rectangle(bounds, {
    className: "cell-highlight",
    color: "#000000",
    weight: 2,
    fillColor: "#fff4a8",
    fillOpacity: 0.22,
    pane: "selection",
    interactive: false,
  }).addTo(highlightedCell);
  if (options.fit !== false) {
    map.fitBounds(bounds.pad(1.2), { maxZoom: 21 });
  }
}

function cellOccupancy() {
  return visibleTiles().reduce((counts, tile) => {
    counts.set(tile.cell, (counts.get(tile.cell) || 0) + 1);
    return counts;
  }, new Map());
}

function visibleTiles() {
  if (!mosaicToggle.checked) return [];
  return displayedTiles.filter((tile) => tileVisibleAtZoom(tile) && mapTileMatchesFilters(tile) && !tile.isLayoutHidden);
}

function tileInsideMapScene(tile, bounds = map.getBounds()) {
  const lat = Number(tile?.lat);
  const lng = Number(tile?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !bounds) return false;
  return lat >= Number(bounds.getSouth())
    && lat <= Number(bounds.getNorth())
    && lng >= Number(bounds.getWest())
    && lng <= Number(bounds.getEast());
}

function localSceneAzulejoCounts(tiles = displayedTiles, bounds = map.getBounds(), zoom = map.getZoom()) {
  const registered = tiles.filter((tile) => tile.source === "supabase-camera" && mapTileMatchesFilters(tile));
  const visible = tilesInMapScene(registered, bounds, zoom);
  return { visible: visible.length, total: registered.length };
}

function sceneAzulejoCounts(tiles = displayedTiles, bounds = map.getBounds(), zoom = map.getZoom()) {
  const filteredMap = normalizeGridFilterValue(gridNeighborhoodFilter?.value) !== "all"
    || normalizeGridFilterValue(gridColorFilter?.value) !== "all"
    || normalizeGridFilterValue(gridTypeFilter?.value) !== "all"
    || normalizeGridFilterValue(gridMotifFilter?.value) !== "all";
  if (filteredMap) {
    const local = localSceneAzulejoCounts(tiles, bounds, zoom);
    const total = gridRecordsLoaded ? gridRecords.filter(gridTileMatchesFilters).length : local.total;
    return { visible: local.visible, total: Math.max(total, local.visible) };
  }
  const fallback = localSceneAzulejoCounts(tiles, bounds, zoom);
  if (serverCountsLoaded && tiles === displayedTiles) {
    if (serverViewportCount > 0 || serverTotalCount > 0 || fallback.total === 0) {
      return {
        visible: serverViewportCount,
        total: Math.max(serverTotalCount, serverViewportCount),
      };
    }
    return fallback;
  }
  if (tiles === displayedTiles && serverTotalCount > fallback.total) {
    return { visible: fallback.visible, total: serverTotalCount };
  }
  return fallback;
}

function tilesInMapScene(tiles = displayedTiles, bounds = map.getBounds(), zoom = map.getZoom()) {
  return tiles.filter((tile) => (
    tileVisibleAtZoom(tile, zoom)
    && !tile.isLayoutHidden
    && tileInsideMapScene(tile, bounds)
  ));
}

function updateMapAzulejoCount() {
  if (!mapAzulejoCount) return;
  const counts = sceneAzulejoCounts();
  mapAzulejoCount.textContent = `${counts.visible}/${counts.total}`;
}

function finiteCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : null;
}

function normalizeServerSceneCounts(data = {}, records = [], fallback = {}) {
  const recordCount = Array.isArray(records) ? records.length : 0;
  const fallbackVisible = finiteCount(fallback.visible);
  const fallbackTotal = finiteCount(fallback.total);
  const visibleFromServer = finiteCount(data.visibleCount);
  const totalFromServer = finiteCount(data.totalCount);
  const visible = visibleFromServer ?? (recordCount > 0 ? recordCount : fallbackVisible ?? 0);
  const total = totalFromServer ?? Math.max(visible, fallbackTotal ?? 0);
  return {
    visible,
    total: Math.max(total, visible),
  };
}

function invalidateServerViewportCounts() {
  serverCountsLoaded = false;
}

function tileVisibleAtZoom(tile, zoom = map.getZoom()) {
  if (!mosaicToggle.checked) return false;
  if (tile.isSample && !sampleToggle.checked) return false;
  const minZoom = Number.isFinite(tile.minZoom) ? tile.minZoom : tile.isSample ? 15 : 16;
  return zoom >= minZoom;
}

function setLayerPresence(parentLayer, childLayer, visible) {
  if (!parentLayer || !childLayer) return;
  const hasLayer = typeof parentLayer.hasLayer === "function"
    ? parentLayer.hasLayer(childLayer)
    : false;
  if (visible && !hasLayer) {
    parentLayer.addLayer(childLayer);
  } else if (!visible && hasLayer) {
    parentLayer.removeLayer(childLayer);
  }
}

function refreshTileVisibility() {
  const sceneBounds = map.getBounds();
  const fineGridLayout = allocateFineGridDisplayCells(
    displayedTiles.filter((tile) => tileVisibleAtZoom(tile) && mapTileMatchesFilters(tile)),
    map.getZoom(),
    Number(gridDensity.value),
  );
  displayedTiles.forEach((tile) => {
    const displayCell = fineGridLayout?.get(tile);
    tile.isLayoutHidden = fineGridLayout instanceof Map && !displayCell;
    const visible = tileVisibleAtZoom(tile)
      && mapTileMatchesFilters(tile)
      && !tile.isLayoutHidden
      && tileInsideMapScene(tile, sceneBounds);
    updateTileOverlayBounds(tile, displayCell);
    setLayerPresence(tile.layerGroup, tile.mosaicCell, visible);
    if (visible && !tile.imageLoadStarted) {
      tile.imageLoadStarted = true;
      revealAzulejoProgressively(tile.mosaicCell, tile.displayImage || tile.image, tile.image);
    }
  });
  updateCounts();
  updateMapAzulejoCount();
  renderFragmentIndex();
}

function boundsForSnappedGridSquare(lat, lng, zoom = map.getZoom()) {
  const density = Number(gridDensity.value);
  const step = gridStepForZoom(zoom, density);
  const meters = lonLatToMeters(lng, lat);
  const west = Math.floor(meters.x / step) * step;
  const south = Math.floor(meters.y / step) * step;
  const southWest = metersToLonLat(west, south);
  const northEast = metersToLonLat(west + step, south + step);
  return L.latLngBounds(
    [southWest.lat, southWest.lng],
    [northEast.lat, northEast.lng],
  );
}

function gridCellKey(cx, cy) {
  return `${cx}:${cy}`;
}

function allocateFineGridDisplayCells(tiles, zoom = map.getZoom(), density = Number(gridDensity.value)) {
  if (gridStepForZoom(zoom, density) !== GRID_METERS) return null;
  const candidates = tiles.filter((tile) => Number.isFinite(tile?.cx) && Number.isFinite(tile?.cy));
  const trueCells = new Set(candidates.map((tile) => gridCellKey(tile.cx, tile.cy)));
  const occupiedDisplayCells = new Set();
  const layout = new Map();

  candidates.forEach((tile) => {
    const trueKey = gridCellKey(tile.cx, tile.cy);
    if (!occupiedDisplayCells.has(trueKey)) {
      occupiedDisplayCells.add(trueKey);
      layout.set(tile, { cx: tile.cx, cy: tile.cy });
      return;
    }

    const offset = FINE_GRID_NEIGHBOR_OFFSETS.find(([dx, dy]) => {
      const candidateKey = gridCellKey(tile.cx + dx, tile.cy + dy);
      return !trueCells.has(candidateKey) && !occupiedDisplayCells.has(candidateKey);
    });
    if (!offset) {
      layout.set(tile, null);
      return;
    }
    const [dx, dy] = offset;
    const displayCell = { cx: tile.cx + dx, cy: tile.cy + dy };
    occupiedDisplayCells.add(gridCellKey(displayCell.cx, displayCell.cy));
    layout.set(tile, displayCell);
  });

  return layout;
}

function updateTileOverlayBounds(tile, displayCell = null) {
  if (!tile?.mosaicCell || typeof tile.mosaicCell.setBounds !== "function") return;
  tile.displayCell = displayCell;
  tile.displayBounds = displayCell ? boundsForCell(displayCell) : boundsForSnappedGridSquare(tile.lat, tile.lng);
  tile.mosaicCell.setBounds(tile.displayBounds);
}

function googleMapsUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

function geodataCaption(tile) {
  return `${tile.lat.toFixed(6)}, ${tile.lng.toFixed(6)} · ${tile.cell}`;
}

function contributorCredit(tile) {
  return String(tile?.photographerCredit || tile?.photographer_credit || tile?.contributor || "").trim()
    || "anonymous";
}

function licenseLabel(tile) {
  const license = String(tile?.photoLicense || tile?.photo_license || "").trim();
  if (!license) return "";
  return license.toUpperCase() === "CC-BY-4.0" ? "CC BY 4.0" : license;
}

function imageDownloadName(tile) {
  const id = String(tile?.id || "azulejo").replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "");
  return `open-azulejos-${id || "image"}.jpg`;
}

function adminEditUrl(tile) {
  const id = String(tile?.id || "").trim();
  return id ? `/admin?edit=${encodeURIComponent(id)}#moderation` : "/admin#moderation";
}

function syncViewerAdminEdit(tile) {
  const canEdit = Boolean(adminCaptureSession && tile?.id);
  if (azulejoViewerEditSeparator) azulejoViewerEditSeparator.hidden = !canEdit;
  if (!azulejoViewerEdit) return;
  azulejoViewerEdit.hidden = !canEdit;
  azulejoViewerEdit.href = canEdit ? adminEditUrl(tile) : "/admin#moderation";
}

function updateTileOpenData(tile, record) {
  if (!tile || !record) return;
  tile.photographerCredit = record.photographer_credit || record.photographerCredit || record.contributor || tile.photographerCredit || "";
  tile.photoLicense = record.photo_license || record.photoLicense || tile.photoLicense || "";
}

function displayCellForTile(tile) {
  const displayCell = tile?.displayCell;
  if (!Number.isFinite(displayCell?.cx) || !Number.isFinite(displayCell?.cy)) return null;
  return normalizedCellFromCell(displayCell);
}

function selectionCellForTile(tile, options = {}) {
  const displayCell = options.preferDisplayCell ? displayCellForTile(tile) : null;
  if (displayCell) {
    const center = cellCenter(displayCell);
    return { ...displayCell, lat: center.lat, lng: center.lng };
  }
  const storedCell = Number.isFinite(tile?.cx) && Number.isFinite(tile?.cy)
    ? normalizedCellFromCell({ cx: tile.cx, cy: tile.cy, code: tile.cell, words: tile.words })
    : parseCellCode(String(tile?.cell || ""));
  if (options.preferStoredCell && storedCell) {
    const center = cellCenter(storedCell);
    return { ...storedCell, lat: center.lat, lng: center.lng };
  }
  const lat = Number(tile?.lat);
  const lng = Number(tile?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { ...cellForLatLng(lat, lng), lat, lng };
  if (!storedCell) return null;
  const center = cellCenter(storedCell);
  return { ...storedCell, lat: center.lat, lng: center.lng };
}

function viewerTileFromContribution(record) {
  const selection = selectionCellForTile(record);
  const image = record?.imageUrl || record?.image_url || "";
  if (!selection || !record?.id || !image) return null;
  return {
    id: record.id,
    title: record.title || "recorded azulejo",
    lat: selection.lat,
    lng: selection.lng,
    image,
    source: "supabase-camera",
    minZoom: 12,
    ...selection,
    cell: record.cell || selection.code,
    photographerCredit: record.photographerCredit || record.photographer_credit || record.contributor || "",
    photoLicense: record.photoLicense || record.photo_license || "",
  };
}

function viewerTiles() {
  return tilesInMapScene(visibleTiles())
    .filter((tile) => tile.image)
    .slice()
    .sort((a, b) => {
      if (Math.abs(Number(b.lat) - Number(a.lat)) > 0.00001) return Number(b.lat) - Number(a.lat);
      return Number(a.lng) - Number(b.lng);
    });
}

function viewerMosaicCells() {
  const cells = [];
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      if (Math.abs(row - 3) + Math.abs(column - 3) <= 3) {
        cells.push({ row, column });
      }
    }
  }
  return cells;
}

function viewerMosaicRotation(mode, row, column) {
  if (mode === 1) return 0;
  if (mode === 2) return ((row + column) % 2) * 90;

  const vertical = row - 3;
  const horizontal = column - 3;
  if (vertical === 0 && horizontal === 0) return 0;
  if (Math.abs(horizontal) > Math.abs(vertical)) return horizontal > 0 ? 90 : 270;
  return vertical > 0 ? 180 : 0;
}

function mosaicEdgeDifference(first, second) {
  let difference = 0;
  const length = Math.min(first.length, second.length);
  for (let index = 0; index < length; index += 4) {
    const red = Number(first[index]) - Number(second[index]);
    const green = Number(first[index + 1]) - Number(second[index + 1]);
    const blue = Number(first[index + 2]) - Number(second[index + 2]);
    difference += (red * red * 0.3) + (green * green * 0.59) + (blue * blue * 0.11);
  }
  return difference / Math.max(1, length / 4);
}

function edgeCostTables(signatures) {
  const horizontal = Array.from({ length: 4 }, () => Array(4).fill(0));
  const vertical = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let first = 0; first < 4; first += 1) {
    for (let second = 0; second < 4; second += 1) {
      horizontal[first][second] = mosaicEdgeDifference(signatures[first].right, signatures[second].left);
      vertical[first][second] = mosaicEdgeDifference(signatures[first].bottom, signatures[second].top);
    }
  }
  return { horizontal, vertical };
}

function edgeMatchedMosaicRotations(horizontalCosts, verticalCosts, cells = viewerMosaicCells()) {
  const indexByPosition = new Map(cells.map((cell, index) => [`${cell.row}:${cell.column}`, index]));
  const pairs = [];
  cells.forEach((cell, index) => {
    const right = indexByPosition.get(`${cell.row}:${cell.column + 1}`);
    const below = indexByPosition.get(`${cell.row + 1}:${cell.column}`);
    if (right !== undefined) pairs.push({ first: index, second: right, axis: "horizontal" });
    if (below !== undefined) pairs.push({ first: index, second: below, axis: "vertical" });
  });

  const starts = [
    cells.map(() => 0),
    cells.map((cell) => (cell.row + cell.column) % 2),
    cells.map((cell) => ((cell.row + cell.column) % 2) * 2),
    cells.map((cell) => (cell.row * 3 + cell.column) % 4),
    cells.map((cell) => (cell.row + cell.column * 3) % 4),
    cells.map((cell) => Math.round(viewerMosaicRotation(3, cell.row, cell.column) / 90) % 4),
  ];

  function pairCost(pair, rotations) {
    const costs = pair.axis === "horizontal" ? horizontalCosts : verticalCosts;
    return costs[rotations[pair.first]][rotations[pair.second]];
  }

  function totalCost(rotations) {
    return pairs.reduce((sum, pair) => sum + pairCost(pair, rotations), 0);
  }

  let bestRotations = starts[0];
  let bestCost = totalCost(bestRotations);
  starts.forEach((start) => {
    const rotations = start.slice();
    for (let pass = 0; pass < 18; pass += 1) {
      let changed = false;
      const order = pass % 2 === 0 ? cells.map((_, index) => index) : cells.map((_, index) => index).reverse();
      order.forEach((cellIndex) => {
        const previousRotation = rotations[cellIndex];
        const connectedPairs = pairs.filter((pair) => pair.first === cellIndex || pair.second === cellIndex);
        let selectedRotation = rotations[cellIndex];
        let selectedCost = connectedPairs.reduce((sum, pair) => sum + pairCost(pair, rotations), 0);
        for (let candidate = 0; candidate < 4; candidate += 1) {
          rotations[cellIndex] = candidate;
          const candidateCost = connectedPairs.reduce((sum, pair) => sum + pairCost(pair, rotations), 0);
          if (candidateCost < selectedCost - 0.001) {
            selectedCost = candidateCost;
            selectedRotation = candidate;
          }
        }
        changed ||= selectedRotation !== previousRotation;
        rotations[cellIndex] = selectedRotation;
      });
      if (!changed) break;
    }
    const cost = totalCost(rotations);
    if (cost < bestCost) {
      bestCost = cost;
      bestRotations = rotations.slice();
    }
  });
  return bestRotations;
}

async function tileEdgeSignatures(imageUrl) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  await new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", reject, { once: true });
    image.src = imageUrl;
  });

  const size = 48;
  const inset = 3;
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  return Array.from({ length: 4 }, (_, quarterTurn) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.translate(size / 2, size / 2);
    context.rotate(quarterTurn * Math.PI / 2);
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, -size / 2, -size / 2, size, size);
    context.setTransform(1, 0, 0, 1, 0, 0);
    const pixels = context.getImageData(0, 0, size, size).data;
    const edge = (side) => {
      const values = [];
      for (let position = inset; position < size - inset; position += 1) {
        const x = side === "left" ? inset : side === "right" ? size - 1 - inset : position;
        const y = side === "top" ? inset : side === "bottom" ? size - 1 - inset : position;
        const offset = (y * size + x) * 4;
        values.push(pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3]);
      }
      return values;
    };
    return { top: edge("top"), right: edge("right"), bottom: edge("bottom"), left: edge("left") };
  });
}

async function matchedRotationsForImage(imageUrl) {
  if (!viewerMosaicMatchCache.has(imageUrl)) {
    const match = tileEdgeSignatures(imageUrl)
      .then((signatures) => {
        const costs = edgeCostTables(signatures);
        return edgeMatchedMosaicRotations(costs.horizontal, costs.vertical);
      })
      .catch((error) => {
        viewerMosaicMatchCache.delete(imageUrl);
        throw error;
      });
    viewerMosaicMatchCache.set(imageUrl, match);
  }
  return viewerMosaicMatchCache.get(imageUrl);
}

async function applyEdgeMatchedMosaic(imageUrl, renderToken) {
  try {
    const rotations = await matchedRotationsForImage(imageUrl);
    if (renderToken !== viewerMosaicRenderToken || viewerMosaicMode !== 3) return;
    azulejoViewerMosaic.querySelectorAll(".azulejo-viewer-mosaic-cell").forEach((cell, index) => {
      cell.style.setProperty("--tile-rotation", `${rotations[index] * 90}deg`);
    });
  } catch (error) {
    console.warn("Automatic mosaic matching unavailable", error);
  }
}

function setViewerMosaicMode(mode, tile = viewerTiles().find((item) => item.id === activeViewerTileId)) {
  if (!azulejoViewerVisual || !azulejoViewerMosaic) return;
  const renderToken = ++viewerMosaicRenderToken;
  viewerMosaicMode = ((Number(mode) % 4) + 4) % 4;
  azulejoViewerVisual.classList.toggle("is-mosaic", viewerMosaicMode > 0);
  azulejoViewerMosaic.setAttribute("aria-hidden", viewerMosaicMode > 0 ? "false" : "true");
  azulejoViewerMosaic.textContent = "";
  if (!viewerMosaicMode || !tile?.image) return;

  viewerMosaicCells().forEach(({ row, column }) => {
    const cell = document.createElement("div");
    const image = document.createElement("img");
    cell.className = "azulejo-viewer-mosaic-cell";
    cell.style.gridRow = String(row + 1);
    cell.style.gridColumn = String(column + 1);
    cell.style.setProperty("--tile-rotation", `${viewerMosaicRotation(viewerMosaicMode, row, column)}deg`);
    image.src = tile.image;
    image.alt = "";
    image.draggable = false;
    cell.append(image);
    azulejoViewerMosaic.append(cell);
  });
  if (viewerMosaicMode === 3) applyEdgeMatchedMosaic(tile.image, renderToken);
}

function cycleViewerMosaic() {
  setViewerMosaicMode((viewerMosaicMode + 1) % 4);
}

function renderAzulejoViewerTile(tile) {
  if (!tile || !azulejoViewerImage || !azulejoViewerCaption) return;
  activeViewerTileId = tile.id;
  activeViewerTile = tile;
  azulejoViewerImage.src = tile.image;
  azulejoViewerImage.alt = tile.title;
  azulejoViewerCaption.textContent = geodataCaption(tile);
  azulejoViewerCaption.href = googleMapsUrl(tile.lat, tile.lng);
  if (azulejoViewerCredit) {
    const license = licenseLabel(tile);
    azulejoViewerCredit.textContent = `contributor: ${contributorCredit(tile)}${license ? ` · ${license}` : ""}`;
  }
  if (azulejoViewerDownload) {
    azulejoViewerDownload.href = tile.image;
    azulejoViewerDownload.download = imageDownloadName(tile);
  }
  syncViewerAdminEdit(tile);
  if (!adminSessionChecked) refreshAdminCaptureSession();
  setViewerMosaicMode(0, tile);
}

function openAzulejoViewer(tile, options = {}) {
  if (!azulejoViewer || !azulejoViewerImage || !azulejoViewerCaption) return;
  activeViewerOrigin = options.origin || "map";
  renderAzulejoViewerTile(tile);
  azulejoViewer.classList.add("is-open");
  azulejoViewer.classList.toggle("is-contribution-origin", activeViewerOrigin === "contributions");
  azulejoViewer.setAttribute("aria-hidden", "false");
}

function shouldRestoreViewerMapSelection(origin, options = {}) {
  return origin !== "contributions" && options.restoreMapSelection !== false;
}

function shouldReopenAccountAfterViewerClose(origin, options = {}) {
  return origin === "contributions" && options.reopenAccount !== false;
}

function closeAzulejoViewer(options = {}) {
  if (!azulejoViewer || !azulejoViewerImage) return;
  const selectedTile = activeViewerTile;
  const origin = activeViewerOrigin;
  const shouldRestoreMapSelection = shouldRestoreViewerMapSelection(activeViewerOrigin, options);
  const shouldReopenAccount = shouldReopenAccountAfterViewerClose(origin, options);
  azulejoViewer.classList.remove("is-open");
  azulejoViewer.classList.remove("is-contribution-origin");
  azulejoViewer.setAttribute("aria-hidden", "true");
  azulejoViewerImage.removeAttribute("src");
  setViewerMosaicMode(0, null);
  activeViewerTileId = null;
  activeViewerTile = null;
  activeViewerOrigin = "map";
  if (shouldReopenAccount) {
    openAccountSheet();
    return;
  }
  if (!shouldRestoreMapSelection) return;
  const selection = selectionCellForTile(selectedTile);
  if (selection) {
    highlightCell(selection, { fit: false, latlng: selection });
  }
}

function showActiveViewerTileOnMap() {
  const tile = activeViewerTile;
  const lat = Number(tile?.lat);
  const lng = Number(tile?.lng);
  if (!tile || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  closeAzulejoViewer({ restoreMapSelection: false, reopenAccount: false });
  closeAccountSheet();
  map.setView([lat, lng], 21, { animate: false });
  const selection = selectionCellForTile(tile, { preferDisplayCell: true, preferStoredCell: true });
  if (selection) {
    highlightCell(selection, { fit: false, latlng: selection });
  }
}

function startViewerGesture(event) {
  if (
    azulejoViewerClose?.contains(event.target)
    || azulejoViewerMapLink?.contains(event.target)
    || azulejoViewerMeta?.contains(event.target)
  ) return;
  viewerGesture = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    startedOnVisual: Boolean(azulejoViewerVisual?.contains(event.target)),
  };
  azulejoViewer?.setPointerCapture?.(event.pointerId);
}

function finishViewerGesture(event) {
  if (!viewerGesture || viewerGesture.pointerId !== event.pointerId) return;
  const horizontal = event.clientX - viewerGesture.x;
  const vertical = event.clientY - viewerGesture.y;
  const distance = Math.hypot(horizontal, vertical);
  const startedOnVisual = viewerGesture.startedOnVisual;
  viewerGesture = null;

  if (Math.abs(horizontal) >= 48 && Math.abs(horizontal) > Math.abs(vertical) * 1.15) {
    event.preventDefault();
    stepAzulejoViewer(horizontal < 0 ? 1 : -1);
    return;
  }
  if (distance <= 12 && startedOnVisual) {
    event.preventDefault();
    cycleViewerMosaic();
  }
}

function stepAzulejoViewer(direction) {
  if (!azulejoViewer?.classList.contains("is-open")) return;
  const tiles = viewerTiles();
  if (!tiles.length) return;
  const currentIndex = Math.max(0, tiles.findIndex((tile) => tile.id === activeViewerTileId));
  const nextIndex = (currentIndex + direction + tiles.length) % tiles.length;
  renderAzulejoViewerTile(tiles[nextIndex]);
}

function openAboutSheet() {
  aboutSheet?.classList.add("is-open");
  aboutSheet?.setAttribute("aria-hidden", "false");
  loadContributorStats().catch(() => {
    if (aboutContributorsStatus) aboutContributorsStatus.textContent = "contributors temporarily unavailable";
  });
}

function closeAboutSheet() {
  aboutSheet?.classList.remove("is-open");
  aboutSheet?.setAttribute("aria-hidden", "true");
}

function renderContributorStats(contributors) {
  if (!aboutContributorsList || !aboutContributorsStatus) return;
  aboutContributorsList.textContent = "";
  if (!contributors.length) {
    aboutContributorsStatus.textContent = "no linked contributors yet";
    return;
  }
  contributors.forEach((contributor) => {
    const item = document.createElement("li");
    const rank = document.createElement("span");
    rank.className = "contributor-rank";
    rank.textContent = `${aboutContributorsList.children.length + 1}.`;
    const name = document.createElement("strong");
    name.textContent = contributor.pseudonym || "anonymous contributor";
    const count = document.createElement("span");
    count.className = "contributor-count";
    const approved = Number(contributor.approvedCount) || 0;
    count.textContent = String(approved);
    item.append(rank, name, count);
    aboutContributorsList.append(item);
  });
  aboutContributorsStatus.textContent = "";
}

async function loadContributorStats() {
  if (contributorStatsLoaded || !aboutContributorsList || !aboutContributorsStatus || typeof fetch !== "function") return;
  aboutContributorsStatus.textContent = "loading contributors...";
  const response = await fetch("/api/contributors?limit=20", { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `contributors ${response.status}`);
  contributorStatsLoaded = true;
  renderContributorStats(Array.isArray(data.contributors) ? data.contributors : []);
}

function setAccountMode(mode) {
  const login = mode === "log-in";
  const signup = mode === "sign-up";
  accountLoginMode?.classList.toggle("is-active", login);
  accountLoginMode?.setAttribute("aria-selected", String(login));
  accountSignupMode?.classList.toggle("is-active", signup);
  accountSignupMode?.setAttribute("aria-selected", String(signup));
  accountLoginForm?.classList.toggle("is-active", login);
  accountSignupForm?.classList.toggle("is-active", signup);
  accountResetForm?.classList.toggle("is-active", mode === "reset");
  accountUpdatePasswordForm?.classList.toggle("is-active", mode === "recovery");
  if (accountStatus) accountStatus.textContent = "";
}

function openAccountSheet(options = {}) {
  if (options.mode) setAccountMode(options.mode);
  accountSheet?.classList.add("is-open");
  accountSheet?.setAttribute("aria-hidden", "false");
  if (options.message && accountStatus) accountStatus.textContent = options.message;
  refreshContributorAccount().catch(() => {
    if (accountStatus) accountStatus.textContent = "account temporarily unavailable";
  });
}

function closeAccountSheet() {
  accountSheet?.classList.remove("is-open");
  accountSheet?.setAttribute("aria-hidden", "true");
}

function recoveryParamsFromUrl() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const type = hash.get("type") || query.get("type");
  const accessToken = hash.get("access_token") || query.get("access_token");
  const error = hash.get("error_description") || hash.get("error") || query.get("error_description") || query.get("error");
  if (error) return { error };
  return type === "recovery" && accessToken ? { accessToken } : null;
}

function clearRecoveryUrl() {
  if (!window.history?.replaceState) return;
  window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}`);
}

function openRecoveryAccountFlow() {
  const recovery = recoveryParamsFromUrl();
  if (!recovery) return;
  if (recovery.error) {
    openAccountSheet({ mode: "reset", message: "password reset link is invalid or expired" });
    clearRecoveryUrl();
    return;
  }
  accountRecoveryAccessToken = recovery.accessToken;
  openAccountSheet({ mode: "recovery", message: "choose a new password for your account" });
}

function boundsArrayForTiles(tiles) {
  const points = tiles
    .map((tile) => [Number(tile.lat), Number(tile.lng)])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  if (!points.length) return null;
  const lats = points.map(([lat]) => lat);
  const lngs = points.map(([, lng]) => lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

function fitTilesOnMap(tiles = visibleTiles()) {
  const bounds = boundsArrayForTiles(tiles);
  if (!bounds) return false;
  const samePoint = bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1];
  if (samePoint) {
    map.setView(bounds[0], 19);
  } else {
    map.fitBounds(bounds, { padding: [46, 46], maxZoom: 19 });
  }
  return true;
}

function normalizeArchiveQuery(value) {
  return value.trim().toLowerCase();
}

function tileMatchesArchiveQuery(tile, query) {
  const normalizedQuery = normalizeArchiveQuery(query);
  if (!normalizedQuery) return true;
  const haystack = [
    tile.title,
    tile.cell,
    tile.source,
    tile.id,
  ].filter(Boolean).join(" ").toLowerCase();
  return normalizedQuery.split(/\s+/).every((part) => haystack.includes(part));
}

function archiveFilteredTiles() {
  const query = archiveFilterInput?.value || "";
  return visibleTiles().filter((tile) => tileMatchesArchiveQuery(tile, query));
}

function updateCounts() {
  const visible = visibleTiles();
  const uniqueCells = cellOccupancy().size;
  const duplicateCount = visible.length - uniqueCells;
  tileCount.textContent = `${visible.length} fragments`;
  cellCount.textContent = duplicateCount
    ? `${uniqueCells} cellules · ${duplicateCount} doublons`
    : `${uniqueCells} cellules`;
  fitMosaicButton.disabled = visible.length === 0;
}

function renderFragmentIndex() {
  fragmentIndexList.textContent = "";
  const occupancy = cellOccupancy();
  const visible = visibleTiles();
  const tiles = archiveFilteredTiles();
  const query = normalizeArchiveQuery(archiveFilterInput?.value || "");
  if (archiveFilterStatus) {
    archiveFilterStatus.textContent = query
      ? `${tiles.length} sur ${visible.length} fragments visibles`
      : "tous les fragments visibles.";
  }
  if (!tiles.length) {
    const empty = document.createElement("p");
    empty.className = "fragment-index-empty";
    empty.textContent = visible.length ? "aucun fragment ne correspond au filtre" : "aucun fragment visible";
    fragmentIndexList.append(empty);
    return;
  }
  tiles.slice(0, FRAGMENT_INDEX_RENDER_LIMIT).forEach((tile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fragment-index-item";
    if ((occupancy.get(tile.cell) || 0) > 1) {
      button.classList.add("has-duplicate-cell");
    }
    const img = document.createElement("img");
    img.src = tile.displayImage || tile.image;
    img.alt = "";
    const text = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = tile.title;
    const meta = document.createElement("span");
    const duplicateLabel = (occupancy.get(tile.cell) || 0) > 1 ? " · doublon" : "";
    meta.textContent = `${tile.cell}${duplicateLabel}`;
    text.append(title, meta);
    button.append(img, text);
    button.addEventListener("click", () => {
      highlightCell({ cx: tile.cx, cy: tile.cy, code: tile.cell, words: tile.words, lat: tile.lat, lng: tile.lng });
    });
    fragmentIndexList.append(button);
  });
}

function searchCell(value) {
  const query = value.trim().toLowerCase();
  if (!query) return null;
  return parseCellCode(query);
}

function resizeGridCanvas() {
  const rect = document.querySelector(".map-stage").getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  gridCanvas.width = Math.floor(rect.width * scale);
  gridCanvas.height = Math.floor(rect.height * scale);
  gridCtx.setTransform(scale, 0, 0, scale, 0, 0);
}

function gridStepForZoom(zoom, density) {
  const baseStep = zoom >= 20 ? 3
    : zoom >= 19 ? 6
      : zoom >= 18 ? 12
        : zoom >= 17 ? 24
          : zoom >= 16 ? 48
            : zoom >= 15 ? 96
              : zoom >= 14 ? 192
                : zoom >= 13 ? 384
                  : 768;
  const densityScale = [2, 1.5, 1, 0.75, 0.5][clamp(density, 1, 5) - 1];
  const step = Math.round(baseStep * densityScale / GRID_METERS) * GRID_METERS;
  return Math.max(GRID_METERS, step);
}

function gridStepLabel(step) {
  return step === GRID_METERS ? "grille 3 m" : `aperçu ${step} m`;
}

function formatZoomPercent(zoom, baseZoom = HOME_VIEW.zoom) {
  const value = 100 * (2 ** (Number(zoom) - Number(baseZoom)));
  if (!Number.isFinite(value)) return "";
  return `${Math.max(1, Math.round(value))}%`;
}

function updateZoomPercent() {
  if (!mapZoomPercent) return;
  mapZoomPercent.textContent = formatZoomPercent(map.getZoom());
}

function formatTargetCoordinates(latlng = map.getCenter()) {
  const lat = Number(latlng?.lat);
  const lng = Number(latlng?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function updateTargetCoordinates() {
  if (!targetCoordinates) return;
  targetCoordinates.textContent = formatTargetCoordinates(map.getCenter());
}

async function copyTargetCoordinates(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (!targetCoordinates) return false;
  const text = formatTargetCoordinates(map.getCenter());
  const copied = await copyTextToClipboard(text, activeCellCopyValue);
  if (copied) activeCellCopyValue.classList.remove("is-visible");
  targetCoordinates.textContent = copied ? "copied" : "select text";
  targetCoordinates.classList.toggle("is-copied", copied);
  window.clearTimeout?.(targetCoordinatesCopyTimer);
  targetCoordinatesCopyTimer = window.setTimeout?.(() => {
    targetCoordinates.classList.remove("is-copied");
    updateTargetCoordinates();
  }, 900);
  return copied;
}

function drawGrid() {
  resizeGridCanvas();
  gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);

  if (!gridToggle.checked) {
    return;
  }

  const bounds = map.getBounds();
  const nw = lonLatToMeters(bounds.getWest(), bounds.getNorth());
  const se = lonLatToMeters(bounds.getEast(), bounds.getSouth());
  const density = Number(gridDensity.value);
  const step = gridStepForZoom(map.getZoom(), density);
  const startX = Math.floor(nw.x / step) * step;
  const endX = Math.ceil(se.x / step) * step;
  const startY = Math.floor(se.y / step) * step;
  const endY = Math.ceil(nw.y / step) * step;

  gridCtx.save();
  applyCityClipPath();
  gridCtx.strokeStyle = map.getZoom() < 14 ? "rgba(16, 16, 16, 0.20)" : "rgba(0, 92, 157, 0.34)";
  gridCtx.lineWidth = 0.7;

  for (let x = startX; x <= endX; x += step) {
    const a = metersToLonLat(x, startY);
    const b = metersToLonLat(x, endY);
    const pa = map.latLngToContainerPoint([a.lat, a.lng]);
    const pb = map.latLngToContainerPoint([b.lat, b.lng]);
    gridCtx.beginPath();
    gridCtx.moveTo(pa.x, pa.y);
    gridCtx.lineTo(pb.x, pb.y);
    gridCtx.stroke();
  }

  for (let y = startY; y <= endY; y += step) {
    const a = metersToLonLat(startX, y);
    const b = metersToLonLat(endX, y);
    const pa = map.latLngToContainerPoint([a.lat, a.lng]);
    const pb = map.latLngToContainerPoint([b.lat, b.lng]);
    gridCtx.beginPath();
    gridCtx.moveTo(pa.x, pa.y);
    gridCtx.lineTo(pb.x, pb.y);
    gridCtx.stroke();
  }

  gridCtx.restore();
  const current = cellForLatLng(map.getCenter().lat, map.getCenter().lng);
  cursorReadout.textContent = `Lisboa · ${gridStepLabel(step)} · ${current.code}`;
  updateTargetCoordinates();
}

function applyCityClipPath() {
  const clipPolygons = activeClipPolygons();
  if (!clipPolygons.length) return;
  gridCtx.beginPath();
  clipPolygons.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach(([lat, lng], index) => {
        const point = map.latLngToContainerPoint([lat, lng]);
        if (index === 0) {
          gridCtx.moveTo(point.x, point.y);
        } else {
          gridCtx.lineTo(point.x, point.y);
        }
      });
      gridCtx.closePath();
    });
  });
  gridCtx.clip("evenodd");
}

function waitForLqipStage(delay = LQIP_STAGE_DELAY_MS) {
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

function loadLqipSource(imageUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load the azulejo image for progressive rendering."));
    image.src = imageUrl;
  });
}

function createLqipStages(imageUrl) {
  if (lqipStageCache.has(imageUrl)) {
    return lqipStageCache.get(imageUrl);
  }

  const stagesPromise = loadLqipSource(imageUrl).then((image) => LQIP_SIZES.map((size) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, image.naturalWidth || image.width, image.naturalHeight || image.height, 0, 0, size, size);
    return canvas.toDataURL("image/png");
  })).catch((error) => {
    lqipStageCache.delete(imageUrl);
    throw error;
  });

  lqipStageCache.set(imageUrl, stagesPromise);
  if (lqipStageCache.size > MAX_LQIP_CACHE_ENTRIES) {
    lqipStageCache.delete(lqipStageCache.keys().next().value);
  }
  return stagesPromise;
}

function setLqipRendering(mosaicCell, enabled) {
  const element = typeof mosaicCell.getElement === "function" ? mosaicCell.getElement() : null;
  if (element) {
    element.classList.toggle("is-lqip", enabled);
  }
}

function rememberLoadedImageUrl(imageUrl) {
  const url = String(imageUrl || "");
  if (!url || url.startsWith("data:")) return;
  loadedImageUrls.delete(url);
  loadedImageUrls.set(url, true);
  if (loadedImageUrls.size > MAX_LOADED_IMAGE_URLS) {
    loadedImageUrls.delete(loadedImageUrls.keys().next().value);
  }
}

function isImageUrlLoaded(imageUrl) {
  return loadedImageUrls.has(String(imageUrl || ""));
}

async function revealAzulejoProgressively(mosaicCell, imageUrl, fallbackUrl = imageUrl) {
  let finalUrl = imageUrl;
  try {
    const stages = await createLqipStages(imageUrl);
    rememberLoadedImageUrl(imageUrl);
    setLqipRendering(mosaicCell, true);
    for (const stage of stages) {
      mosaicCell.setUrl(stage);
      await waitForLqipStage();
    }
  } catch (error) {
    console.warn("Progressive azulejo rendering unavailable; using the original image.", error);
    finalUrl = fallbackUrl || LQIP_FALLBACK_PIXEL;
  } finally {
    mosaicCell.setUrl(finalUrl);
    setLqipRendering(mosaicCell, false);
  }
}

function installOverlayImageRecovery(mosaicCell, displayImage, originalImage) {
  let originalAttempted = displayImage === originalImage;
  mosaicCell.on("error", () => {
    setLqipRendering(mosaicCell, false);
    if (!originalAttempted && originalImage) {
      originalAttempted = true;
      mosaicCell.setUrl(originalImage);
      return;
    }
    mosaicCell.setUrl(LQIP_FALLBACK_PIXEL);
    const element = typeof mosaicCell.getElement === "function" ? mosaicCell.getElement() : null;
    element?.classList.add("is-image-unavailable");
  });
  mosaicCell.on("load", () => {
    const element = typeof mosaicCell.getElement === "function" ? mosaicCell.getElement() : null;
    const source = element?.getAttribute("src") || "";
    if (source !== LQIP_FALLBACK_PIXEL) {
      element?.classList.remove("is-image-unavailable");
      rememberLoadedImageUrl(source);
    }
  });
}

function lqipPixelCounts() {
  return LQIP_SIZES.map((size) => size * size);
}

function thumbnailImageUrl(imageUrl, size = 128) {
  const source = String(imageUrl || "");
  const marker = "/storage/v1/object/public/";
  if (!source.startsWith("http") || !source.includes(marker)) return source;
  const params = new URLSearchParams({
    src: source,
    w: String(size),
    h: String(size),
    q: "50",
  });
  return `/api/image?${params}`;
}

function gridRecordToTile(record) {
  const lat = Number(record?.lat);
  const lng = Number(record?.lng);
  if (record?.moderation_status && record.moderation_status !== "approved") return null;
  if (!record?.id || !record.image_url || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const cell = cellForLatLng(lat, lng);
  return {
    id: record.id,
    title: record.title || "recorded azulejo",
    lat,
    lng,
    image: record.image_url,
    displayImage: thumbnailImageUrl(record.image_url, 160),
    source: "supabase-camera",
    cell: record.cell_code || cell.code,
    words: record.words || cell.words,
    cx: cell.cx,
    cy: cell.cy,
    photographerCredit: record.photographer_credit || "",
    photoLicense: record.photo_license || "",
    neighborhood: neighborhoodNameForPoint(lat, lng),
  };
}

function pointInsidePolygon(lat, lng, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const currentLat = Number(currentPoint?.[0]);
    const currentLng = Number(currentPoint?.[1]);
    const previousLat = Number(previousPoint?.[0]);
    const previousLng = Number(previousPoint?.[1]);
    if (![currentLat, currentLng, previousLat, previousLng].every(Number.isFinite)) continue;
    const intersects = ((currentLng > lng) !== (previousLng > lng))
      && (lat < ((previousLat - currentLat) * (lng - currentLng)) / (previousLng - currentLng) + currentLat);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInsideLatLngPolygons(lat, lng, polygons) {
  if (!Array.isArray(polygons)) return false;
  return polygons.some((polygon) => polygon.some((ring) => pointInsidePolygon(lat, lng, ring)));
}

function neighborhoodNameForPoint(lat, lng) {
  for (const [name, polygons] of neighborhoodClipPolygons) {
    if (pointInsideLatLngPolygons(lat, lng, polygons)) return name;
  }
  const neighborhood = LISBON_NEIGHBORHOODS.find((item) => pointInsidePolygon(lat, lng, item.polygon));
  return neighborhood?.name || "unknown";
}

function normalizeGridFilterValue(value) {
  const normalized = String(value || "all").trim().toLowerCase();
  return normalized === "0" ? "all" : normalized;
}

function gridTileMatchesFilters(tile) {
  const neighborhood = normalizeGridFilterValue(gridNeighborhoodFilter?.value);
  const color = normalizeGridFilterValue(gridColorFilter?.value);
  const type = normalizeGridFilterValue(gridTypeFilter?.value);
  const motif = normalizeGridFilterValue(gridMotifFilter?.value);
  if (neighborhood !== "all" && normalizeGridFilterValue(tile.neighborhood) !== neighborhood) return false;
  if (color !== "all" && gridColorCache.get(tile.id) !== color) return false;
  if (type !== "all" && normalizeGridFilterValue(tile.type) !== type) return false;
  if (motif !== "all" && normalizeGridFilterValue(tile.motif) !== motif) return false;
  return true;
}

function mapTileMatchesFilters(tile) {
  if (!tile || tile.isSample) return true;
  const neighborhood = normalizeGridFilterValue(gridNeighborhoodFilter?.value);
  const color = normalizeGridFilterValue(gridColorFilter?.value);
  const type = normalizeGridFilterValue(gridTypeFilter?.value);
  const motif = normalizeGridFilterValue(gridMotifFilter?.value);
  if (neighborhood !== "all" && normalizeGridFilterValue(tile.neighborhood) !== neighborhood) return false;
  if (color !== "all" && gridColorCache.get(tile.id) !== color) return false;
  if (type !== "all" && normalizeGridFilterValue(tile.type) !== type) return false;
  if (motif !== "all" && normalizeGridFilterValue(tile.motif) !== motif) return false;
  return true;
}

function renderGridNeighborhoodOptions() {
  if (!gridNeighborhoodFilter) return;
  const previousValue = gridNeighborhoodFilter.value || "all";
  const counts = new Map();
  gridRecords.forEach((tile) => {
    const name = tile.neighborhood || "unknown";
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  gridNeighborhoodFilter.textContent = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "all neighborhoods";
  gridNeighborhoodFilter.append(allOption);
  [...counts.entries()]
    .sort((first, second) => first[0].localeCompare(second[0]))
    .forEach(([name, count]) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = `${name} (${count})`;
      gridNeighborhoodFilter.append(option);
    });
  gridNeighborhoodFilter.value = [...gridNeighborhoodFilter.options].some((option) => option.value === previousValue)
    ? previousValue
    : "all";
}

function renderAzulejoGrid() {
  if (!azulejoGridList || !azulejoGridStatus) return;
  const filtered = gridRecords.filter(gridTileMatchesFilters);
  azulejoGridStatus.textContent = gridRecordsError
    || (gridRecordsLoading
    ? "loading azulejos"
    : `${filtered.length}/${gridRecords.length} azulejos`);
  azulejoGridList.textContent = "";
  const fragment = document.createDocumentFragment();
  filtered.forEach((tile) => {
    const card = document.createElement("button");
    const image = document.createElement("img");
    card.className = "azulejo-grid-card";
    card.type = "button";
    image.src = tile.displayImage;
    image.alt = tile.title;
    image.loading = "lazy";
    image.decoding = "async";
    card.append(image);
    card.addEventListener("click", () => openAzulejoViewer(tile, { origin: "grid" }));
    fragment.append(card);
  });
  azulejoGridList.append(fragment);
}

function colorFamilyFromRgb(red, green, blue) {
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
  if (hue >= 195 && hue <= 258) return "blue";
  if (hue >= 80 && hue < 175) return "green";
  if (hue >= 38 && hue < 80) return "yellow";
  if (hue >= 350 || hue < 16) return "red";
  if (hue >= 16 && hue < 38) return "brown";
  return "multicolor";
}

function dominantColorFamilyFromPixels(data) {
  const counts = new Map();
  for (let index = 0; index < data.length; index += 16) {
    const alpha = data[index + 3];
    if (alpha < 180) continue;
    const family = colorFamilyFromRgb(data[index], data[index + 1], data[index + 2]);
    if (family === "white") continue;
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  if (!counts.size) return "white";
  const ranked = [...counts.entries()].sort((first, second) => second[1] - first[1]);
  const total = ranked.reduce((sum, [, count]) => sum + count, 0);
  if (ranked.length >= 3 && ranked[0][1] / total < 0.45) return "multicolor";
  return ranked[0][0];
}

function analyzeGridTileColor(tile, token) {
  if (!tile?.id || gridColorCache.has(tile.id) || typeof Image === "undefined") return;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    if (token !== gridColorAnalysisToken) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 24;
      canvas.height = 24;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, 24, 24);
      const pixels = context.getImageData(0, 0, 24, 24).data;
      gridColorCache.set(tile.id, dominantColorFamilyFromPixels(pixels));
      if (activeViewMode === "grid" && normalizeGridFilterValue(gridColorFilter?.value) !== "all") {
        renderAzulejoGrid();
      }
      if (activeViewMode === "map" && normalizeGridFilterValue(gridColorFilter?.value) !== "all") {
        refreshTileVisibility();
      }
    } catch {
      gridColorCache.set(tile.id, "multicolor");
    }
  };
  image.onerror = () => {
    gridColorCache.set(tile.id, "multicolor");
  };
  image.src = tile.displayImage;
}

function scheduleGridColorAnalysis() {
  const token = ++gridColorAnalysisToken;
  gridRecords.slice(0, 800).forEach((tile, index) => {
    window.setTimeout(() => analyzeGridTileColor(tile, token), index * 12);
  });
}

async function loadGridAzulejos() {
  if (gridRecordsLoaded || gridRecordsLoading || typeof fetch !== "function") return;
  gridRecordsLoading = true;
  gridRecordsError = "";
  renderAzulejoGrid();
  try {
    const response = await fetch("/api/records?grid=1&limit=1000");
    if (!response.ok) throw new Error("grid records unavailable");
    const data = await response.json();
    gridRecords = (Array.isArray(data.records) ? data.records : [])
      .map(gridRecordToTile)
      .filter(Boolean);
    gridRecordsLoaded = true;
    renderGridNeighborhoodOptions();
    renderAzulejoGrid();
    refreshTileVisibility();
    scheduleGridColorAnalysis();
  } catch (error) {
    gridRecordsError = "azulejos could not be loaded";
    console.warn(error);
  } finally {
    gridRecordsLoading = false;
    renderAzulejoGrid();
  }
}

function applyAzulejoFilters(options = {}) {
  renderAzulejoGrid();
  renderNeighborhoodLayer();
  drawGrid();
  refreshTileVisibility();
  invalidateServerViewportCounts();
  if (activeViewMode === "map" && options.fitNeighborhood) {
    fitSelectedNeighborhoodOnMap();
  }
  scheduleRecordedAzulejoLoad(0);
}

function closeViewSwitchMenu() {
  viewSwitchMenu?.setAttribute("hidden", "");
  viewSwitchButton?.setAttribute("aria-expanded", "false");
}

function openViewSwitchMenu() {
  viewSwitchMenu?.removeAttribute("hidden");
  viewSwitchButton?.setAttribute("aria-expanded", "true");
}

function setViewMode(mode) {
  const nextMode = mode === "grid" ? "grid" : "map";
  activeViewMode = nextMode;
  document.body.classList.toggle("is-grid-view", nextMode === "grid");
  if (viewSwitchLabel) viewSwitchLabel.textContent = nextMode;
  if (azulejoGridView) {
    azulejoGridView.hidden = nextMode !== "grid";
    azulejoGridView.setAttribute("aria-hidden", nextMode === "grid" ? "false" : "true");
  }
  viewSwitchMenu?.querySelectorAll?.("[data-view-mode]")?.forEach((button) => {
    button.setAttribute("aria-selected", button.dataset.viewMode === nextMode ? "true" : "false");
  });
  closeViewSwitchMenu();
  if (nextMode === "grid") {
    loadGridAzulejos();
  } else {
    map.invalidateSize();
    updateMapAzulejoCount();
  }
}

function addAzulejoTile(tile, options = {}) {
  markerIndex += 1;
  const displayImage = tile.displayImage || thumbnailImageUrl(tile.image);
  const imageAlreadyLoaded = isImageUrlLoaded(displayImage);
  const normalizedTile = {
    id: tile.id || `tile-${markerIndex}`,
    title: tile.title || `Fragment ${markerIndex}`,
    lat: Number(tile.lat),
    lng: Number(tile.lng),
    image: tile.image,
    displayImage,
    source: tile.source || "manual",
    photographerCredit: tile.photographerCredit || tile.photographer_credit || tile.contributor || "",
    photoLicense: tile.photoLicense || tile.photo_license || "",
    neighborhood: tile.neighborhood || neighborhoodNameForPoint(Number(tile.lat), Number(tile.lng)),
    type: tile.type || "",
    motif: tile.motif || "",
    crop: tile.crop || null,
    isSample: !!options.skipRecord,
    isServer: !!options.isServer,
    imageLoadStarted: imageAlreadyLoaded,
    minZoom: Number.isFinite(tile.minZoom) ? tile.minZoom : options.skipRecord ? 15 : 16,
  };
  const cell = cellForLatLng(normalizedTile.lat, normalizedTile.lng);
  normalizedTile.cell = cell.code;
  normalizedTile.words = cell.words;
  normalizedTile.cx = cell.cx;
  normalizedTile.cy = cell.cy;
  normalizedTile.bounds = boundsForCell(cell);
  const template = document.querySelector("#tilePopupTemplate");
  const content = template.content.cloneNode(true);
  content.querySelector("img").src = normalizedTile.displayImage;
  content.querySelector("img").alt = normalizedTile.title;
  content.querySelector("strong").textContent = normalizedTile.title;
  content.querySelector("span").textContent = cell.code;
  const wrapper = document.createElement("div");
  wrapper.append(content);
  normalizedTile.displayBounds = boundsForSnappedGridSquare(normalizedTile.lat, normalizedTile.lng);
  const mosaicCell = L.imageOverlay(imageAlreadyLoaded ? displayImage : LQIP_FALLBACK_PIXEL, normalizedTile.displayBounds, {
    className: imageAlreadyLoaded ? "azulejo-cell" : "azulejo-cell is-lqip",
    interactive: true,
    alt: "",
    opacity: Number(mosaicOpacity.value) / 100,
    pane: "azulejos",
  });
  if (typeof mosaicCell.on === "function") {
    installOverlayImageRecovery(mosaicCell, normalizedTile.displayImage, normalizedTile.image);
    mosaicCell.on("click", () => openAzulejoViewer(normalizedTile));
  } else {
    mosaicCell.bindPopup(wrapper.cloneNode(true));
  }
  const targetLayer = options.skipRecord ? sampleLayer : userLayer;
  normalizedTile.mosaicCell = mosaicCell;
  normalizedTile.layerGroup = targetLayer;
  displayedTiles.push(normalizedTile);
  if (!options.deferRefresh) {
    setMosaicOpacity();
    refreshTileVisibility();
  }
  if (!options.skipRecord && !options.skipPersistence) {
    placedTiles.push({
      id: normalizedTile.id,
      title: normalizedTile.title,
      lat: normalizedTile.lat,
      lng: normalizedTile.lng,
      cell: normalizedTile.cell,
      words: normalizedTile.words,
      bounds: normalizedTile.bounds.toBBoxString(),
      source: normalizedTile.source,
      imageData: normalizedTile.image.startsWith("data:") ? normalizedTile.image : null,
      crop: normalizedTile.crop,
    });
    saveMosaicState();
  }
  return normalizedTile;
}

function setMosaicVisibility() {
  if (mosaicToggle.checked) {
    map.addLayer(tileLayer);
  } else {
    map.removeLayer(tileLayer);
  }
  refreshTileVisibility();
}

function setSampleVisibility() {
  if (!mosaicToggle.checked) return;
  if (sampleToggle.checked) {
    tileLayer.addLayer(sampleLayer);
  } else {
    tileLayer.removeLayer(sampleLayer);
  }
  refreshTileVisibility();
}

function setMosaicOpacity() {
  const opacity = Number(mosaicOpacity.value) / 100;
  displayedTiles.forEach((tile) => {
    if (tile.mosaicCell && typeof tile.mosaicCell.setOpacity === "function") {
      tile.mosaicCell.setOpacity(opacity);
    }
  });
  document.querySelectorAll(".azulejo-cell").forEach((cell) => {
    cell.style.opacity = String(opacity);
  });
}

function switchPanel(name) {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === name);
  });
  document.querySelectorAll(".panel-view").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === name);
  });
}

function prepareCanvas(canvas, size = 320) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  return ctx;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function squareFromBox(box, width, height, scale) {
  const boxW = box.maxX - box.minX;
  const boxH = box.maxY - box.minY;
  const side = Math.min(Math.max(boxW, boxH), width, height);
  const cx = box.minX + boxW / 2;
  const cy = box.minY + boxH / 2;
  const x = clamp(cx - side / 2, 0, width - side);
  const y = clamp(cy - side / 2, 0, height - side);
  return {
    sx: x / scale,
    sy: y / scale,
    sw: side / scale,
    sh: side / scale,
  };
}

function squareInsideBox(box, scale) {
  const boxW = box.maxX - box.minX;
  const boxH = box.maxY - box.minY;
  const side = Math.max(1, Math.min(boxW, boxH));
  const x = box.minX + (boxW - side) / 2;
  const y = box.minY + (boxH - side) / 2;
  return {
    sx: x / scale,
    sy: y / scale,
    sw: side / scale,
    sh: side / scale,
  };
}

function detectEdgeObstructionCrop(data, width, height, scale) {
  function isBlockedEdgePixel(x, y) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    return luma < 95 || (b > 85 && b > r * 1.18 && b > g * 1.03);
  }

  function rowBlockedRatio(y) {
    let hits = 0;
    let samples = 0;
    for (let x = 0; x < width; x += 2) {
      samples += 1;
      if (isBlockedEdgePixel(x, y)) hits += 1;
    }
    return hits / samples;
  }

  function colBlockedRatio(x) {
    let hits = 0;
    let samples = 0;
    for (let y = 0; y < height; y += 2) {
      samples += 1;
      if (isBlockedEdgePixel(x, y)) hits += 1;
    }
    return hits / samples;
  }

  const threshold = 0.10;
  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;

  while (top < height * 0.25 && rowBlockedRatio(top) > threshold) top += 1;
  while (bottom > height * 0.75 && rowBlockedRatio(bottom) > threshold) bottom -= 1;
  while (left < width * 0.25 && colBlockedRatio(left) > threshold) left += 1;
  while (right > width * 0.75 && colBlockedRatio(right) > threshold) right -= 1;

  const removed = top + (height - 1 - bottom) + left + (width - 1 - right);
  const boxW = right - left + 1;
  const boxH = bottom - top + 1;
  const aspect = boxW / Math.max(1, boxH);
  if (removed < Math.min(width, height) * 0.025 || boxW < width * 0.68 || boxH < height * 0.68) return null;
  if (aspect < 0.78 || aspect > 1.28) return null;

  const crop = squareInsideBox({ minX: left, minY: top, maxX: right + 1, maxY: bottom + 1 }, scale);
  return {
    ...crop,
    method: "bords",
    score: Math.round(clamp(72 + (removed / Math.min(width, height)) * 90, 72, 94)),
  };
}

function detectSquareCrop(image) {
  const scratch = document.createElement("canvas");
  const maxSide = 520;
  const scale = Math.min(maxSide / image.width, maxSide / image.height, 1);
  scratch.width = Math.round(image.width * scale);
  scratch.height = Math.round(image.height * scale);
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, scratch.width, scratch.height);
  const { data, width, height } = ctx.getImageData(0, 0, scratch.width, scratch.height);
  const edgeObstructionCrop = detectEdgeObstructionCrop(data, width, height, scale);
  if (edgeObstructionCrop) return edgeObstructionCrop;

  const inkBox = { minX: width, minY: height, maxX: 0, maxY: 0, hits: 0 };
  const edgeBox = { minX: width, minY: height, maxX: 0, maxY: 0, hits: 0 };
  const step = 2;

  function addHit(box, x, y) {
    box.minX = Math.min(box.minX, x);
    box.minY = Math.min(box.minY, y);
    box.maxX = Math.max(box.maxX, x);
    box.maxY = Math.max(box.maxY, y);
    box.hits += 1;
  }

  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const right = ((y * width + x + step) * 4);
      const down = (((y + step) * width + x) * 4);
      const rightLuma = 0.299 * data[right] + 0.587 * data[right + 1] + 0.114 * data[right + 2];
      const downLuma = 0.299 * data[down] + 0.587 * data[down + 1] + 0.114 * data[down + 2];
      const isBlueInk = b > 88 && b > r * 1.18 && b > g * 1.02;
      const isDarkInk = luma < 78;
      const isStrongEdge = Math.abs(luma - rightLuma) + Math.abs(luma - downLuma) > 92;
      if (isBlueInk || isDarkInk) {
        addHit(inkBox, x, y);
      }
      if (isStrongEdge) {
        addHit(edgeBox, x, y);
      }
    }
  }

  const minHits = Math.max(80, (width * height) / 1600);
  const chosen = edgeBox.hits > inkBox.hits * 0.8 && edgeBox.hits > minHits ? edgeBox : inkBox;

  if (chosen.hits < minHits) {
    const side = Math.min(image.width, image.height);
    return {
      sx: (image.width - side) / 2,
      sy: (image.height - side) / 2,
      sw: side,
      sh: side,
      method: "centré",
      score: 0,
    };
  }

  const pad = Math.round(Math.min(width, height) * 0.025);
  chosen.minX = clamp(chosen.minX - pad, 0, width - 1);
  chosen.minY = clamp(chosen.minY - pad, 0, height - 1);
  chosen.maxX = clamp(chosen.maxX + pad, 0, width);
  chosen.maxY = clamp(chosen.maxY + pad, 0, height);
  const crop = squareFromBox(chosen, width, height, scale);
  const boxArea = Math.max(1, (chosen.maxX - chosen.minX) * (chosen.maxY - chosen.minY));
  const hitDensity = clamp(chosen.hits / boxArea * 14, 0, 1);
  const aspect = (chosen.maxX - chosen.minX) / Math.max(1, chosen.maxY - chosen.minY);
  const aspectScore = clamp(1 - Math.abs(1 - aspect), 0, 1);
  return {
    ...crop,
    method: chosen === edgeBox ? "contours" : "encre",
    score: Math.round((hitDensity * 0.58 + aspectScore * 0.42) * 100),
  };
}

function drawImagePreview(image, crop = null) {
  const ctx = prepareCanvas(sourcePreview);
  const side = Math.min(image.width, image.height);
  const sx = (image.width - side) / 2;
  const sy = (image.height - side) / 2;
  ctx.drawImage(image, sx, sy, side, side, 0, 0, sourcePreview.width, sourcePreview.height);
  if (!crop) return;
  const scale = sourcePreview.width / side;
  ctx.strokeStyle = "#b21f1f";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 5]);
  ctx.strokeRect(
    (crop.sx - sx) * scale,
    (crop.sy - sy) * scale,
    crop.sw * scale,
    crop.sh * scale,
  );
  ctx.setLineDash([]);
}

function renderExtractedTile(image, canvas, providedCrop = null) {
  const crop = providedCrop || detectSquareCrop(image);
  const ctx = prepareCanvas(canvas);
  ctx.fillStyle = "#fdfaf0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return {
    dataUrl: canvas.toDataURL("image/png"),
    crop,
  };
}

function setCropControlsFromCrop(image, crop) {
  const maxSide = Math.min(image.width, image.height);
  cropSizeInput.max = String(maxSide);
  cropSizeInput.min = "20";
  cropSizeInput.value = String(Math.round(crop.sw));
  cropXInput.max = String(Math.max(0, image.width - crop.sw));
  cropYInput.max = String(Math.max(0, image.height - crop.sh));
  cropXInput.value = String(Math.round(crop.sx));
  cropYInput.value = String(Math.round(crop.sy));
}

function cropFromControls(image) {
  const side = Math.min(Number(cropSizeInput.value), image.width, image.height);
  const sx = clamp(Number(cropXInput.value), 0, image.width - side);
  const sy = clamp(Number(cropYInput.value), 0, image.height - side);
  cropXInput.max = String(Math.max(0, image.width - side));
  cropYInput.max = String(Math.max(0, image.height - side));
  cropXInput.value = String(Math.round(sx));
  cropYInput.value = String(Math.round(sy));
  return {
    sx,
    sy,
    sw: side,
    sh: side,
    method: "manuel",
    score: currentCrop?.score ?? 100,
  };
}

function refreshManualCrop() {
  if (!currentImportImage) return;
  currentCrop = cropFromControls(currentImportImage);
  const result = renderExtractedTile(currentImportImage, tilePreview, currentCrop);
  drawImagePreview(currentImportImage, currentCrop);
  extractedTileDataUrl = result.dataUrl;
  cropStatus.textContent = `Crop manuel · ${Math.round(currentCrop.sw)} × ${Math.round(currentCrop.sh)} px`;
}

function extractTile(image) {
  const result = renderExtractedTile(image, tilePreview);
  currentImportImage = image;
  currentCrop = result.crop;
  setCropControlsFromCrop(image, result.crop);
  drawImagePreview(image, result.crop);
  extractedTileDataUrl = result.dataUrl;
  cropStatus.textContent = `Crop ${result.crop.method} · confiance ${result.crop.score}% · ${Math.round(result.crop.sw)} × ${Math.round(result.crop.sh)} px`;
  placeTileButton.disabled = false;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      resolve(image);
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

function readAscii(view, offset, length) {
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += String.fromCharCode(view.getUint8(offset + i));
  }
  return value.replace(/\0+$/, "");
}

function readExifValue(view, tiffStart, entryOffset, littleEndian) {
  const type = view.getUint16(entryOffset + 2, littleEndian);
  const count = view.getUint32(entryOffset + 4, littleEndian);
  const valueOffset = entryOffset + 8;
  const typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 }[type] || 1;
  const totalSize = typeSize * count;
  const dataOffset = totalSize <= 4 ? valueOffset : tiffStart + view.getUint32(valueOffset, littleEndian);
  if (type === 2) return readAscii(view, dataOffset, count);
  if (type === 3) return view.getUint16(dataOffset, littleEndian);
  if (type === 4) return view.getUint32(dataOffset, littleEndian);
  if (type === 5) {
    const values = [];
    for (let i = 0; i < count; i += 1) {
      const offset = dataOffset + i * 8;
      values.push(view.getUint32(offset, littleEndian) / Math.max(1, view.getUint32(offset + 4, littleEndian)));
    }
    return values;
  }
  return null;
}

function readExifDirectory(view, tiffStart, directoryOffset, littleEndian) {
  const entries = new Map();
  const count = view.getUint16(tiffStart + directoryOffset, littleEndian);
  for (let i = 0; i < count; i += 1) {
    const entryOffset = tiffStart + directoryOffset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    entries.set(tag, readExifValue(view, tiffStart, entryOffset, littleEndian));
  }
  return entries;
}

function dmsToDecimal(value, ref) {
  if (!Array.isArray(value) || value.length < 3) return null;
  const decimal = value[0] + value[1] / 60 + value[2] / 3600;
  return ref === "S" || ref === "W" ? -decimal : decimal;
}

async function readGpsFromExif(file) {
  if (!/^image\/jpe?g$/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) return null;
  const view = new DataView(await file.arrayBuffer());
  if (view.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset < view.byteLength - 4) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const length = view.getUint16(offset + 2);
    if (marker === 0xe1 && readAscii(view, offset + 4, 6) === "Exif") {
      const tiffStart = offset + 10;
      const endian = readAscii(view, tiffStart, 2);
      const littleEndian = endian === "II";
      if (!littleEndian && endian !== "MM") return null;
      const firstIfd = view.getUint32(tiffStart + 4, littleEndian);
      const ifd0 = readExifDirectory(view, tiffStart, firstIfd, littleEndian);
      const gpsOffset = ifd0.get(0x8825);
      if (!gpsOffset) return null;
      const gps = readExifDirectory(view, tiffStart, gpsOffset, littleEndian);
      const lat = dmsToDecimal(gps.get(0x0002), gps.get(0x0001));
      const lng = dmsToDecimal(gps.get(0x0004), gps.get(0x0003));
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, source: "exif" };
      return null;
    }
    offset += 2 + length;
  }
  return null;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image unreadable"));
    };
    image.src = url;
  });
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image unreadable"));
    image.src = dataUrl;
  });
}

async function squareDataUrlFromImageFile(file, size = 1200) {
  const image = await loadImageFromFile(file);
  const side = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const sx = ((image.naturalWidth || image.width) - side) / 2;
  const sy = ((image.naturalHeight || image.height) - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.88);
}

function squareDataUrlFromVideo(video, size = 1200) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) throw new Error("camera not ready");
  const side = Math.min(width, height);
  const sx = (width - side) / 2;
  const sy = (height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function videoFrameDataUrl(video, maxDimension = 1600) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) throw new Error("camera not ready");
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function encodeCanvasForMobileUpload(sourceCanvas, maxLength = 2_800_000) {
  const sizes = [Math.min(1024, sourceCanvas.width), 896, 768];
  const qualities = [0.86, 0.76, 0.66];
  let smallest = "";
  for (const size of sizes) {
    if (size > sourceCanvas.width) continue;
    const canvas = size === sourceCanvas.width ? sourceCanvas : document.createElement("canvas");
    if (canvas !== sourceCanvas) {
      canvas.width = size;
      canvas.height = size;
      canvas.getContext("2d").drawImage(sourceCanvas, 0, 0, size, size);
    }
    for (const quality of qualities) {
      const encoded = canvas.toDataURL("image/jpeg", quality);
      if (!smallest || encoded.length < smallest.length) smallest = encoded;
      if (encoded.length <= maxLength) return encoded;
    }
  }
  return smallest;
}

function encodeSourceImageForAdmin(image, maxDimension = 1600, maxLength = 1_450_000) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const initialScale = Math.min(1, maxDimension / Math.max(width, height));
  const scales = [initialScale, initialScale * 0.88, initialScale * 0.76];
  const qualities = [0.82, 0.72, 0.62];
  let smallest = "";
  for (const scale of scales) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of qualities) {
      const encoded = canvas.toDataURL("image/jpeg", quality);
      if (!smallest || encoded.length < smallest.length) smallest = encoded;
      if (encoded.length <= maxLength) return encoded;
    }
  }
  return smallest;
}

function normalizedCropPoints(crop, image) {
  if (!crop || !image) return null;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) return null;
  const left = crop.sx / width;
  const top = crop.sy / height;
  const right = (crop.sx + crop.side) / width;
  const bottom = (crop.sy + crop.side) / height;
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
}

function drawPendingCapture(encode = false) {
  if (!pendingCapture || !captureCropCanvas) return "";
  const canvas = captureCropCanvas;
  const ctx = canvas.getContext("2d");
  const image = pendingCapture.image;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const zoom = Math.max(CAPTURE_MIN_ZOOM, Number(captureCropZoom?.value || CAPTURE_MIN_ZOOM * 100) / 100);
  const baseSide = Math.min(width, height);
  const cropSide = baseSide / zoom;
  const maxX = Math.max(0, (width - cropSide) / 2);
  const maxY = Math.max(0, (height - cropSide) / 2);
  const panX = Number(captureCropX?.value || 0) / 100;
  const panY = Number(captureCropY?.value || 0) / 100;
  const sx = (width - cropSide) / 2 + panX * maxX;
  const sy = (height - cropSide) / 2 + panY * maxY;
  canvas.width = 1024;
  canvas.height = 1024;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, sx, sy, cropSide, cropSide, 0, 0, canvas.width, canvas.height);
  pendingCapture.crop = { sx, sy, side: cropSide, zoom };
  return encode ? encodeCanvasForMobileUpload(canvas) : "";
}

async function openCapturePreview(imageSource, gps = null) {
  const image = typeof imageSource === "string"
    ? await loadImageFromDataUrl(imageSource)
    : imageSource;
  const uploadId = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const random = Math.floor(Math.random() * 16);
      return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
    });
  pendingCapture = {
    image,
    gps,
    gpsPromise: gps ? null : readReliableBrowserPosition(RELIABLE_GPS_TIMEOUT_MS, { allowOutsideLisbon: adminCaptureSession }),
    crop: null,
    uploadId,
  };
  if (captureCropZoom) {
    captureCropZoom.min = String(Math.round(CAPTURE_MIN_ZOOM * 100));
    captureCropZoom.value = String(Math.round(CAPTURE_MIN_ZOOM * 100));
  }
  if (captureCropX) captureCropX.value = "0";
  if (captureCropY) captureCropY.value = "0";
  drawPendingCapture();
  capturePreview?.classList.add("is-open");
  capturePreview?.setAttribute("aria-hidden", "false");
}

function closeCapturePreview() {
  pendingCapture = null;
  capturePreview?.classList.remove("is-open");
  capturePreview?.setAttribute("aria-hidden", "true");
}

function dataUrlToBlob(dataUrl) {
  const [header, encoded] = String(dataUrl || "").split(",", 2);
  const mime = header.match(/^data:([^;]+);base64$/)?.[1];
  if (!mime || !encoded) throw new Error("invalid image data");
  const binary = window.atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

async function uploadSignedAsset(asset, blob) {
  if (!asset) return;
  const response = await fetch(asset.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": blob.type,
      "cache-control": "max-age=31536000",
      "x-upsert": "true",
    },
    body: blob,
  });
  if (!response.ok) throw new Error(`image upload failed ${response.status}`);
}

async function saveRecordedAzulejoDirect(payload) {
  const squareBlob = dataUrlToBlob(payload.imageData);
  const sourceBlob = payload.originalImageData ? dataUrlToBlob(payload.originalImageData) : null;
  const prepareResponse = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "prepare",
      uploadId: payload.uploadId,
      squareMime: squareBlob.type,
      sourceMime: sourceBlob?.type || null,
      lat: payload.lat,
      lng: payload.lng,
      gpsAccuracy: payload.gpsAccuracy,
      gpsTimestamp: payload.gpsTimestamp,
      locationSource: payload.locationSource,
    }),
  });
  if ([404, 405, 501].includes(prepareResponse.status)) {
    const error = new Error("direct upload unavailable");
    error.useLegacyUpload = true;
    throw error;
  }
  const prepared = await prepareResponse.json().catch(() => ({}));
  if (!prepareResponse.ok) throw new Error(prepared.error || `upload preparation failed ${prepareResponse.status}`);

  await Promise.all([
    uploadSignedAsset(prepared.square, squareBlob),
    sourceBlob ? uploadSignedAsset(prepared.source, sourceBlob) : Promise.resolve(),
  ]);

  const finalizePayload = { ...payload };
  delete finalizePayload.imageData;
  delete finalizePayload.originalImageData;
  finalizePayload.action = "finalize";
  finalizePayload.squarePath = prepared.square.path;
  finalizePayload.sourcePath = prepared.source?.path || null;
  const finalizeResponse = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(finalizePayload),
  });
  const finalized = await finalizeResponse.json().catch(() => ({}));
  if (!finalizeResponse.ok) throw new Error(finalized.error || `record finalization failed ${finalizeResponse.status}`);
  return finalized;
}

async function saveRecordedAzulejoLegacy(payload) {
  const body = JSON.stringify(payload);
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = window.setTimeout(() => controller?.abort(), 45_000);
    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller?.signal,
      });
      if (response.ok) return response.json();
      const error = await response.json().catch(() => ({}));
      lastError = new Error(error.error || `record ${response.status}`);
      lastError.retryable = response.status >= 500 || response.status === 408 || response.status === 429;
      throw lastError;
    } catch (error) {
      lastError = error;
      const networkFailure = error?.name === "AbortError" || /network|fetch|abort|load failed/i.test(error?.message || "");
      if (attempt === 2 || (!error?.retryable && !networkFailure)) throw error;
    } finally {
      window.clearTimeout(timeout);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 650 * (attempt + 1)));
  }
  throw lastError || new Error("upload failed");
}

async function saveRecordedAzulejo(payload) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await saveRecordedAzulejoDirect(payload);
    } catch (error) {
      if (error.useLegacyUpload) return saveRecordedAzulejoLegacy(payload);
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError || new Error("upload failed");
}

function readContributionReceipts() {
  try {
    const stored = JSON.parse(localStorage.getItem(CONTRIBUTION_RECEIPTS_KEY) || "[]");
    return Array.isArray(stored)
      ? stored.filter((item) => item && item.id && item.token).slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

function rememberContributionReceipt(result) {
  const id = result?.record?.id;
  const token = result?.receiptToken;
  if (!id || !token) return null;
  try {
    const receipts = readContributionReceipts().filter((item) => item.id !== id);
    receipts.unshift({ id, token, submittedAt: new Date().toISOString() });
    const nextReceipts = receipts.slice(0, 50);
    localStorage.setItem(CONTRIBUTION_RECEIPTS_KEY, JSON.stringify(nextReceipts));
    return nextReceipts.length;
  } catch {
    // A successful contribution does not depend on local receipt storage.
    return null;
  }
}

function maybeInviteContributorAccount(receiptCount) {
  if (contributorAccount || !accountSheet || !Number.isFinite(receiptCount) || receiptCount < ACCOUNT_INVITE_THRESHOLD) return;
  try {
    const lastInviteCount = Number(localStorage.getItem(ACCOUNT_INVITE_COUNT_KEY) || "0");
    if (lastInviteCount >= ACCOUNT_INVITE_THRESHOLD) return;
    localStorage.setItem(ACCOUNT_INVITE_COUNT_KEY, String(receiptCount));
  } catch {
    // Account creation is optional; failing to persist the prompt state is harmless.
  }
  openAccountSheet({
    mode: "sign-up",
    message: "you have recorded 3 azulejos. create an account to become a top contributor and keep your photographs linked.",
  });
}

function contributionStatusLabel(record) {
  if (record.status === "approved") return "accepted";
  if (record.status === "rejected") return "rejected";
  return "pending review";
}

function contributionReasonLabel(record) {
  const reason = String(record?.reason || "").trim();
  return record?.status === "rejected" && reason ? reason : "";
}

function setContributionView(view, options = {}) {
  const listView = view === "list";
  myContributions?.classList.toggle("is-list-view", listView);
  contributionsGridView?.setAttribute?.("aria-pressed", String(!listView));
  contributionsListView?.setAttribute?.("aria-pressed", String(listView));
  if (options.persist !== false) {
    try {
      localStorage.setItem(CONTRIBUTION_VIEW_KEY, listView ? "list" : "grid");
    } catch {
      // View preference is optional.
    }
  }
}

function restoreContributionView() {
  let view = "grid";
  try {
    view = localStorage.getItem(CONTRIBUTION_VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    // Keep the mosaic default when storage is unavailable.
  }
  setContributionView(view, { persist: false });
}

function contributionDateLabel(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function renderContributionRecords(records, statusCopy) {
  if (!myContributionsList || !myContributionsStatus) return;
  if (myContributionsTitle) myContributionsTitle.textContent = `my contributions (${records.length})`;
  myContributionsList.textContent = "";
  records.forEach((record) => {
    const item = document.createElement("li");
    item.className = `is-${record.status || "unavailable"}`;
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = record.status !== "approved" || !Number.isFinite(Number(record.lat)) || !Number.isFinite(Number(record.lng));
    const reasonLabel = contributionReasonLabel(record);
    button.title = record.status === "approved"
      ? "show on map"
      : [contributionStatusLabel(record), reasonLabel].filter(Boolean).join(": ");
    if (record.imageUrl) {
      const image = document.createElement("img");
      image.src = thumbnailImageUrl(record.imageUrl, 160);
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.width = 160;
      image.height = 160;
      button.append(image);
    }
    const details = document.createElement("span");
    details.className = "contribution-details";
    const title = document.createElement("span");
    title.className = "contribution-title";
    title.textContent = record.title || "azulejo";
    const status = document.createElement("strong");
    status.className = `is-${record.status || "unavailable"}`;
    status.textContent = record.status ? contributionStatusLabel(record) : "receipt unavailable";
    const reason = document.createElement("span");
    reason.className = "contribution-reason";
    reason.hidden = !reasonLabel;
    reason.textContent = reasonLabel ? `reason: ${reasonLabel}` : "";
    const submitted = document.createElement("time");
    submitted.dateTime = record.submittedAt || "";
    submitted.textContent = contributionDateLabel(record.submittedAt);
    details.append(title, status, reason, submitted);
    button.append(details);
    button.addEventListener("click", () => focusContributionRecord(record));
    item.append(button);
    myContributionsList.append(item);
  });
  myContributionsStatus.textContent = statusCopy || "";
}

function focusContributionRecord(record) {
  const lat = Number(record.lat);
  const lng = Number(record.lng);
  if (record.status !== "approved" || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const fallbackTile = viewerTileFromContribution(record);
  const tile = displayedTiles.find((candidate) => candidate.id === record.id)
    || serverTileCacheById.get(record.id)
    || fallbackTile;
  if (!tile) return;
  closeAccountSheet();
  openAzulejoViewer(tile, { origin: "contributions" });
  loadRecordedAzulejos().then(() => {
    if (activeViewerTileId !== record.id) return;
    const loadedTile = displayedTiles.find((candidate) => candidate.id === record.id)
      || serverTileCacheById.get(record.id);
    if (loadedTile) {
      activeViewerTile = loadedTile;
      renderAzulejoViewerTile(activeViewerTile);
    }
  });
}

async function refreshContributionReceipts() {
  if (!myContributionsList || !myContributionsStatus) return;
  const receipts = readContributionReceipts();
  myContributionsList.textContent = "";
  if (!receipts.length) {
    if (myContributionsTitle) myContributionsTitle.textContent = "my contributions (0)";
    myContributionsStatus.textContent = "no contribution receipt on this device";
    return;
  }
  myContributionsStatus.textContent = "checking status...";
  const response = await fetch("/api/contributions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipts: receipts.map(({ id, token }) => ({ id, token })) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `status ${response.status}`);
  const records = new Map((data.records || []).map((record) => [record.id, record]));
  renderContributionRecords(receipts.map((receipt) => ({
    ...(records.get(receipt.id) || {}),
    id: receipt.id,
    submittedAt: records.get(receipt.id)?.submittedAt || receipt.submittedAt,
  })), "");
}

function receiptRequestPayload() {
  return readContributionReceipts().map(({ id, token }) => ({ id, token }));
}

function applyContributorAccount(data) {
  contributorAccount = data?.authenticated ? data : null;
  const authenticated = Boolean(contributorAccount);
  if (accountGuest) accountGuest.hidden = authenticated;
  if (accountMember) accountMember.hidden = !authenticated;
  if (myContributions) myContributions.hidden = !authenticated;
  if (accountOpenButton) accountOpenButton.textContent = authenticated ? "account" : "log in";
  if (accountPseudonym) accountPseudonym.textContent = contributorAccount?.profile?.pseudonym || "";
  if (accountProfilePseudonym) accountProfilePseudonym.value = contributorAccount?.profile?.pseudonym || "";
  if (authenticated) {
    const records = contributorAccount.records || [];
    renderContributionRecords(records, "");
  } else if (adminOpenButton) {
    adminOpenButton.hidden = true;
  }
}

function captureCreditName() {
  return contributorAccount?.profile?.pseudonym || "anonymous";
}

async function refreshContributorAccount() {
  const response = await fetch("/api/contributor-account", { headers: { Accept: "application/json" } });
  if (response.status === 401) {
    applyContributorAccount(null);
    return null;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `account ${response.status}`);
  let current = data;
  const receipts = receiptRequestPayload();
  if (receipts.length) {
    const claim = await fetch("/api/contributor-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "claim", receipts }),
    });
    if (claim.ok) current = await claim.json();
  }
  applyContributorAccount(current);
  return current;
}

async function submitContributorAccount(event, action) {
  event.preventDefault();
  const form = event.currentTarget?.tagName === "FORM"
    ? event.currentTarget
    : event.currentTarget?.closest?.("form") || accountLoginForm;
  const button = form.querySelector("button[type='submit']");
  if (action === "sign-up" && accountSignupPassword?.value !== accountSignupPasswordConfirm?.value) {
    if (accountStatus) accountStatus.textContent = "passwords do not match";
    return;
  }
  if (action === "update-password" && accountNewPassword?.value !== accountNewPasswordConfirm?.value) {
    if (accountStatus) accountStatus.textContent = "passwords do not match";
    return;
  }
  if (button) button.disabled = true;
  const statusLabel = {
    "sign-in": "logging in...",
    "sign-up": "creating account...",
    "reset-password": "sending reset email...",
    "update-password": "saving new password...",
  }[action] || "working...";
  if (accountStatus) accountStatus.textContent = statusLabel;
  let payload;
  if (action === "sign-up") {
    payload = {
      action,
      pseudonym: accountSignupPseudonym?.value,
      email: accountSignupEmail?.value,
      password: accountSignupPassword?.value,
      receipts: receiptRequestPayload(),
    };
  } else if (action === "reset-password") {
    payload = { action, email: accountResetEmail?.value };
  } else if (action === "update-password") {
    payload = {
      action,
      accessToken: accountRecoveryAccessToken,
      password: accountNewPassword?.value,
      receipts: receiptRequestPayload(),
    };
  } else {
    payload = {
      action,
      email: accountLoginEmail?.value,
      password: accountLoginPassword?.value,
      receipts: receiptRequestPayload(),
    };
  }
  try {
    const response = await fetch("/api/contributor-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 202) throw new Error(data.error || `account ${response.status}`);
    if (data.resetRequested) {
      if (accountStatus) accountStatus.textContent = "if this email has an account, a reset link has been sent";
      return;
    }
    if (data.confirmationRequired) {
      if (accountStatus) accountStatus.textContent = "check your email to confirm the account, then log in here";
      return;
    }
    applyContributorAccount(data);
    accountRecoveryAccessToken = "";
    clearRecoveryUrl();
    if (accountLoginPassword) accountLoginPassword.value = "";
    if (accountSignupPassword) accountSignupPassword.value = "";
    if (accountSignupPasswordConfirm) accountSignupPasswordConfirm.value = "";
    if (accountNewPassword) accountNewPassword.value = "";
    if (accountNewPasswordConfirm) accountNewPasswordConfirm.value = "";
    if (accountStatus) accountStatus.textContent = "";
  } catch (error) {
    if (accountStatus) accountStatus.textContent = error.message || "account request failed";
  } finally {
    if (button) button.disabled = false;
  }
}

async function updateContributorProfile(event) {
  event.preventDefault();
  if (!accountProfileForm || !accountProfilePseudonym) return;
  const button = accountProfileForm.querySelector("button[type='submit']");
  if (button) button.disabled = true;
  if (accountSettingsStatus) accountSettingsStatus.textContent = "saving username...";
  try {
    const response = await fetch("/api/contributor-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-profile",
        pseudonym: accountProfilePseudonym.value,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `account ${response.status}`);
    applyContributorAccount(data);
    if (accountSettingsStatus) accountSettingsStatus.textContent = "username saved";
  } catch (error) {
    if (accountSettingsStatus) accountSettingsStatus.textContent = error.message || "username update failed";
  } finally {
    if (button) button.disabled = false;
  }
}

async function logoutContributorAccount() {
  if (accountLogoutButton) accountLogoutButton.disabled = true;
  try {
    await fetch("/api/contributor-account", { method: "DELETE" });
    applyContributorAccount(null);
    setAccountMode("log-in");
  } finally {
    if (accountLogoutButton) accountLogoutButton.disabled = false;
  }
}

function isQueueableUploadFailure(error) {
  if (navigator.onLine === false) return true;
  const message = String(error?.message || "");
  return error?.name === "AbortError"
    || /network|fetch|abort|load failed|timed out|failed (?:408|429|5\d\d)|record (?:408|429|5\d\d)/i.test(message);
}

async function queueRecordedAzulejo(payload) {
  const queue = window.OpenAzulejosOfflineQueue;
  if (!queue) throw new Error("offline storage is unavailable on this device");
  await queue.enqueue(payload);
  return {
    queued: true,
    record: {
      id: `queued-${payload.uploadId}`,
      image_url: payload.imageData,
      moderation_status: "pending",
    },
  };
}

let offlineFlushPromise = null;

async function flushOfflineContributions() {
  const queue = window.OpenAzulejosOfflineQueue;
  if (!queue || navigator.onLine === false) return { sent: 0, remaining: 0 };
  if (offlineFlushPromise) return offlineFlushPromise;

  offlineFlushPromise = (async () => {
    const entries = await queue.list();
    let sent = 0;
    for (const entry of entries) {
      try {
        const stored = await saveRecordedAzulejo(entry.payload);
        maybeInviteContributorAccount(rememberContributionReceipt(stored));
        await queue.remove(entry.id);
        sent += 1;
      } catch (error) {
        await queue.markFailure(entry, error);
        if (isQueueableUploadFailure(error)) break;
      }
    }
    const remaining = (await queue.list()).length;
    return { sent, remaining };
  })().finally(() => {
    offlineFlushPromise = null;
  });

  return offlineFlushPromise;
}

function readCurrentBrowserPosition() {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    let failures = 0;
    const accept = (position) => {
      if (settled) return;
      const lat = Number(position.coords.latitude);
      const lng = Number(position.coords.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        settled = true;
        resolve({
          lat,
          lng,
          accuracy: Number(position.coords.accuracy) || null,
          timestamp: Number(position.timestamp) || Date.now(),
          source: "browser",
        });
      } else {
        failures += 1;
        if (failures === 2) resolve(null);
      }
    };
    const reject = () => {
      failures += 1;
      if (!settled && failures === 2) resolve(null);
    };
    navigator.geolocation.getCurrentPosition(accept, reject, {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 15_000,
    });
    navigator.geolocation.getCurrentPosition(accept, reject, {
      enableHighAccuracy: false,
      maximumAge: 120_000,
      timeout: 12_000,
    });
  });
}

function gpsDistanceMeters(first, second) {
  if (!first || !second) return Infinity;
  const toRadians = (value) => value * Math.PI / 180;
  const lat1 = toRadians(Number(first.lat));
  const lat2 = toRadians(Number(second.lat));
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(Number(second.lng) - Number(first.lng));
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)));
}

function browserGpsFromPosition(position) {
  const lat = Number(position?.coords?.latitude);
  const lng = Number(position?.coords?.longitude);
  const accuracy = Number(position?.coords?.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    timestamp: Number(position?.timestamp) || Date.now(),
    source: "browser",
  };
}

function isReliableGpsFix(gps, now = Date.now()) {
  if (!gps || !Number.isFinite(Number(gps.lat)) || !Number.isFinite(Number(gps.lng))) return false;
  if (!isInsideLisbonBounds(Number(gps.lat), Number(gps.lng))) return false;
  const accuracy = Number(gps.accuracy);
  const timestamp = Number(gps.timestamp);
  if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 50) return false;
  if (!Number.isFinite(timestamp)) return false;
  const age = now - timestamp;
  return age >= -5_000 && age <= 30_000;
}

function isUsableUploadGpsFix(gps, now = Date.now()) {
  return isUsableUploadGpsFixForContext(gps, now, { allowOutsideLisbon: false });
}

function isUsableUploadGpsFixForContext(gps, now = Date.now(), { allowOutsideLisbon = false } = {}) {
  if (!gps || !Number.isFinite(Number(gps.lat)) || !Number.isFinite(Number(gps.lng))) return false;
  if (!allowOutsideLisbon && !isInsideLisbonBounds(Number(gps.lat), Number(gps.lng))) return false;
  const accuracy = Number(gps.accuracy);
  const timestamp = Number(gps.timestamp);
  if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > MAX_UPLOAD_GPS_ACCURACY_METERS) return false;
  if (!Number.isFinite(timestamp)) return false;
  const age = now - timestamp;
  return age >= -5_000 && age <= MAX_UPLOAD_GPS_AGE_MS;
}

function locationPermissionCopy(userAgent = navigator.userAgent || "") {
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return {
      instructions: "iphone or ipad: open settings → privacy & security → location services → safari websites, choose while using the app, and turn precise location on. then return here and retry.",
      helpUrl: "https://support.apple.com/102647",
    };
  }
  if (/android/i.test(userAgent)) {
    return {
      instructions: "android chrome: tap the site information icon beside the address bar → permissions → location → allow. also make sure location is enabled for chrome in device settings, then retry.",
      helpUrl: "https://support.google.com/chrome/answer/142065?co=GENIE.Platform%3DAndroid&hl=en",
    };
  }
  return {
    instructions: "allow location for this website from the icon beside the address bar or from your browser privacy settings, then return here and retry.",
    helpUrl: "https://support.google.com/chrome/answer/114662",
  };
}

async function geolocationPermissionState() {
  if (!navigator.permissions?.query) return "unknown";
  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state || "unknown";
  } catch {
    return "unknown";
  }
}

async function refreshAdminCaptureSession() {
  if (typeof fetch !== "function") return adminCaptureSession;
  try {
    const response = await fetch("/api/admin-session", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = response.ok ? await response.json() : null;
    adminCaptureSession = Boolean(data?.authenticated);
    adminSessionChecked = true;
    if (adminOpenButton) adminOpenButton.hidden = !adminCaptureSession;
    if (activeViewerTile) syncViewerAdminEdit(activeViewerTile);
  } catch {
    adminCaptureSession = false;
    adminSessionChecked = true;
    if (azulejoViewerEditSeparator) azulejoViewerEditSeparator.hidden = true;
    if (azulejoViewerEdit) azulejoViewerEdit.hidden = true;
  }
  return adminCaptureSession;
}

async function requestLocationPermission() {
  return requestLocationPermissionForContext({ allowOutsideLisbon: false });
}

async function requestLocationPermissionForContext({ allowOutsideLisbon = false } = {}) {
  if (!navigator.geolocation?.getCurrentPosition) return { state: "unsupported", gps: null };
  const currentState = await geolocationPermissionState();
  if (currentState === "denied") return { state: "denied", gps: null };
  return new Promise((resolve) => {
    let settled = false;
    let failures = 0;
    const succeed = (position) => {
      if (settled) return;
      const gps = browserGpsFromPosition(position);
      if (!gps) {
        failures += 1;
        if (failures >= 2) {
          settled = true;
          resolve({ state: "unavailable", gps: null });
        }
        return;
      }
      if (!allowOutsideLisbon && !isInsideLisbonBounds(Number(gps.lat), Number(gps.lng))) {
        settled = true;
        resolve({ state: "outside-lisbon", gps: null });
        return;
      }
      settled = true;
      resolve({ state: "granted", gps: isUsableUploadGpsFixForContext(gps, Date.now(), { allowOutsideLisbon }) ? gps : null });
    };
    const fail = async (error) => {
      if (settled) return;
      const state = await geolocationPermissionState();
      if (Number(error?.code) === 1 || state === "denied") {
        settled = true;
        resolve({ state: "denied", gps: null });
        return;
      }
      failures += 1;
      if (failures >= 2) {
        settled = true;
        resolve({ state: "unavailable", gps: null });
      }
    };
    try {
      navigator.geolocation.getCurrentPosition(succeed, fail, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20_000,
      });
      navigator.geolocation.getCurrentPosition(succeed, fail, {
        enableHighAccuracy: false,
        maximumAge: 120_000,
        timeout: 10_000,
      });
    } catch {
      resolve({ state: "unavailable", gps: null });
    }
  });
}

function showLocationPermissionSheet(reason = "unavailable") {
  if (!locationPermissionSheet) return;
  const copy = locationPermissionCopy();
  const outsideLisbon = reason === "outside-lisbon";
  locationPermissionMessage.textContent = reason === "denied"
    ? "location access is blocked. you must enable location permission to record an azulejo."
    : reason === "unsupported"
      ? "this browser cannot provide the location required to record an azulejo."
      : outsideLisbon
        ? "recording is only available in Lisbon for now."
        : "an accurate location could not be found. check location permission and device location services before sending.";
  locationPermissionSheet.dataset.reason = reason;
  locationPermissionInstructions.textContent = outsideLisbon ? "" : copy.instructions;
  locationPermissionInstructions.hidden = outsideLisbon;
  locationPermissionHelp.href = copy.helpUrl;
  locationPermissionHelp.hidden = outsideLisbon;
  locationPermissionRetry.textContent = outsideLisbon ? "back to the map" : "retry location";
  locationPermissionSheet.classList.add("is-open");
  locationPermissionSheet.setAttribute("aria-hidden", "false");
}

function closeLocationPermissionSheet() {
  locationPermissionSheet?.classList.remove("is-open");
  locationPermissionSheet?.setAttribute("aria-hidden", "true");
  delete locationPermissionSheet?.dataset.reason;
}

function setCameraPermissionStep(step, state) {
  step?.classList.remove("is-pending", "is-granted", "is-denied");
  step?.classList.add(`is-${state}`);
}

function setCameraPageState(active) {
  document.documentElement?.classList.toggle("is-camera-open", active);
  document.body?.classList.toggle("is-camera-open", active);
  themeColorMeta?.setAttribute("content", active ? "#000000" : "#ffffff");
}

function openPermissionCameraShell() {
  if (!squareCamera) return;
  setCameraPageState(true);
  squareCamera.classList.add("is-open", "is-permission");
  squareCamera.setAttribute("aria-hidden", "false");
  squareCameraCapture.disabled = true;
  setCameraPermissionStep(cameraPermissionStep, "pending");
  setCameraPermissionStep(locationPermissionStep, "pending");
}

function closePermissionCameraShell() {
  squareCamera?.classList.remove("is-permission");
}

async function retryLocationPermission() {
  if (!locationPermissionRetry) return;
  if (locationPermissionSheet?.dataset.reason === "outside-lisbon") {
    closeLocationPermissionSheet();
    return;
  }
  const allowOutsideLisbon = await refreshAdminCaptureSession();
  locationPermissionRetry.disabled = true;
  locationPermissionRetry.textContent = "checking location...";
  const result = await requestLocationPermissionForContext({ allowOutsideLisbon });
  locationPermissionRetry.disabled = false;
  locationPermissionRetry.textContent = "retry location";
  if (result.state !== "granted") {
    showLocationPermissionSheet(result.state);
    return;
  }
  if (result.gps) focusUserLocation(result.gps, false);
  closeLocationPermissionSheet();
  if (pendingCapture) {
    pendingCapture.gpsPromise = readReliableBrowserPosition(RELIABLE_GPS_TIMEOUT_MS, { allowOutsideLisbon });
    showCaptureSendStatus("locating...", 1800);
  } else {
    openSquareCamera();
  }
}

async function beginRecordingFlow() {
  if (!recordHistoryButton || recordHistoryButton.disabled) return;
  const allowOutsideLisbon = await refreshAdminCaptureSession();
  openPermissionCameraShell();
  await new Promise((resolve) => window.setTimeout(resolve, 900));
  recordHistoryButton.disabled = true;
  recordHistoryButton.textContent = "checking location...";
  const result = await requestLocationPermissionForContext({ allowOutsideLisbon });
  recordHistoryButton.disabled = false;
  recordHistoryButton.textContent = "record azulejos now";
  if (result.state === "denied" || result.state === "unsupported" || result.state === "outside-lisbon") {
    setCameraPermissionStep(locationPermissionStep, "denied");
    closeSquareCamera();
    showLocationPermissionSheet(result.state);
    return;
  }
  setCameraPermissionStep(locationPermissionStep, result.state === "granted" ? "granted" : "pending");
  if (result.gps) focusUserLocation(result.gps, false);
  openSquareCamera();
}

const RECORD_ONBOARDING_STORAGE_KEY = "open-azulejos-record-onboarding-v1";
let recordOnboardingStep = 0;

function hasSeenRecordOnboarding() {
  try {
    return localStorage.getItem(RECORD_ONBOARDING_STORAGE_KEY) === "seen";
  } catch {
    return false;
  }
}

function markRecordOnboardingSeen() {
  try {
    localStorage.setItem(RECORD_ONBOARDING_STORAGE_KEY, "seen");
  } catch {
    // Recording still works when private browsing blocks local storage.
  }
}

function renderRecordOnboardingStep() {
  recordOnboardingSteps.forEach((step, index) => {
    const active = index === recordOnboardingStep;
    step.hidden = !active;
    step.classList.toggle("is-active", active);
  });
  if (recordOnboardingBack) recordOnboardingBack.hidden = recordOnboardingStep === 0;
  if (recordOnboardingNext) {
    recordOnboardingNext.textContent = recordOnboardingStep === recordOnboardingSteps.length - 1
      ? "start recording"
      : "next";
  }
}

function openRecordOnboarding() {
  recordOnboardingStep = 0;
  renderRecordOnboardingStep();
  recordOnboarding?.classList.add("is-open");
  recordOnboarding?.setAttribute("aria-hidden", "false");
  recordOnboardingNext?.focus();
}

function closeRecordOnboarding() {
  recordOnboarding?.classList.remove("is-open");
  recordOnboarding?.setAttribute("aria-hidden", "true");
  recordHistoryButton?.focus();
}

function requestRecording() {
  if (hasSeenRecordOnboarding()) {
    beginRecordingFlow();
    return;
  }
  openRecordOnboarding();
}

function advanceRecordOnboarding() {
  if (recordOnboardingStep < recordOnboardingSteps.length - 1) {
    recordOnboardingStep += 1;
    renderRecordOnboardingStep();
    return;
  }
  markRecordOnboardingSeen();
  closeRecordOnboarding();
  beginRecordingFlow();
}

function latestUsableUploadGps() {
  return isUsableUploadGpsFixForContext(latestUserLocation, Date.now(), { allowOutsideLisbon: adminCaptureSession })
    ? latestUserLocation
    : null;
}

function readReliableBrowserPosition(timeoutMs = RELIABLE_GPS_TIMEOUT_MS, { allowOutsideLisbon = false } = {}) {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    let watchId = null;
    let previousFix = null;
    let bestFix = null;
    let bestUsableFix = null;
    let consistentFixes = 0;
    const finish = (gps) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (watchId !== null && typeof navigator.geolocation.clearWatch === "function") {
        navigator.geolocation.clearWatch(watchId);
      }
      resolve(gps);
    };
    const consider = (position) => {
      const fix = browserGpsFromPosition(position);
      if (!isUsableUploadGpsFixForContext(fix, Date.now(), { allowOutsideLisbon })) return;
      if (!bestUsableFix || Number(fix.accuracy) < Number(bestUsableFix.accuracy)) bestUsableFix = fix;
      if (!isReliableGpsFix(fix)) return;
      if (!bestFix || Number(fix.accuracy) < Number(bestFix.accuracy)) bestFix = fix;
      const stabilityRadius = previousFix
        ? Math.max(20, Math.min(60, Number(previousFix.accuracy) + Number(fix.accuracy)))
        : 0;
      consistentFixes = previousFix && gpsDistanceMeters(previousFix, fix) <= stabilityRadius
        ? consistentFixes + 1
        : 1;
      previousFix = fix;
      if (consistentFixes >= 2) finish(bestFix);
    };
    const fail = (error) => {
      if (Number(error?.code) === 1) finish(null);
    };
    const timeout = window.setTimeout(() => finish(bestFix || bestUsableFix), timeoutMs);
    try {
      if (typeof navigator.geolocation.watchPosition === "function") {
        watchId = navigator.geolocation.watchPosition(consider, fail, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: timeoutMs,
        });
      }
      navigator.geolocation.getCurrentPosition(consider, fail, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: timeoutMs,
      });
    } catch {
      finish(null);
    }
  });
}

function focusUserLocation(gps, animate = true) {
  const point = [gps.lat, gps.lng];
  if (userLocationMarker && typeof userLocationMarker.setLatLng === "function") {
    userLocationMarker.setLatLng(point);
  } else if (typeof L.circleMarker === "function") {
    userLocationMarker = L.circleMarker(point, {
      pane: "user-location",
      radius: 6,
      stroke: false,
      fillColor: "#1769e0",
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
  }
  latestUserLocation = gps;
  if (!animate) return;
  if (typeof map.flyTo === "function") {
    map.flyTo(point, 18, { animate: true, duration: 0.8 });
  } else {
    map.setView(point, 18);
  }
}

function finishLocationSearch(success) {
  if (userLocationSearchTimer !== null) {
    window.clearTimeout(userLocationSearchTimer);
    userLocationSearchTimer = null;
  }
  mapLocationButton.disabled = false;
  mapLocationButton.classList.remove("is-locating");
  mapLocationButton.classList.toggle("is-active", success);
  mapLocationButton.title = success ? "center on my location" : "location unavailable";
  if (!success) {
    window.setTimeout(() => {
      if (mapLocationButton) mapLocationButton.title = "show azulejos near me";
    }, 1800);
  }
}

function acceptLivePosition(position) {
  const lat = Number(position?.coords?.latitude);
  const lng = Number(position?.coords?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const firstFix = latestUserLocation === null;
  focusUserLocation({ lat, lng, accuracy: Number(position.coords.accuracy) || null }, firstFix);
  if (firstFix) finishLocationSearch(true);
  return true;
}

function stopLocationWatch() {
  if (userLocationWatchId !== null && typeof navigator.geolocation?.clearWatch === "function") {
    navigator.geolocation.clearWatch(userLocationWatchId);
  }
  userLocationWatchId = null;
}

function locateUserOnMap() {
  if (!mapLocationButton || mapLocationButton.disabled) return;
  if (userLocationWatchId !== null && latestUserLocation) {
    focusUserLocation(latestUserLocation, true);
    return;
  }
  mapLocationButton.classList.remove("is-active");
  mapLocationButton.classList.add("is-locating");
  mapLocationButton.disabled = true;
  mapLocationButton.title = "locating";
  if (!navigator.geolocation || typeof navigator.geolocation.watchPosition !== "function") {
    finishLocationSearch(false);
    return;
  }
  userLocationSearchTimer = window.setTimeout(() => {
    if (latestUserLocation) return;
    stopLocationWatch();
    finishLocationSearch(false);
  }, 35_000);
  try {
    userLocationWatchId = navigator.geolocation.watchPosition(
      acceptLivePosition,
      (error) => {
        if (latestUserLocation || Number(error?.code) !== 1) return;
        stopLocationWatch();
        finishLocationSearch(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 30_000,
      },
    );
    navigator.geolocation.getCurrentPosition(
      acceptLivePosition,
      (error) => {
        if (!latestUserLocation && Number(error?.code) === 1) {
          stopLocationWatch();
          finishLocationSearch(false);
        }
      },
      {
        enableHighAccuracy: false,
        maximumAge: 120_000,
        timeout: 15_000,
      },
    );
  } catch (error) {
    stopLocationWatch();
    finishLocationSearch(false);
  }
}

async function placeRecordedAzulejo(squareImage, gps = null, uploadId = null, originalImageData = null, cropPoints = null, rights = null) {
  const center = map.getCenter();
  const lat = gps?.lat ?? center.lat;
  const lng = gps?.lng ?? center.lng;
  const cell = cellForLatLng(lat, lng);
  const payload = {
    imageData: squareImage,
    originalImageData,
    lat,
    lng,
    title: "recorded azulejo",
    cell: cell.code,
    words: cell.words,
    uploadId,
    gpsAccuracy: gps?.accuracy ?? null,
    gpsTimestamp: gps?.timestamp ?? null,
    locationSource: gps?.source || "unknown",
    cropPoints,
    editSettings: {},
    photographerCredit: rights?.photographerCredit || null,
    photoLicense: rights?.photoLicense || null,
    contributorConsent: Boolean(rights?.contributorConsent),
    contributorConsentAt: rights?.contributorConsentAt || null,
  };
  let stored;
  if (navigator.onLine === false) {
    stored = await queueRecordedAzulejo(payload);
  } else {
    try {
      stored = await saveRecordedAzulejo(payload);
    } catch (error) {
      if (!isQueueableUploadFailure(error)) throw error;
      stored = await queueRecordedAzulejo(payload);
    }
  }
  maybeInviteContributorAccount(rememberContributionReceipt(stored));
  if (stored.record?.moderation_status === "approved") {
    addAzulejoTile({
      id: stored.record.id,
      title: "recorded azulejo",
      lat,
      lng,
      image: stored.record.image_url || stored.imageUrl,
      source: "supabase-camera",
      photographerCredit: stored.record.photographer_credit || rights?.photographerCredit || "",
      photoLicense: stored.record.photo_license || rights?.photoLicense || "",
      minZoom: map.getZoom(),
    }, { skipPersistence: true });
  }
  highlightCell({ ...cell, lat, lng }, { fit: false });
  scheduleRecordedAzulejoLoad(0);
  return stored;
}

function viewportRenderBudget(width, height) {
  const area = Math.max(1, Number(width) || 0) * Math.max(1, Number(height) || 0);
  return Math.max(160, Math.min(900, Math.round(area / 1400)));
}

function currentViewportRequest() {
  const bounds = map.getBounds();
  const stage = document.querySelector(".map-stage");
  const rect = stage?.getBoundingClientRect?.() || { width: window.innerWidth, height: window.innerHeight };
  return {
    bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
    limit: viewportRenderBudget(rect.width, rect.height),
    step: gridStepForZoom(map.getZoom(), Number(gridDensity.value)),
  };
}

function removeServerTilesOutside(nextIds) {
  let removedActiveViewerTile = false;
  displayedTiles = displayedTiles.filter((tile) => {
    if (!tile.isServer || nextIds.has(tile.id)) return true;
    if (tile.id === activeViewerTileId) removedActiveViewerTile = true;
    setLayerPresence(tile.layerGroup, tile.mosaicCell, false);
    return false;
  });
  serverTilesById.forEach((tile, id) => {
    if (!nextIds.has(id)) serverTilesById.delete(id);
  });
  if (removedActiveViewerTile) closeAzulejoViewer();
}

function rememberServerTile(tile) {
  serverTileCacheById.delete(tile.id);
  serverTileCacheById.set(tile.id, tile);
}

function pruneServerTileCache() {
  let inactiveCount = 0;
  serverTileCacheById.forEach((tile, id) => {
    if (!serverTilesById.has(id)) inactiveCount += 1;
  });
  if (inactiveCount <= MAX_INACTIVE_SERVER_TILES) return;
  for (const [id] of serverTileCacheById) {
    if (serverTilesById.has(id)) continue;
    serverTileCacheById.delete(id);
    inactiveCount -= 1;
    if (inactiveCount <= MAX_INACTIVE_SERVER_TILES) break;
  }
}

function synchronizeServerTiles(records) {
  const validRecords = records.filter((record) => (
    record?.id
    && record.image_url
    && (!record.moderation_status || record.moderation_status === "approved")
    && Number.isFinite(Number(record.lat))
    && Number.isFinite(Number(record.lng))
  ));
  const nextIds = new Set(validRecords.map((record) => record.id));
  removeServerTilesOutside(nextIds);

  validRecords.forEach((record) => {
    if (serverTilesById.has(record.id)) {
      updateTileOpenData(serverTilesById.get(record.id), record);
      return;
    }
    let tile = serverTileCacheById.get(record.id);
    if (tile) {
      updateTileOpenData(tile, record);
      rememberServerTile(tile);
      displayedTiles.push(tile);
    } else {
      tile = addAzulejoTile({
        id: record.id,
        title: record.title || "recorded azulejo",
        lat: Number(record.lat),
        lng: Number(record.lng),
        image: record.image_url,
        source: "supabase-camera",
        photographerCredit: record.photographer_credit,
        photoLicense: record.photo_license,
        minZoom: 12,
      }, {
        isServer: true,
        skipPersistence: true,
        deferRefresh: true,
      });
      rememberServerTile(tile);
    }
    serverTilesById.set(tile.id, tile);
  });
  pruneServerTileCache();

  setMosaicOpacity();
  refreshTileVisibility();
}

async function loadRecordedAzulejos() {
  if (typeof fetch !== "function") {
    updateMapAzulejoCount();
    return 0;
  }
  const sequence = ++serverViewportSequence;
  serverViewportRequest?.abort?.();
  serverViewportRequest = typeof AbortController === "function" ? new AbortController() : null;
  const request = currentViewportRequest();
  const params = new URLSearchParams({
    bbox: request.bbox.join(","),
    limit: String(request.limit),
    step: String(request.step),
  });
  try {
    const response = await fetch(`/api/records?${params}`, { signal: serverViewportRequest?.signal });
    if (!response.ok) {
      updateMapAzulejoCount();
      return 0;
    }
    const data = await response.json();
    if (sequence !== serverViewportSequence) return 0;
    const records = Array.isArray(data.records) ? data.records : [];
    const fallbackCounts = sceneAzulejoCounts(displayedTiles, map.getBounds(), map.getZoom());
    const normalizedCounts = normalizeServerSceneCounts(data, records, fallbackCounts);
    serverViewportCount = normalizedCounts.visible;
    serverTotalCount = normalizedCounts.total;
    serverCountsLoaded = true;
    synchronizeServerTiles(records);
    updateMapAzulejoCount();
    return records.length;
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.warn("Supabase records unavailable:", error.message);
      updateMapAzulejoCount();
    }
    return 0;
  }
}

function scheduleRecordedAzulejoLoad(delay = 160) {
  if (serverViewportTimer !== null) window.clearTimeout(serverViewportTimer);
  serverViewportTimer = window.setTimeout(() => {
    serverViewportTimer = null;
    loadRecordedAzulejos();
  }, delay);
}

async function recordAzulejoFromCameraFile(file) {
  if (!file) return;
  recordHistoryButton.disabled = true;
  recordHistoryButton.textContent = "preparing...";
  try {
    const image = await loadImageFromFile(file);
    const gps = await readGpsFromExif(file);
    await openCapturePreview(image, gps);
  } finally {
    recordHistoryButton.disabled = false;
    recordHistoryButton.textContent = "record azulejos now";
  }
}

async function openSquareCamera() {
  if (!navigator.mediaDevices?.getUserMedia || !squareCamera || !squareCameraVideo) {
    closeSquareCamera();
    recordCameraInput?.click();
    return;
  }
  try {
    setCameraPageState(true);
    squareCamera.classList.add("is-open", "is-permission");
    squareCamera.setAttribute("aria-hidden", "false");
    setCameraPermissionStep(cameraPermissionStep, "pending");
    squareCameraCapture.disabled = true;
    squareCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1600 },
        height: { ideal: 1600 },
        aspectRatio: { ideal: 1 },
      },
      audio: false,
    });
    setCameraPermissionStep(cameraPermissionStep, "granted");
    squareCameraVideo.srcObject = squareCameraStream;
    closePermissionCameraShell();
    squareCamera.classList.add("is-open");
    squareCamera.setAttribute("aria-hidden", "false");
    await squareCameraVideo.play().catch(() => {});
    if (!squareCameraVideo.videoWidth) {
      await new Promise((resolve) => {
        const timeout = window.setTimeout(resolve, 5000);
        squareCameraVideo.addEventListener("loadedmetadata", () => {
          window.clearTimeout(timeout);
          resolve();
        }, { once: true });
      });
    }
    squareCameraCapture.disabled = false;
  } catch (error) {
    console.warn("Square camera unavailable:", error.message);
    setCameraPermissionStep(cameraPermissionStep, "denied");
    closeSquareCamera();
    squareCameraCapture.disabled = false;
    recordCameraInput?.click();
  }
}

function closeSquareCamera() {
  squareCameraStream?.getTracks().forEach((track) => track.stop());
  squareCameraStream = null;
  if (squareCameraVideo) squareCameraVideo.srcObject = null;
  squareCamera?.classList.remove("is-open", "is-permission");
  squareCamera?.setAttribute("aria-hidden", "true");
  setCameraPageState(false);
}

async function captureSquareCamera() {
  if (!squareCameraVideo) return;
  squareCameraCapture.disabled = true;
  squareCameraCapture.textContent = "preview...";
  try {
    const frameImage = videoFrameDataUrl(squareCameraVideo);
    closeSquareCamera();
    await openCapturePreview(frameImage);
  } finally {
    squareCameraCapture.disabled = false;
    squareCameraCapture.textContent = "capture";
  }
}

function showCaptureSendStatus(label, duration = 2200) {
  if (!captureSendButton) return;
  captureSendButton.textContent = label;
  window.setTimeout(() => {
    if (captureSendButton && !captureSendButton.disabled) captureSendButton.textContent = "send";
  }, duration);
}

async function sendPendingCapture() {
  if (!pendingCapture) return;
  captureSendButton.disabled = true;
  if (captureRetakeButton) captureRetakeButton.disabled = true;
  captureSendButton.textContent = "locating...";
  let keepStatus = false;
  let queuedOffline = false;
  try {
    const photographerCredit = captureCreditName();
    const squareImage = drawPendingCapture(true);
    if (!squareImage) throw new Error("image encoding failed");
    const originalImageData = encodeSourceImageForAdmin(pendingCapture.image);
    const cropPoints = normalizedCropPoints(pendingCapture.crop, pendingCapture.image);
    const allowOutsideLisbon = await refreshAdminCaptureSession();
    const gpsCandidate = pendingCapture.gps
      || latestUsableUploadGps()
      || await (pendingCapture.gpsPromise || readReliableBrowserPosition(RELIABLE_GPS_TIMEOUT_MS, { allowOutsideLisbon }));
    const gps = isUsableUploadGpsFixForContext(gpsCandidate, Date.now(), { allowOutsideLisbon }) ? gpsCandidate : null;
    pendingCapture.gpsPromise = null;
    if (!gps) {
      keepStatus = true;
      const permissionState = await geolocationPermissionState();
      showCaptureSendStatus("location permission required", 3200);
      const outsideLisbon = gpsCandidate && !allowOutsideLisbon && !isInsideLisbonBounds(Number(gpsCandidate.lat), Number(gpsCandidate.lng));
      showLocationPermissionSheet(permissionState === "denied" ? "denied" : outsideLisbon ? "outside-lisbon" : "unavailable");
      return;
    }
    captureSendButton.textContent = "sending...";
    recordHistoryButton.disabled = true;
    recordHistoryButton.textContent = "recording...";
    const rights = {
      photographerCredit,
      photoLicense: "CC-BY-4.0",
      contributorConsent: true,
      contributorConsentAt: new Date().toISOString(),
    };
    const stored = await placeRecordedAzulejo(squareImage, gps, pendingCapture.uploadId, originalImageData, cropPoints, rights);
    queuedOffline = Boolean(stored?.queued);
    closeCapturePreview();
  } catch (error) {
    console.error("Azulejo upload failed:", error);
    keepStatus = true;
    showCaptureSendStatus("try again", 2800);
  } finally {
    captureSendButton.disabled = false;
    if (captureRetakeButton) captureRetakeButton.disabled = false;
    if (!keepStatus) captureSendButton.textContent = "send";
    recordHistoryButton.disabled = false;
    recordHistoryButton.textContent = queuedOffline ? "saved offline" : "pending review";
    if (!keepStatus) {
      window.setTimeout(() => {
        if (recordHistoryButton && !recordHistoryButton.disabled) recordHistoryButton.textContent = "record azulejos now";
      }, 2600);
    }
  }
}

function retakePendingCapture() {
  closeCapturePreview();
  openSquareCamera();
}

function normalizeFilename(name = "") {
  return name.trim().toLowerCase().replace(/^.*[\\/]/, "");
}

function splitCsvLine(line, delimiter = ",") {
  const values = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

function countDelimiter(line, delimiter) {
  let count = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      count += 1;
    }
  }
  return count;
}

function detectCsvDelimiter(headerLine) {
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: countDelimiter(headerLine, delimiter) }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || "";
      return row;
    }, {});
  });
}

function firstValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return "";
}

function isInsideLisbonBounds(lat, lng) {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= LISBON_BOUNDS.south
    && lat <= LISBON_BOUNDS.north
    && lng >= LISBON_BOUNDS.west
    && lng <= LISBON_BOUNDS.east;
}

function looksLikeSwappedLisbonCoordinates(lat, lng) {
  return !isInsideLisbonBounds(lat, lng) && isInsideLisbonBounds(lng, lat);
}

function rowToTile(row, index) {
  const image = firstValue(row, [
    "image", "filename", "file", "photo", "path", "media", "asset", "src", "url",
    "image_path", "imagefile", "photo_file",
  ]);
  const lat = Number.parseFloat(String(firstValue(row, ["lat", "latitude", "y"])).replace(",", "."));
  const lng = Number.parseFloat(String(firstValue(row, ["lng", "lon", "long", "longitude", "x"])).replace(",", "."));
  if (!image || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: row.id || `geo-${index + 1}`,
    image,
    imageKey: normalizeFilename(image),
    lat,
    lng,
    insideLisbon: isInsideLisbonBounds(lat, lng),
    possibleCoordinateSwap: looksLikeSwappedLisbonCoordinates(lat, lng),
    title: firstValue(row, ["title", "name", "label", "caption"]) || normalizeFilename(image),
    source: row.source || "geodata",
  };
}

function parseGeoJson(text) {
  const data = JSON.parse(text);
  if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    throw new Error("GeoJSON FeatureCollection attendu");
  }
  return data.features.map((feature, index) => {
    const props = feature.properties || {};
    const coordinates = feature.geometry?.type === "Point" ? feature.geometry.coordinates || [] : [];
    return rowToTile({
      ...props,
      lng: coordinates[0],
      lat: coordinates[1],
      id: props.id || feature.id || `geojson-${index + 1}`,
    }, index);
  }).filter(Boolean);
}

async function readGeodataFile(file) {
  const text = await file.text();
  const name = file.name.toLowerCase();
  let rawRows = [];
  if (name.endsWith(".geojson") || name.endsWith(".json") || text.trim().startsWith("{")) {
    const data = JSON.parse(text);
    if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
      throw new Error("GeoJSON FeatureCollection attendu");
    }
    rawRows = data.features.map((feature, index) => {
      const props = feature.properties || {};
      const coordinates = feature.geometry?.type === "Point" ? feature.geometry.coordinates || [] : [];
      return {
        ...props,
        lng: coordinates[0] ?? props.lng ?? props.lon ?? props.longitude,
        lat: coordinates[1] ?? props.lat ?? props.latitude,
        id: props.id || feature.id || `geojson-${index + 1}`,
      };
    });
  } else {
    rawRows = parseCsv(text);
  }
  const rows = rawRows.map(rowToTile).filter(Boolean);
  lastGeoReport = {
    total: rawRows.length,
    valid: rows.length,
    ignored: rawRows.length - rows.length,
  };
  return rows;
}

function computeBatchReport(images, rows, geoReport = lastGeoReport) {
  const imageKeys = new Set(images.keys());
  const rowKeys = new Set(rows.map((row) => row.imageKey));
  const readyRows = rows.filter((row) => imageKeys.has(row.imageKey));
  const missingImages = rows.filter((row) => !imageKeys.has(row.imageKey));
  const unusedImages = [...imageKeys].filter((key) => !rowKeys.has(key));
  const outsideLisbon = rows.filter((row) => row.insideLisbon === false);
  const possibleSwaps = rows.filter((row) => row.possibleCoordinateSwap);
  return {
    imageCount: imageKeys.size,
    rowCount: rows.length,
    readyCount: readyRows.length,
    ignoredRows: geoReport.ignored || 0,
    readyRows,
    missingImages,
    unusedImages,
    outsideLisbon,
    possibleSwaps,
  };
}

function formatBatchReportLine(label, values) {
  const item = document.createElement("li");
  const strong = document.createElement("strong");
  strong.textContent = label;
  item.append(strong, ` ${values.join(", ")}`);
  return item;
}

function updateBatchStatus(message) {
  const report = computeBatchReport(uploadedImages, importedGeoRows);
  processBatchButton.disabled = report.readyCount === 0;
  if (message) {
    batchStatus.textContent = message;
    return;
  }
  batchStatus.textContent = "";
  const summary = document.createElement("p");
  const ignored = report.ignoredRows ? ` · ${report.ignoredRows} lignes ignorées` : "";
  summary.textContent = `${report.imageCount} images · ${report.rowCount} positions · ${report.readyCount} prêtes${ignored}`;
  batchStatus.append(summary);

  const details = document.createElement("ul");
  if (report.missingImages.length) {
    details.append(formatBatchReportLine(
      "Géodata sans image:",
      report.missingImages.slice(0, 6).map((row) => row.imageKey),
    ));
  }
  if (report.unusedImages.length) {
    details.append(formatBatchReportLine(
      "Images sans géodata:",
      report.unusedImages.slice(0, 6),
    ));
  }
  if (report.possibleSwaps.length) {
    const warning = formatBatchReportLine(
      "Lat/lng possiblement inversés:",
      report.possibleSwaps.slice(0, 6).map((row) => row.imageKey),
    );
    warning.className = "batch-warning";
    details.append(warning);
  }
  if (report.outsideLisbon.length) {
    const warning = formatBatchReportLine(
      "Hors emprise Lisbonne:",
      report.outsideLisbon.slice(0, 6).map((row) => row.imageKey),
    );
    warning.className = "batch-warning";
    details.append(warning);
  }
  if (details.children.length) {
    batchStatus.append(details);
  }
}

async function buildGeoRowsFromExif(files) {
  const rows = [];
  for (const [index, file] of files.entries()) {
    const gps = await readGpsFromExif(file);
    if (gps) {
      rows.push({
        id: `exif-${index + 1}`,
        image: file.name,
        imageKey: normalizeFilename(file.name),
        lat: gps.lat,
        lng: gps.lng,
        title: file.name,
        source: "gps-exif",
      });
    }
  }
  return rows;
}

async function processBatch() {
  const rows = importedGeoRows.filter((row) => uploadedImages.has(row.imageKey));
  if (!rows.length) return;

  processBatchButton.disabled = true;
  batchStatus.textContent = `Extraction de ${rows.length} fragments...`;

  const scratch = document.createElement("canvas");
  let added = 0;
  for (const row of rows) {
    const file = uploadedImages.get(row.imageKey);
    const image = await loadImageFromFile(file);
    const result = renderExtractedTile(image, scratch);
    addAzulejoTile({
      id: row.id,
      title: row.title,
      lat: row.lat,
      lng: row.lng,
      image: result.dataUrl,
      source: row.image,
      crop: result.crop,
    });
    added += 1;
  }

  fitTilesOnMap(rows);
  updateBatchStatus(`${added} fragments ajoutés à la mosaïque`);
}

function saveMosaicState() {
  try {
    localStorage.setItem("azulejo-atlas-placed", JSON.stringify(placedTiles));
  } catch {
    batchStatus.textContent = "Mosaïque visible, mais stockage local trop plein pour sauvegarder toutes les images";
  }
}

function restoreMosaicState() {
  try {
    const saved = JSON.parse(localStorage.getItem("azulejo-atlas-placed") || "[]");
    if (!Array.isArray(saved)) return;
    const localOnly = saved.filter((fragment) => !["supabase-camera", "offline-pending"].includes(fragment?.source));
    if (localOnly.length !== saved.length) {
      localStorage.setItem("azulejo-atlas-placed", JSON.stringify(localOnly));
    }
    loadSavedFragments(localOnly, { append: true, sourceLabel: "restored-import" });
  } catch {
    localStorage.removeItem("azulejo-atlas-placed");
  }
}

function normalizeSavedFragment(fragment, index, sourceLabel = "archive-import") {
  const lat = Number(fragment.lat);
  const lng = Number(fragment.lng);
  const image = fragment.imageData || fragment.image;
  if (!image || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: fragment.id || `archive-${index + 1}`,
    title: fragment.title || `Archive ${index + 1}`,
    lat,
    lng,
    image,
    source: fragment.source || sourceLabel,
    crop: fragment.crop || null,
  };
}

function loadSavedFragments(fragments, options = {}) {
  const valid = fragments
    .map((fragment, index) => normalizeSavedFragment(fragment, index, options.sourceLabel))
    .filter(Boolean);
  if (!options.append) {
    userLayer.clearLayers();
    placedTiles = [];
    displayedTiles = displayedTiles.filter((tile) => tile.isSample);
    markerIndex = sampleTiles.length;
  }
  valid.forEach((tile) => addAzulejoTile(tile, { restoring: options.append }));
  saveMosaicState();
  updateCounts();
  renderFragmentIndex();
  return valid.length;
}

function loadDemoArchive() {
  const fragments = sampleTiles.map((tile, index) => ({
    id: `demo-${index + 1}`,
    title: `démo ${tile.title}`,
    lat: tile.lat,
    lng: tile.lng,
    source: "demo",
    imageData: tile.image,
    crop: {
      method: "demo",
      score: 100,
    },
  }));
  const count = loadSavedFragments(fragments, { append: false, sourceLabel: "demo" });
  updateBatchStatus(`${count} fragments de démonstration chargés comme imports`);
  fitTilesOnMap(visibleTiles());
}

function parseArchiveExport(text) {
  const data = JSON.parse(text);
  const fragments = Array.isArray(data) ? data : data.fragments;
  if (!Array.isArray(fragments)) {
    throw new Error("Archive JSON invalide: propriété fragments manquante");
  }
  return fragments;
}

async function importArchiveFile(file) {
  const fragments = parseArchiveExport(await file.text());
  const count = loadSavedFragments(fragments, { append: false, sourceLabel: file.name });
  updateBatchStatus(`${count} fragments restaurés depuis ${file.name}`);
  fitTilesOnMap(visibleTiles());
}

function clearImportedMosaic() {
  userLayer.clearLayers();
  placedTiles = [];
  displayedTiles = displayedTiles.filter((tile) => tile.isSample);
  saveMosaicState();
  markerIndex = sampleTiles.length;
  updateCounts();
  renderFragmentIndex();
  updateBatchStatus("imports vidés · les fragments de démonstration restent visibles");
}

function downloadJson(payload, filename) {
  downloadText(JSON.stringify(payload, null, 2), filename, "application/json");
}

function downloadText(text, filename, type = "text/plain") {
  const blob = new Blob([text], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function fragmentsToCsv(fragments) {
  const headers = [
    "id",
    "title",
    "lat",
    "lng",
    "cell",
    "words",
    "source",
    "cropMethod",
    "cropScore",
  ];
  const rows = fragments.map((fragment) => [
    fragment.id,
    fragment.title,
    fragment.lat,
    fragment.lng,
    fragment.cell,
    fragment.words,
    fragment.source,
    fragment.crop?.method || "",
    fragment.crop?.score ?? "",
  ]);
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
}

function exportMosaic() {
  const payload = {
    type: "AzulejoAtlasExport",
    generatedAt: new Date().toISOString(),
    grid: {
      type: "web-mercator",
      cellMeters: GRID_METERS,
    },
    fragments: placedTiles,
  };
  downloadJson(payload, "azulejo-atlas-lisboa-fragments.json");
}

function bboxToPolygon(bboxString) {
  const [west, south, east, north] = bboxString.split(",").map(Number);
  if (![west, south, east, north].every(Number.isFinite)) return null;
  return [[
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ]];
}

function fragmentToGeoJsonFeature(fragment) {
  const coordinates = bboxToPolygon(fragment.bounds);
  if (!coordinates) return null;
  return {
    type: "Feature",
    properties: {
      id: fragment.id,
      title: fragment.title,
      lat: Number.isFinite(Number(fragment.lat)) ? Number(fragment.lat) : null,
      lng: Number.isFinite(Number(fragment.lng)) ? Number(fragment.lng) : null,
      cell: fragment.cell,
      words: fragment.words,
      source: fragment.source,
      bbox: fragment.bounds,
      cropMethod: fragment.crop?.method || null,
      cropScore: fragment.crop?.score ?? null,
    },
    geometry: {
      type: "Polygon",
      coordinates,
    },
  };
}

function exportGeoJson() {
  const features = placedTiles.map(fragmentToGeoJsonFeature).filter(Boolean);
  downloadJson({
    type: "FeatureCollection",
    name: "azulejo-atlas-lisboa",
    features,
  }, "azulejo-atlas-lisboa-cells.geojson");
}

function fragmentToPointGeoJsonFeature(fragment) {
  const lat = Number(fragment.lat);
  const lng = Number(fragment.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const cellFeature = fragmentToGeoJsonFeature(fragment);
  return {
    type: "Feature",
    properties: cellFeature?.properties || {
      id: fragment.id,
      title: fragment.title,
      lat,
      lng,
      cell: fragment.cell,
      words: fragment.words,
      source: fragment.source,
      bbox: fragment.bounds,
      cropMethod: fragment.crop?.method || null,
      cropScore: fragment.crop?.score ?? null,
    },
    geometry: {
      type: "Point",
      coordinates: [lng, lat],
    },
  };
}

function exportPointGeoJson() {
  const features = placedTiles.map(fragmentToPointGeoJsonFeature).filter(Boolean);
  downloadJson({
    type: "FeatureCollection",
    name: "azulejo-atlas-lisboa-points",
    features,
  }, "azulejo-atlas-lisboa-points.geojson");
}

function exportCsv() {
  downloadText(fragmentsToCsv(placedTiles), "azulejo-atlas-lisboa-fragments.csv", "text/csv");
}

imageInput.addEventListener("change", async () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  const gps = await readGpsFromExif(file);
  const image = new Image();
  image.onload = () => {
    extractTile(image);
    if (gps) {
      latInput.value = gps.lat.toFixed(6);
      lngInput.value = gps.lng.toFixed(6);
      cropStatus.textContent = `${cropStatus.textContent} · GPS EXIF détecté`;
    }
    URL.revokeObjectURL(image.src);
  };
  image.src = URL.createObjectURL(file);
});

placeTileButton.addEventListener("click", () => {
  const lat = Number.parseFloat(latInput.value.replace(",", "."));
  const lng = Number.parseFloat(lngInput.value.replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !extractedTileDataUrl) return;
  addAzulejoTile({
    title: `Import ${String(markerIndex + 1).padStart(3, "0")}`,
    lat,
    lng,
    image: extractedTileDataUrl,
    source: "single-import",
    crop: currentCrop,
  });
  map.panTo([lat, lng]);
});

[cropXInput, cropYInput, cropSizeInput].forEach((input) => {
  input.addEventListener("input", refreshManualCrop);
});

batchImagesInput.addEventListener("change", async () => {
  uploadedImages = new Map();
  const files = [...batchImagesInput.files];
  files.forEach((file) => {
    uploadedImages.set(normalizeFilename(file.name), file);
  });
  const exifRows = await buildGeoRowsFromExif(files);
  if (exifRows.length) {
    importedGeoRows = exifRows;
    lastGeoReport = { total: files.length, valid: exifRows.length, ignored: files.length - exifRows.length };
    updateBatchStatus(`${files.length} images · ${exifRows.length} positions GPS EXIF`);
    return;
  }
  updateBatchStatus();
});

geoDataInput.addEventListener("change", async () => {
  const file = geoDataInput.files?.[0];
  if (!file) return;
  try {
    importedGeoRows = await readGeodataFile(file);
    updateBatchStatus();
  } catch (error) {
    importedGeoRows = [];
    updateBatchStatus(`Erreur de lecture: ${error.message}`);
  }
});

archiveInput.addEventListener("change", async () => {
  const file = archiveInput.files?.[0];
  if (!file) return;
  try {
    await importArchiveFile(file);
  } catch (error) {
    updateBatchStatus(`Erreur archive: ${error.message}`);
  }
});

processBatchButton.addEventListener("click", processBatch);
loadDemoButton.addEventListener("click", loadDemoArchive);
exportButton.addEventListener("click", exportMosaic);
exportGeoJsonButton.addEventListener("click", exportGeoJson);
exportPointGeoJsonButton.addEventListener("click", exportPointGeoJson);
exportCsvButton.addEventListener("click", exportCsv);
clearImportsButton.addEventListener("click", clearImportedMosaic);
recordHistoryButton?.addEventListener("click", requestRecording);
recordOnboardingClose?.addEventListener("click", closeRecordOnboarding);
recordOnboardingBack?.addEventListener("click", () => {
  recordOnboardingStep = Math.max(0, recordOnboardingStep - 1);
  renderRecordOnboardingStep();
});
recordOnboardingNext?.addEventListener("click", advanceRecordOnboarding);
squareCameraCapture?.addEventListener("click", captureSquareCamera);
squareCameraCancel?.addEventListener("click", closeSquareCamera);
squareCameraFallback?.addEventListener("click", () => {
  closeSquareCamera();
  recordCameraInput?.click();
});
captureCropZoom?.addEventListener("input", drawPendingCapture);
captureCropX?.addEventListener("input", drawPendingCapture);
captureCropY?.addEventListener("input", drawPendingCapture);
captureRetakeButton?.addEventListener("click", retakePendingCapture);
captureSendButton?.addEventListener("click", sendPendingCapture);
locationPermissionClose?.addEventListener("click", closeLocationPermissionSheet);
locationPermissionRetry?.addEventListener("click", retryLocationPermission);
recordCameraInput?.addEventListener("change", async () => {
  const file = recordCameraInput.files?.[0];
  recordCameraInput.value = "";
  try {
    await recordAzulejoFromCameraFile(file);
  } catch (error) {
    console.error(error);
    recordHistoryButton.textContent = "try another photo";
    window.setTimeout(() => {
      if (recordHistoryButton && !recordHistoryButton.disabled) recordHistoryButton.textContent = "record azulejos now";
    }, 2400);
  }
});
archiveFilterInput.addEventListener("input", renderFragmentIndex);
archiveFilterClearButton.addEventListener("click", () => {
  archiveFilterInput.value = "";
  renderFragmentIndex();
  archiveFilterInput.focus();
});
fitMosaicButton.addEventListener("click", () => fitTilesOnMap());
copyActiveCellButton.addEventListener("click", copyActiveCell);
targetCoordinates?.addEventListener("click", copyTargetCoordinates);
aboutOpenButton?.addEventListener("click", openAboutSheet);
aboutCloseButton?.addEventListener("click", closeAboutSheet);
viewSwitchButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (viewSwitchMenu?.hasAttribute("hidden")) openViewSwitchMenu();
  else closeViewSwitchMenu();
});
viewSwitchMenu?.querySelectorAll?.("[data-view-mode]")?.forEach((button) => {
  button.addEventListener("click", () => setViewMode(button.dataset.viewMode));
});
document.addEventListener("click", (event) => {
  if (!viewSwitchMenu || viewSwitchMenu.hasAttribute("hidden")) return;
  if (viewSwitchButton?.contains?.(event.target) || viewSwitchMenu.contains?.(event.target)) return;
  closeViewSwitchMenu();
});
gridNeighborhoodFilter?.addEventListener("change", () => applyAzulejoFilters({ fitNeighborhood: true }));
[gridColorFilter, gridTypeFilter, gridMotifFilter].forEach((filter) => {
  filter?.addEventListener("change", () => applyAzulejoFilters());
});
accountOpenButton?.addEventListener("click", openAccountSheet);
accountCloseButton?.addEventListener("click", closeAccountSheet);
accountLoginMode?.addEventListener("click", () => setAccountMode("log-in"));
accountSignupMode?.addEventListener("click", () => setAccountMode("sign-up"));
document.querySelectorAll("[data-account-mode]").forEach((button) => {
  button.addEventListener("click", () => setAccountMode(button.dataset.accountMode || "log-in"));
});
accountForgotButton?.addEventListener("click", () => {
  if (accountResetEmail && accountLoginEmail) accountResetEmail.value = accountLoginEmail.value;
  setAccountMode("reset");
});
accountLoginForm?.addEventListener("submit", (event) => submitContributorAccount(event, "sign-in"));
accountSignupForm?.addEventListener("submit", (event) => submitContributorAccount(event, "sign-up"));
accountResetForm?.addEventListener("submit", (event) => submitContributorAccount(event, "reset-password"));
accountUpdatePasswordForm?.addEventListener("submit", (event) => submitContributorAccount(event, "update-password"));
accountProfileForm?.addEventListener("submit", updateContributorProfile);
accountLogoutButton?.addEventListener("click", logoutContributorAccount);
contributionsGridView?.addEventListener?.("click", () => setContributionView("grid"));
contributionsListView?.addEventListener?.("click", () => setContributionView("list"));
mapLocationButton?.addEventListener("click", locateUserOnMap);
azulejoViewerMapLink?.addEventListener("click", showActiveViewerTileOnMap);
azulejoViewerClose?.addEventListener("click", () => closeAzulejoViewer());
azulejoViewerImage?.addEventListener("load", () => {
  azulejoViewerImage.classList.remove("is-image-unavailable");
});
azulejoViewerImage?.addEventListener("error", () => {
  azulejoViewerImage.classList.add("is-image-unavailable");
  azulejoViewerImage.removeAttribute("src");
});
azulejoViewer?.addEventListener("pointerdown", startViewerGesture);
azulejoViewer?.addEventListener("pointerup", finishViewerGesture);
azulejoViewer?.addEventListener("pointercancel", () => {
  viewerGesture = null;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeViewSwitchMenu();
    closeAzulejoViewer();
    closeAboutSheet();
    closeAccountSheet();
    closeLocationPermissionSheet();
    return;
  }
  if (!azulejoViewer?.classList.contains("is-open")) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    stepAzulejoViewer(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    stepAzulejoViewer(1);
  }
});
cellSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const cell = searchCell(cellSearchInput.value);
  if (!cell) {
    cellSearchStatus.textContent = "cellule introuvable dans la zone actuelle. essaie un code lis.x.y exact.";
    return;
  }
  highlightCell(cell);
});

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.panel) {
      switchPanel(button.dataset.panel);
    }
    if (button.dataset.action === "focus-search") {
      switchPanel("atlas");
      cellSearchInput.focus();
    }
  });
});

gridToggle.addEventListener("change", drawGrid);
gridDensity.addEventListener("input", () => {
  invalidateServerViewportCounts();
  drawGrid();
  refreshTileVisibility();
  scheduleRecordedAzulejoLoad();
});
mosaicToggle.addEventListener("change", setMosaicVisibility);
sampleToggle.addEventListener("change", setSampleVisibility);
mosaicOpacity.addEventListener("input", setMosaicOpacity);

map.on("move zoom resize", drawGrid);
map.on("moveend", () => {
  invalidateServerViewportCounts();
  updateTargetCoordinates();
  updateMapAzulejoCount();
  scheduleRecordedAzulejoLoad();
});
map.on("zoomend", () => {
  invalidateServerViewportCounts();
  updateZoomPercent();
  updateTargetCoordinates();
  refreshTileVisibility();
  renderHighlightedSelection({ fit: false });
});
map.on("mousemove", (event) => {
  const { lat, lng } = event.latlng;
  const cell = cellForLatLng(lat, lng);
  cursorReadout.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)} · ${cell.code}`;
});
map.on("click", (event) => {
  latInput.value = event.latlng.lat.toFixed(6);
  lngInput.value = event.latlng.lng.toFixed(6);
  highlightCell(cellForLatLng(event.latlng.lat, event.latlng.lng), { fit: false, latlng: event.latlng });
});

const neighborhoodLayerReady = loadNeighborhoodLayer();
const hashCell = cellFromHash(window.location.hash);
if (!hashCell) {
  map.setView(HOME_VIEW.center, HOME_VIEW.zoom, { animate: false });
}
sampleTiles.forEach((tile) => addAzulejoTile(tile, { skipRecord: true }));
neighborhoodLayerReady.finally(() => {
  loadRecordedAzulejos();
  loadGridAzulejos();
});
window.addEventListener?.("online", () => {
  flushOfflineContributions().catch((error) => console.error("Offline contribution sync failed:", error));
});
flushOfflineContributions().catch((error) => console.error("Offline contribution sync failed:", error));
if (typeof fetch === "function") {
  refreshContributorAccount().catch(() => applyContributorAccount(null));
}
openRecoveryAccountFlow();
if ("serviceWorker" in navigator) {
  window.addEventListener?.("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
restoreMosaicState();
restoreContributionView();
const initialCell = cellForLatLng(HOME_VIEW.center[0], HOME_VIEW.center[1]);
cursorReadout.textContent = `Lisboa · grille 3 m · ${initialCell.code}`;
updateZoomPercent();
updateTargetCoordinates();
if (hashCell) {
  highlightCell(hashCell, { hash: false });
}
window.AzulejoAtlas = {
  homeView: { center: [...HOME_VIEW.center], zoom: HOME_VIEW.zoom },
  cellForLatLng,
  cellFromHash,
  cellHash,
  boundsArrayForTiles,
  clearImportedMosaic,
  computeBatchReport,
  detectCsvDelimiter,
  detectSquareCrop,
  encodeCanvasForMobileUpload,
  fitTilesOnMap,
  flushOfflineContributions,
  gpsDistanceMeters,
  readGpsFromExif,
  readCurrentBrowserPosition,
  readReliableBrowserPosition,
  requestLocationPermission,
  requestLocationPermissionForContext,
  archiveFilteredTiles,
  activeCellText,
  allocateFineGridDisplayCells,
  fragmentToGeoJsonFeature,
  fragmentToPointGeoJsonFeature,
  fragmentsToCsv,
  escapeCsvValue,
  edgeMatchedMosaicRotations,
  formatZoomPercent,
  gridStepForZoom,
  isInsideLisbonBounds,
  isReliableGpsFix,
  isUsableUploadGpsFix,
  isUsableUploadGpsFixForContext,
  installOverlayImageRecovery,
  isImageUrlLoaded,
  lqipPixelCounts,
  rememberLoadedImageUrl,
  thumbnailImageUrl,
  viewportRenderBudget,
  copyTextToClipboard,
  formatTargetCoordinates,
  looksLikeSwappedLisbonCoordinates,
  normalizedCellFromCell,
  normalizeServerSceneCounts,
  normalizedCropPoints,
  setActiveCell,
  loadDemoArchive,
  loadSavedFragments,
  locateUserOnMap,
  locationPermissionCopy,
  parseCsv,
  parseGeoJson,
  parseArchiveExport,
  parseCellCode,
  rowToTile,
  sceneAzulejoCounts,
  selectionCellForTile,
  displayCellForTile,
  searchCell,
  boundsForSnappedGridSquare,
  tileVisibleAtZoom,
  tileMatchesArchiveQuery,
  tileInsideMapScene,
  tilesInMapScene,
  viewerMosaicCells,
  viewerMosaicRotation,
  shouldReopenAccountAfterViewerClose,
  shouldRestoreViewerMapSelection,
  viewerTileFromContribution,
  visibleTiles,
  getState: () => ({
    markerIndex,
    placedTiles,
    uploadedImageCount: uploadedImages.size,
    importedGeoRows,
    lastGeoReport,
    highlightedSelection,
    latestUserLocation,
    userLocationWatchId,
    activeServerTileCount: serverTilesById.size,
    cachedServerTileCount: serverTileCacheById.size,
    loadedImageUrlCount: loadedImageUrls.size,
  }),
};
drawGrid();
