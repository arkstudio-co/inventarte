// playwright.config.ts — E2E (TS5/T18): baseURL local, `webServer` con `pnpm dev` y
// `reuseExistingServer: true`. El proyecto `chromium` (default) IGNORA el spec del
// login con `testIgnore`: `e2e/login.spec.ts` (T18) esta escrito pero BLOQUEADO por
// entorno (requiere `.env` + base + fixtures del Bloque D/T17) y no debe correr en el
// run por defecto. Se activa solo con `LOGIN_E2E=1`: el proyecto `login-e2e` se monta
// entonces y matchea ese spec. `pnpm exec playwright test` sin env corre solo smoke.
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
      testIgnore: /login\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...(process.env.LOGIN_E2E === '1'
      ? [
          {
            name: 'login-e2e',
            testMatch: /login\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
          },
        ]
      : []),
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})