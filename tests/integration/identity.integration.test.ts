/**
 * TI3 — Integration de identidad (R25-R30; tasks.md Bloque 0).
 *
 * Base REAL de la feature: conecta por DATABASE_URL (pooler 6543) tal cual la consume la
 * app en runtime (verificado empiricamente: pg y PrismaPg aceptan la URL sin parametros;
 * DIRECT_URL 5432 queda fuera de alcance, IPv6-only). Fixtures auto-creados y limpiados
 * por el propio test (R23): una empresa y los usuarios que cada caso necesita, con el
 * `role_id` resuelto desde el catalogo de TI2 (nunca se siembran roles de nuevo).
 *
 * Cobertura (mapa de tasks.md):
 *   R25 -> FKs restrictivas + baja = UPDATE de deleted_at, nunca DELETE
 *   R26 -> catalogo de TI2 = exactamente dos roles; rechazo de otros nombres y duplicados
 *   R27 -> indice global: mismo username en dos empresas y duplicado directo rechazados;
 *          reuso tras borrado logico
 *   R28 -> CHECK del estado: grafias fuera de active|pending|inactive|blocked rechazadas
 *   R30 -> password_hash NOT NULL; cuenta pending con hash valido se verifica al coste
 *          completo (hasher real de T8, contado) y fracasa con el desenlace uniforme de R2
 *   RLS  -> ENABLE + FORCE + policy app_owner_full_access en companies, roles y users
 *
 * Convenciones: los casos se nombran por comportamiento; las violaciones de constraint se
 * asertan por codigo de error de Postgres (23505 unique, 23514 check, 23502 not-null,
 * 23503 foreign key); no se importa node:crypto (global crypto.randomUUID()).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../lib/generated/prisma/client'
import { PasswordHasher } from '../../lib/services/login/password-hasher'
import { UserCredentialsRepo } from '../../lib/repositories/user-credentials-repo'
import { LoginAttemptRepo } from '../../lib/repositories/login-attempt-repo'
import { crearSessionIdFactory } from '../../lib/services/login/session-id-factory'
import {
  REJECTED,
  verifyCredentials,
} from '../../lib/services/login/verify-credentials-service'
import type { VerifyCredentialsContext } from '../../lib/services/login/verify-credentials-service'
import type { IPasswordHasher } from '../../lib/interfaces/services/i-password-hasher'
import type { ISessionStarter, SessionTicket } from '../../lib/interfaces/services/i-session-starter'

// El pooler 6543 es el mismo que la app consume en runtime: se usa tal cual.
process.loadEnvFile('.env')
const DATABASE_URL = process.env.DATABASE_URL ?? ''
if (DATABASE_URL === '') {
  throw new Error('Falta DATABASE_URL: el test necesita la .env de la feature')
}

const pool = new Pool({ connectionString: DATABASE_URL })
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })

// Rastro de fixtures creados para limpiarlos TODOS al final (R23: 0 filas restantes).
const empresasCreadas: string[] = []
const usuariosCreados: string[] = []

const CLAVE = 'secreta-2026'

/** Ejecuta una sentencia y devuelve el error de Postgres, o falla si NO lanzo. */
async function errorDe(p: Promise<unknown>): Promise<{ code: string; detalle: string }> {
  try {
    await p
  } catch (e) {
    return {
      code: (e as { code?: string }).code ?? 'sin-codigo',
      detalle: String(e).split('\n')[0],
    }
  }
  throw new Error('la operacion no lanzo: se esperaba una violacion de constraint')
}

async function crearEmpresa(): Promise<string> {
  const r = await pool.query('INSERT INTO companies (id) VALUES ($1) RETURNING id', [
    crypto.randomUUID(),
  ])
  empresasCreadas.push(r.rows[0].id as string)
  return r.rows[0].id as string
}

async function idRolAdmin(): Promise<string> {
  // Catalogo de TI2: los roles ya estan en la base, no se siembran (R23).
  const r = await pool.query('SELECT id FROM roles WHERE name = $1', ['admin'])
  if (r.rows[0] === undefined) {
    throw new Error('el rol admin no existe: TI2 (seed_roles) debe estar aplicada')
  }
  return r.rows[0].id as string
}

