import { defineConfig, devices } from "@playwright/test";

/*
 * Parcours testés sur ordinateur et sur mobile, en clair et en sombre.
 * Prérequis : base locale démarrée (`npx supabase start`) et `.env.local` rempli.
 * Le contenu de test est la matière d'exemple (tests/fixtures), ou le fichier indiqué par E2E_CONTENT.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  expect: { timeout: 10_000 },
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "ordinateur-clair", use: { ...devices["Desktop Chrome"], colorScheme: "light" } },
    { name: "ordinateur-sombre", use: { ...devices["Desktop Chrome"], colorScheme: "dark" } },
    { name: "mobile-clair", use: { ...devices["Pixel 7"], colorScheme: "light" } },
    { name: "mobile-sombre", use: { ...devices["Pixel 7"], colorScheme: "dark" } },
  ],
  webServer: {
    command: `npm run build && npx next start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { NEXT_PUBLIC_SITE_URL: baseURL, NEXT_TELEMETRY_DISABLED: "1" },
  },
});
