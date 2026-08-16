import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.E2E_BASE_URL?.trim() || "https://yelena-booking.vercel.app";

/**
 * Smoke E2E against deployed (or local) app.
 * Auth journeys need E2E_*_PASSWORD secrets (no passwords in the repo).
 * Skip locally without network if E2E_SKIP=1.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /screenshots\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "screenshots",
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
