import { defineConfig, devices } from "@playwright/test";

/**
 * Port for the dev server Playwright drives. Deliberately not 3000, so a dev
 * server the developer already has running there is never collided with (or
 * silently tested against). Single source of truth for `webServer` + `baseURL`.
 */
const PORT = 3100;
// `localhost` (not 127.0.0.1) because Next's dev server treats it as a trusted
// origin by default; hitting it by IP trips its cross-origin dev-resource guard.
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  // Integration/e2e tests live in `e2e/` (see CLAUDE.md). Vitest excludes this
  // directory, so a spec is only ever run by one of the two runners.
  testDir: "./e2e",
  fullyParallel: true,
  // Fail the CI build if a `test.only` was committed by accident.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One worker on CI (shared runners are slow and flaky under parallelism);
  // Playwright's default heuristic locally.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Start the app ourselves so `pnpm test:e2e` works from a cold start with no
  // manually started dev server. Locally an already-running server on this port
  // is reused; on CI we always want a fresh one.
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
