// playwright.config.ts — E2E (TS5): baseURL local, proyecto chromium y el dev
// server como webServer. El webServer levanta `pnpm dev` y, con
// reuseExistingServer: true, no duplica si algo ya esta escuchando en :3000.
// El scope de las pruebas es `e2e/` (testDir); por eso no hace falta campo
// `files` en package.json: Playwright resuelve los specs desde aqui.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})