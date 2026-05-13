import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config.
 *
 * Targets the deployed Vercel URL by default. Override with PLAYWRIGHT_BASE_URL
 * to point at a local dev server (e.g. `http://localhost:3000`) for local runs.
 */
// The clean production alias. CI deploys re-point this to each fresh
// deployment, so the local default keeps working without edits per run.
// Override with PLAYWRIGHT_BASE_URL for local dev or against a preview URL.
const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "https://ttb-label-verifier-three.vercel.app";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry is enough to soak up a cold-start blip against the freshly
  // deployed URL; two compounded with workers:1 used to balloon the smoke
  // run past 5 min on any flake.
  retries: process.env.CI ? 1 : 0,
  // Tests are stateless and hit a remote URL — parallelize them.
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
