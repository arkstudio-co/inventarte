/**
 * cleanup-e2e-login-fixtures — revierte `scripts/seed-e2e-login-fixtures.mts`: borra los
 * fixtures E2E del login (empresa, usuarios y su rastro) sin tocar NADA que no lleve el
 * prefijo/ids de este fixture (R23). El orden respeta las FKs: rastro -> usuarios ->
 * empresas.
 *
 * Uso:
 *   pnpm exec tsx scripts/cleanup-e2e-login-fixtures.mts
 */
import { Pool } from 'pg'

const EMPRESA_ID = 'e2e00000-0000-4000-8000-000000000001'
const ADMIN_ID = 'e2e00000-0000-4000-8000-0000000000a1'
const PENDING_ID = 'e2e00000-0000-4000-8000-0000000000a2'
const USERNAMES = ['e2e_login_admin', 'e2e_login_pending'] as const

function fail(mensaje: string): never {
  console.error(`cleanup-e2e-login-fixtures: ${mensaje}`)
  process.exit(1)
}

async function main(): Promise<void> {
  process.loadEnvFile('.env')
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    fail('falta DATABASE_URL: copia `.env.example` a `.env` antes de correr el cleanup')
  }

  const pool = new Pool({ connectionString: databaseUrl })
  try {
    // Rastro primero: el inexistente solo deja rastro y los intentos pueden referenciar
    // a los usuarios (FK SET NULL, pero limpiar primero deja todo consistente).
    await pool.query('DELETE FROM login_attempts WHERE username = ANY($1)', [USERNAMES])
    // Usuarios por username (cubre filas con ids distintos a los deterministicos de una
    // corrida a medias) y por ids deterministicos.
    await pool.query(
      'DELETE FROM users WHERE username = ANY($1) OR id = ANY($2::uuid[])',
      [USERNAMES, [ADMIN_ID, PENDING_ID]],
    )
    await pool.query('DELETE FROM companies WHERE id = $1', [EMPRESA_ID])
    console.log('fixtures E2E de login eliminados.')
  } finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  const detalle = error instanceof Error ? error.message : String(error)
  fail(`fallo inesperado: ${detalle}`)
})