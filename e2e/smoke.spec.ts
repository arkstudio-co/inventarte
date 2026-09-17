import { expect, test } from '@playwright/test'

/**
 * Smoke de la Tanda 1 (TS5): la raiz responde 200 y renderiza el andamiaje de
 * TS2. El chequeo de `font-weight` prueba que Tailwind v4 compilo de verdad:
 * si el PostCSS no hubiera corrido, el `<h1>` rendiria con el peso por defecto
 * del navegador en vez de `font-semibold` (600).
 */
test('la ruta raiz renderiza el andamiaje IA-1 con estilos Tailwind compilados', async ({
  page,
}) => {
  await page.goto('/')

  const heading = page.getByRole('heading', { name: /IA-1 WIP/ })
  await expect(heading).toBeVisible()
  await expect(heading).toHaveCSS('font-weight', '600')
})