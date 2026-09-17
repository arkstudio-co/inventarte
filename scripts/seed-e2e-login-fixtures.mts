/**
 * seed-e2e-login-fixtures — crea los fixtures que consume `e2e/login.spec.ts` (T18):
 * una cuenta ACTIVA y una cuenta PENDING en la base real de la feature, con
 * `password_hash` REAL del hasher de T8 (R29) y rol resuelto desde el catalogo de TI2.
 *
 * Uso:
 *   pnpm exec tsx scripts/seed-e2e-login-fixtures.mts
 *
 * Salida (una sola linea, parseable con `--% export` en pwsh o `eval` en sh):
 *   E2E_LOGIN_ADMIN_USERNAME=e2e_login_admin E2E_LOGIN_ADMIN_PASSWORD=... \
 *   E2E_LOGIN_PENDING_USERNAME=e2e_login_pending E2E_LOGIN_PENDING_PASSWORD=...
 *
 * Idempotente: los ids son deterministicos (constantes de este script) y el upsert
 * reutiliza las filas si ya existen. La limpieza inversa vive en
 * `scripts/cleanup-e2e-login-fixtures.mts` (mismo prefijo e2e_). No toca ninguna fila
 * que no lleve ese prefijo (R23: los fixtures no se siembran con la app).
 */
import { Pool } from 'pg'
import { PasswordHasher } from '../lib/services/login/password-hasher'

// Ids deterministicos: permiten el upsert en re-ejecuciones y que el cleanup sepa
// exactamente que borrar sin depender de nombres en tablas sin columna de nombre
// (companies solo tiene id y deleted_at).
const EMPRESA_ID = 'e2e00000-0000-4000-8000-000000000001'
const ADMIN_ID = 'e2e00000-0000-4000-8000-0000000000a1'
const PENDING_ID = 'e2e00000-0000-4000-8000-0000000000a2'

const ADMIN_USERNAME = 'e2e_login_admin'
const PENDING_USERNAME = 'e2e_login_pending'
// Fixtures de prueba: constantes aqui y en la linea de salida — el spec las lee del
// entorno, jamas de este archivo.
const ADMIN_PASSWORD = 'E2eLogin-Admin-2026'
const PENDING_PASSWORD = 'E2eLogin-Pending-2026'

function fail(mensaje: string): never {
  console.error(`seed-e2e-login-fixtures: ${mensaje}`)
  process.exit(1)
}

async function main(): Promise<void> {
  process.loadEnvFile('.env')
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    fail('falta DATABASE_URL: copia `.env.example` a `.env` antes de correr el fixture')
  }

  const pool = new Pool({ connectionString: databaseUrl })
  try {
    // El catalogo de TI2 ya esta en la base: nunca se siembran roles de nuevo (R23).
    const rol = await pool.query('SELECT id FROM roles WHERE name = $1', ['admin'])
    if (rol.rows[0] === undefined) {
      fail('el rol admin no existe: TI2 (seed_roles) debe estar aplicada antes del fixture')
    }
    const roleId = rol.rows[0].id as string

    // Barrido de re-ejecucion: borra rastro y usuarios huerfanos con estos usernames
    // (solo los que no sean los ids deterministicos — filas de una corrida a medias).
    await pool.query(
      'DELETE FROM login_attempts WHERE username = ANY($1)',
      [[ADMIN_USERNAME, PENDING_USERNAME]],
    )
    await pool.query(
      'DELETE FROM users WHERE username = ANY($1) AND id <> ALL($2::uuid[])',
      [[ADMIN_USERNAME, PENDING_USERNAME], [ADMIN_ID, PENDING_ID]],
    )

    const hasher = new PasswordHasher()
    const hashAdmin = await hasher.hash(ADMIN_PASSWORD)
    const hashPending = await hasher.hash(PENDING_PASSWORD)

    // Upsert idempotente de la empresa y los dos usuarios de prueba.
    await pool.query(
      'INSERT INTO companies (id, deleted_at) VALUES ($1, NULL) ON CONFLICT (id) DO UPDATE SET deleted_at = NULL',
      [EMPRESA_ID],
    )
    for (const [id, username, hash, status] of [
      [ADMIN_ID, ADMIN_USERNAME, hashAdmin, 'active'],
      [PENDING_ID, PENDING_USERNAME, hashPending, 'pending'],
    ] as const) {
      await pool.query(
        `INSERT INTO users
           (id, company_id, role_id, username, password_hash,
            failed_login_attempts, lock_level, locked_until, account_status, deleted_at)
         VALUES ($1, $2, $3, $4, $5, 0, 0, NULL, $6, NULL)
         ON CONFLICT (id) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           account_status = EXCLUDED.account_status,
           failed_login_attempts = 0,
           lock_level = 0,
           locked_until = NULL,
           deleted_at = NULL`,
        [id, EMPRESA_ID, roleId, username, hash, status],
      )
    }

    // Una sola linea, parseable por el arnes: el humano la exporta al entorno del E2E.
    console.log(
      [
        `E2E_LOGIN_ADMIN_USERNAME=${ADMIN_USERNAME}`,
        `E2E_LOGIN_ADMIN_PASSWORD=${ADMIN_PASSWORD}`,
        `E2E_LOGIN_PENDING_USERNAME=${PENDING_USERNAME}`,
        `E2E_LOGIN_PENDING_PASSWORD=${PENDING_PASSWORD}`,
      ].join(' '),
    )
  } finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  const detalle = error instanceof Error ? error.message : String(error)
  fail(`fallo inesperado: ${detalle}`)
})