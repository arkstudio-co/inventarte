// vitest.config.ts — config del runner de tests del repo.
// environment node: los tests de este repo no corren en navegador (los E2E son Playwright,
// TS5, y se configuran aparte). Include de tests/: unit, integration y guards viven ahi.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})