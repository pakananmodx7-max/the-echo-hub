import { defineConfig } from 'vitest/config'

// Vitest looks for this file before falling back to vite.config.ts. Kept as its own file
// (rather than a `test` key inside vite.config.ts) because vitest bundles a different nested
// `vite` copy than this project's direct dependency — merging plugins from both into one
// config object trips a Plugin<any> type mismatch under `tsc -b`. None of the current test
// files (messageSafety.test.ts, gardenLayout.test.ts) need the app's react()/tailwindcss()
// plugins, so this stays plugin-free.
export default defineConfig({
  test: {
    // tests/ holds standalone verification scripts with their own runners (Playwright,
    // plain node) — not vitest suites, so vitest's default glob must skip them.
    exclude: ['**/node_modules/**', 'tests/**'],
  },
})
