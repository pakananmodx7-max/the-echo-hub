import { defineConfig, devices } from '@playwright/test'

// Standalone config for the Garden V2 multiplayer verification spec only — kept separate
// from any future general Playwright suite so this task's scope stays self-contained.
// The dev server and Firebase emulators must already be running (see
// scripts/garden-v2-verify.ps1) — this config does not start either.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'garden-v2-multiplayer.spec.ts',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.GARDEN_TEST_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    viewport: { width: 1400, height: 900 },
    // Only set on machines with a pre-provisioned browser at a fixed, non-standard path
    // (this sandbox); a normal Windows checkout leaves this unset and uses the browser
    // `npx playwright install chromium` downloads normally.
    launchOptions: process.env.GARDEN_TEST_CHROMIUM_PATH
      ? { executablePath: process.env.GARDEN_TEST_CHROMIUM_PATH }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