async function insertarUsuario(fila: {
  companyId: string
  roleId: string
  username: string
  passwordHash: string
  accountStatus: string
}): Promise<string> {
  const r = await pool.query(
    `INSERT INTO users
       (id, company_id, role_id, username, password_hash, account_status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [crypto.randomUUID(), fila.companyId, fila.roleId, fila.username, fila.passwordHash, fila.accountStatus],
  )
  usuariosCreados.push(r.rows[0].id as string)
  return r.rows[0].id as string
}

/** Caso de uso compuesto con adaptadores REALES (repos + hasher de T8), sesion noop. */
function crearContextoConHasherContado(): {
  ctx: VerifyCredentialsContext
  hasher: IPasswordHasher
  sesiones: SessionTicket[]
  verificaciones: () => number
} {
  const sesiones: SessionTicket[] = []
  const real = new PasswordHasher()
  let conteo = 0
  const hasher: IPasswordHasher = {
    hash: (texto) => real.hash(texto),
    // Envuelve al hasher real de T8: coste completo REAL, con contador visible.
    verify: async (texto, hashGuardado) => {
      conteo++
      return real.verify(texto, hashGuardado)
    },
    getDecoyHash: () => real.getDecoyHash(),
  }
  const sessionStarter: ISessionStarter = {
    async startSession(ticket) {
      sesiones.push(ticket)
    },
  }
  return {
    ctx: {
      reader: new UserCredentialsRepo(db),
      hasher,
      recorder: new LoginAttemptRepo(db),
      sessionStarter,
      sessionIdFactory: crearSessionIdFactory(),
      clock: () => new Date(),
      lockPolicy: { maxFailedAttempts: 5, lockDurationsMinutes: [1, 5, 15, 60] },
    },
    hasher,
    sesiones,
    verificaciones: () => conteo,
  }
}

let rolAdmin: string
let empresaA: string

beforeAll(async () => {
  rolAdmin = await idRolAdmin()
  empresaA = await crearEmpresa()
})

afterAll(async () => {
  // Limpieza en orden de FK: rastro -> usuarios -> empresas.
  if (usuariosCreados.length > 0) {
    await pool.query('DELETE FROM login_attempts WHERE user_id = ANY($1::uuid[])', [usuariosCreados])
  }
  if (empresasCreadas.length > 0) {
    await pool.query('DELETE FROM users WHERE company_id = ANY($1::uuid[])', [empresasCreadas])
    await pool.query('DELETE FROM companies WHERE id = ANY($1::uuid[])', [empresasCreadas])
  }
  // R23: assert — no quedan filas de ningun fixture.
  const restantes = await pool.query<{ n: number }>(
    `SELECT
       (SELECT count(*) FROM users WHERE id = ANY($1::uuid[]) OR company_id = ANY($2::uuid[]))::int
       + (SELECT count(*) FROM companies WHERE id = ANY($2::uuid[]))::int AS n`,
    [usuariosCreados, empresasCreadas],
  )
  expect(restantes.rows[0].n).toBe(0)
  await pool.end()
  await db.$disconnect()
})

describe('identidad (TI3)', () => {
  it('R27: el indice global rechaza el mismo username en dos empresas y el duplicado directo', async () => {
    const empresaB = await crearEmpresa()
    const ana = `ana-${crypto.randomUUID()}`

    await insertarUsuario({
      companyId: empresaA,
      roleId: rolAdmin,
      username: ana,
      passwordHash: await new PasswordHasher().hash(CLAVE),
      accountStatus: 'active',
    })

    // Mismo username en OTRA empresa: el indice es global, no por empresa.
    const enOtraEmpresa = await errorDe(
      insertarUsuario({
        companyId: empresaB,
        roleId: rolAdmin,
        username: ana,
        passwordHash: 'h',
        accountStatus: 'active',
      }),
    )
    expect(enOtraEmpresa.code).toBe('23505')

    // Duplicado directo en la MISMA empresa.
    const duplicado = await errorDe(
      insertarUsuario({
        companyId: empresaA,
        roleId: rolAdmin,
        username: ana,
        passwordHash: 'h',
        accountStatus: 'active',
      }),
    )
    expect(duplicado.code).toBe('23505')
  })

  it('R27: tras el borrado logico, el mismo username se reusa', async () => {
    const empresaB = await crearEmpresa()
    const reuso = `reuso-${crypto.randomUUID()}`
    const idOriginal = await insertarUsuario({
      companyId: empresaA,
      roleId: rolAdmin,
      username: reuso,
      passwordHash: 'h',
      accountStatus: 'active',
    })

    // Baja = UPDATE de deleted_at (R25), que saca la fila del alcance del indice parcial.
    await pool.query('UPDATE users SET deleted_at = now() WHERE id = $1', [idOriginal])

    const idNuevo = await insertarUsuario({
      companyId: empresaB,
      roleId: rolAdmin,
      username: reuso,
      passwordHash: 'h',
      accountStatus: 'active',
    })
    expect(idNuevo).not.toBe(idOriginal)

    // Ambas filas siguen existiendo (nunca se borro nada); la fila vieja quedó eliminada
    // logicamente y la nueva vive con el mismo username.
    const filas = await pool.query<{ n: number; deleted: number }>(
      `SELECT count(*)::int AS n,
              count(*) FILTER (WHERE deleted_at IS NOT NULL)::int AS deleted
       FROM users WHERE username = $1`,
      [reuso],
    )
    expect(filas.rows[0]).toEqual({ n: 2, deleted: 1 })
  })

  it('R26: el catalogo tiene exactamente dos roles y rechaza otros nombres o duplicados', async () => {
    const catalogo = await pool.query<{ name: string }>(
      'SELECT name FROM roles ORDER BY name',
    )
    expect(catalogo.rows.map((f) => f.name)).toEqual(['admin', 'admin_maestro'])

    const otroNombre = await errorDe(
      pool.query('INSERT INTO roles (id, name) VALUES ($1, $2)', [
        crypto.randomUUID(),
        'superadmin',
      ]),
    )
    expect(otroNombre.code).toBe('23514')

    const duplicado = await errorDe(
      pool.query('INSERT INTO roles (id, name) VALUES ($1, $2)', [
        crypto.randomUUID(),
        'admin',
      ]),
    )
    expect(duplicado.code).toBe('23505')
  })

  it('R28: una grafia de estado fuera del conjunto cerrado no entra en users', async () => {
    const conGrafiaMala = await errorDe(
      insertarUsuario({
        companyId: empresaA,
        roleId: rolAdmin,
        username: `grafia-${crypto.randomUUID()}`,
        passwordHash: 'h',
        accountStatus: 'activee', // no existe en el CHECK de TI1
      }),
    )
    expect(conGrafiaMala.code).toBe('23514')

    // El CHECK es minusculas exactas: ni siquiera la mayuscula de un valor valido entra.
    const conMayuscula = await errorDe(
      insertarUsuario({
        companyId: empresaA,
        roleId: rolAdmin,
        username: `mayus-${crypto.randomUUID()}`,
        passwordHash: 'h',
        accountStatus: 'PENDING',
      }),
    )
    expect(conMayuscula.code).toBe('23514')
  })

  it('R30: password_hash es obligatorio y una cuenta pending con hash valido se verifica al coste completo y fracasa con el desenlace uniforme de R2', async () => {
    // R30 (esquema): sin hash no entra la fila.
    const sinHash = await errorDe(
      pool.query(
        `INSERT INTO users (id, company_id, role_id, username, account_status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [crypto.randomUUID(), empresaA, rolAdmin, `sinhash-${crypto.randomUUID()}`],
      ),
    )
    expect(sinHash.code).toBe('23502')

    // R30 (comportamiento): pending + hash valido -> verificacion al coste completo
    // (hasher real de T8, una sola llamada) y fracaso uniforme (R2), sin sesion.
    const h = crearContextoConHasherContado()
    const username = `pend-${crypto.randomUUID()}`
    await insertarUsuario({
      companyId: empresaA,
      roleId: rolAdmin,
      username,
      passwordHash: await h.hasher.hash(CLAVE),
      accountStatus: 'pending',
    })

    const resultado = await verifyCredentials(
      { username, password: CLAVE },
      h.ctx,
    )

    // R2: el MISMO objeto congelado de toda la app; R21: pending no entra con correcta.
    expect(resultado).toBe(REJECTED)
    // Invariante 2 / R30: exactamente una verificacion de hash, contra el hash REAL
    // (el pending paga el coste completo antes de cortar por estado).
    expect(h.verificaciones()).toBe(1)
    expect(h.sesiones).toHaveLength(0)

    // El rastro de la frontera refleja pending (R24): vinculos a la cuenta, sin secretos.
    const rastro = await pool.query(
      `SELECT outcome, user_id, company_id, annotation_failed
       FROM login_attempts WHERE username = $1 ORDER BY attempted_at DESC LIMIT 1`,
      [username],
    )
    expect(rastro.rows[0]).toMatchObject({
      outcome: 'account_not_active',
      annotation_failed: false,
    })
    expect(rastro.rows[0].user_id).not.toBeNull()
    expect(rastro.rows[0].company_id).not.toBeNull()
  })

  it('R25: las FKs restrictivas impiden borrar companies y roles referenciados', async () => {
    // Empresa con un usuario vivo: DELETE fisico no puede pasar (users.company_id RESTRICT).
    const empresaViva = await crearEmpresa()
    const usuarioVivo = await insertarUsuario({
      companyId: empresaViva,
      roleId: rolAdmin,
      username: `fk-${crypto.randomUUID()}`,
      passwordHash: 'h',
      accountStatus: 'active',
    })

    const borrarEmpresa = await errorDe(
      pool.query('DELETE FROM companies WHERE id = $1', [empresaViva]),
    )
    expect(borrarEmpresa.code).toBe('23503')

    const borrarRol = await errorDe(pool.query('DELETE FROM roles WHERE id = $1', [rolAdmin]))
    expect(borrarRol.code).toBe('23503')

    // La via legitima de baja es UPDATE de deleted_at (nunca DELETE); la fila persiste.
    await pool.query('UPDATE users SET deleted_at = now() WHERE id = $1', [usuarioVivo])
    const viva = await pool.query<{ n: number; deleted: boolean }>(
      `SELECT
         (SELECT count(*)::int FROM users WHERE id = $1) AS n,
         (SELECT (deleted_at IS NOT NULL) FROM users WHERE id = $1) AS deleted`,
      [usuarioVivo],
    )
    expect(viva.rows[0]).toEqual({ n: 1, deleted: true })
  })

  it('RLS: companies, roles y users tienen ENABLE + FORCE y la policy app_owner_full_access', async () => {
    // Flags por tabla (pg_class): relrowsecurity y relforcerowsecurity. Se filtra el
    // esquema public: Supabase trae su propia `auth.users`, que no es tabla de la app.
    const flags = await pool.query<{ relname: string; rls: boolean; force: boolean }>(
      `SELECT relname,
              relrowsecurity AS rls,
              relforcerowsecurity AS force
       FROM pg_class
       WHERE relname IN ('companies', 'roles', 'users')
         AND relnamespace = 'public'::regnamespace
       ORDER BY relname`,
    )
    expect(flags.rows.map((f) => f.relname)).toEqual(['companies', 'roles', 'users'])
    for (const fila of flags.rows) {
      expect(fila.rls).toBe(true)
      expect(fila.force).toBe(true)
    }

    // Policy del owner en cada tabla (alternativa 9): sin ella FORCE cerraria la tabla
    // incluso para Prisma. Mismo filtro de esquema que arriba (auth.users queda fuera).
    const policies = await pool.query<{ tablename: string; cmd: string }>(
      `SELECT tablename, cmd
       FROM pg_policies
       WHERE policyname = 'app_owner_full_access'
         AND tablename IN ('companies', 'roles', 'users')
         AND schemaname = 'public'
       ORDER BY tablename`,
    )
    expect(policies.rows.map((f) => f.tablename)).toEqual(['companies', 'roles', 'users'])
    for (const fila of policies.rows) {
      expect(fila.cmd).toBe('ALL')
    }
  })
})