import { defineConfig, devices } from "@playwright/test";

const androidProjects = [
  ["android-pixel-8", "Pixel 8"],
  ["android-galaxy-s24", "Galaxy S24"],
  ["android-tablet", "Galaxy Tab S9"],
];

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
    geolocation: { latitude: 38.719152, longitude: -9.134188, accuracy: 8 },
    permissions: ["camera", "geolocation"],
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  projects: androidProjects.map(([name, device]) => ({
    name,
    use: { ...devices[device] },
  })),
  webServer: {
    command: "python3 -m http.server 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
