import { defineConfig, devices } from '@playwright/test'

// Standalone config for the Garden verification specs only — kept separate from any future
// general Playwright suite so this task's scope stays self-contained. The dev server and
// Firebase emulators must already be running (see scripts/garden-v2-verify.ps1 for the
// Garden V2 multiplayer spec; the ECHO ธรรมอุทยาน spec was run manually against a Linux
// emulator setup, see that task's final report) — this config does not start either.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['garden-v2-multiplayer.spec.ts', 'garden-dhamma-verify.spec.ts'],
  timeout: 180_000,
  // Playwright's own default expect() timeout is 5s, which is far tighter than every other
  // wait in this spec (15s-45s) - most assertions here override it explicitly, but this is
  // a safety net for any that don't (and were the tightest, most flake-prone window in the
  // whole suite before this hardening pass).
  expect: { timeout: 10_000 },
  // One retry tolerates a single genuine transient timing hiccup (a slower/cold-start
  // machine, first-run emulator/dev-server warmup) without changing what's asserted or
  // lowering the bar for a pass - a run that fails on both attempts is still a real failure.
  retries: 1,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.GARDEN_TEST_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
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
