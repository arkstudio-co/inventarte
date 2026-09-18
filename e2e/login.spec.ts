import { expect, test } from '@playwright/test'
import { LOGIN_COPY_CREDENTIALS_INVALID } from '../lib/types/login-copy'

/**
 * T18 — E2E del login (R2, R8, R12, R21).
 *
 * BLOQUEADO POR ENTORNO: este spec se ESCRIBE en la Tanda 2 (frontend) pero NO se
 * ejecuta. Requiere `.env` (DATABASE_URL/DIRECT_URL/SESSION_SECRET), las migraciones
 * TI1/TI2/T14 aplicadas y los fixtures del Bloque D (T17): una cuenta activa y una
 * cuenta `pending` con `password_hash` real del hasher de T8 (R30).
 *
 * Mecanica de activacion: el proyecto `login-e2e` del playwright.config.ts se monta
 * SOLO con `LOGIN_E2E=1`; por defecto este spec queda fuera de `pnpm exec playwright
 * test` (testIgnore en el proyecto chromium). Lo levanta el leader cuando exista
 * config y T17.
 *
 * Credenciales: se leen del entorno para no hardcodear datos de fixture en el spec —
 * `E2E_LOGIN_ADMIN_USERNAME` / `E2E_LOGIN_ADMIN_PASSWORD` (cuenta activa, T17) y
 * `E2E_LOGIN_PENDING_USERNAME` / `E2E_LOGIN_PENDING_PASSWORD` (cuenta `pending` del
 * Bloque D).
 */

function requerida(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) {
    throw new Error(`${nombre} sin definir (fixture del Bloque D, T17)`)
  }
  return valor
}

test('credenciales correctas redirigen al destino y la sesion no es visible a scripts', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(requerida('E2E_LOGIN_ADMIN_USERNAME'))
  await page.getByLabel('Contraseña').fill(requerida('E2E_LOGIN_ADMIN_PASSWORD'))
  await page.getByRole('button', { name: 'Entrar' }).click()

  // El exito navega al destino (default DASHBOARD_ROUTE, R1/R9).
  await expect(page).toHaveURL(/\/dashboard/)

  // R8: `qcl_session` es httpOnly — de no serlo, document.cookie la mostraria.
  // Esta es la unica forma honesta de afirmar R8 (tasks.md T18).
  await expect
    .poll(() => page.evaluate(() => document.cookie))
    .not.toContain('qcl_session')
})

test('credenciales incorrectas se quedan en /login sin cookie y con el mensaje congelado', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill('usuario-inexistente')
  await page.getByLabel('Contraseña').fill('clave-incorrecta')
  await page.getByRole('button', { name: 'Entrar' }).click()

  // R12: fallo = sin sesion; R2: el mensaje es la constante exportada (misma en
  // inexistente y contrasena mala — T15 via loginFormRejected).
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText(LOGIN_COPY_CREDENTIALS_INVALID)).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.cookie))
    .not.toContain('qcl_session')
})

test('una cuenta pendiente recibe el mismo mensaje congelado y ninguna sesion', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(requerida('E2E_LOGIN_PENDING_USERNAME'))
  await page.getByLabel('Contraseña').fill(requerida('E2E_LOGIN_PENDING_PASSWORD'))
  await page.getByRole('button', { name: 'Entrar' }).click()

  // R21: pendiente no entra ni con la contrasena correcta; desenlace uniforme R2.
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText(LOGIN_COPY_CREDENTIALS_INVALID)).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.cookie))
    .not.toContain('qcl_session')
})