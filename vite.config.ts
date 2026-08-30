import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
  },
  test: {
    // tests/ holds standalone verification scripts with their own runners (Playwright,
    // plain node) — not vitest suites, so vitest's default glob must skip them.
    exclude: ['**/node_modules/**', 'tests/**'],
  },
})
