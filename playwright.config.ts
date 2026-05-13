import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config.
 *
 * Targets the deployed Vercel URL by default. Override with PLAYWRIGHT_BASE_URL
 * to point at a local dev server (e.g. `http://localhost:3000`) for local runs.
 */
const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  "https://ttb-label-verifier-a9t0bphlx-skyler8icloudcoms-projects.vercel.app";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
