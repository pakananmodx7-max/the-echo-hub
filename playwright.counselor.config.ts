import { defineConfig, devices } from '@playwright/test'

// Standalone config for the ECHO Counselor verification spec only, mirroring
// playwright.garden.config.ts exactly (see its own comments for the rationale) — the dev
// server and Firebase Auth+Firestore emulators must already be running, and the admin
// account's custom claim must already be set via `npm run setup:admin` (pointed at the
// emulator via FIREBASE_AUTH_EMULATOR_HOST) before this spec runs.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['counselor-admin.spec.ts'],
  timeout: 180_000,
  expect: { timeout: 10_000 },
  retries: 1,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.COUNSELOR_TEST_BASE_URL ?? 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1400, height: 900 },
    launchOptions: process.env.GARDEN_TEST_CHROMIUM_PATH
      ? { executablePath: process.env.GARDEN_TEST_CHROMIUM_PATH }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
