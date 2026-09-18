import { expect, test } from '@playwright/test'

/**
 * Smoke de la raiz: la ruta `(public)/` responde y renderiza la pagina publica
 * minima neutra (decision M3: ni provisional ni redirect). El chequeo de
 * `font-weight` prueba que Tailwind v4 compilo de verdad: si el PostCSS no
 * hubiera corrido, el `<h1>` rendiria con el peso por defecto del navegador en
 * vez de `font-semibold` (600).
 */
test('la ruta raiz renderiza la pagina publica con estilos Tailwind compilados', async ({
  page,
}) => {
  await page.goto('/')

  const heading = page.getByRole('heading', { name: /Inventarte/ })
  await expect(heading).toBeVisible()
  await expect(heading).toHaveCSS('font-weight', '600')
})