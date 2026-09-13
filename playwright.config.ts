import { defineConfig } from "@playwright/test";

// One thin boot-check, not a functional suite -- see e2e/home.spec.ts.
// Not run in CI (see ARCHITECTURE.md / .github/workflows/web.yml): run
// locally via `npm run test:e2e` before a deploy or after a risky change.
export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
