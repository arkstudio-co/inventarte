/**
 * T17 — Integration del login contra base REAL (R1, R4, R15-R21, R23, R24;
 * tasks.md Bloque D).
 *
 * Base real de la feature, conectada por DATABASE_URL (pooler 6543) tal cual la consume
 * la app (verificado empiricamente: pg y PrismaPg aceptan la URL sin parametros).
 * Fixtures creados y limpiados por el propio test (R23): una empresa y los usuarios que
 * cada caso necesita, con el `role_id` resuelto desde el catalogo de TI2 (los dos roles
 * ya estan en la base; no se siembran de nuevo) y `password_hash` real del hasher de T8
 * (R29). Concurrencia DE VERDAD: los casos paralelos disparan llamadas simultaneas y los
 * writers del caso de CAS agotado compiten en conexiones separadas.
 *
 * Cobertura:
 *   R1/R3  -> lector: fila unica o ninguna, sin desambiguar (decision 6)
 *   R7     -> inexistente: sin escrituras de cuenta, solo su fila de rastro
 *   R15    -> cinco fallos en paralelo bloquean la cuenta
 *   R17    -> fallos en paralelo sobre cuenta bloqueada NO la desbloquean
 *   R18    -> el CAS no aplica si el estado cambio entre lectura y escritura (ABA)
 *   R19    -> bloqueo caducado + contrasena correcta -> exito
 *   R20    -> el exito resetea contador, nivel y plazo
 *   R21    -> pendiente/inactiva no entran ni con la contrasena correcta
 *   R24    -> fila de rastro por desenlace (incluido inexistente, user_id NULL, username
 *             guardado); annotation_failed true cuando el CAS se agota; las columnas
 *             nunca contienen contrasena/hash/valor de sesion (R13)
 *
 * Nota de desviacion (R24): el servicio de T4 escribe `bad_credentials` para el usuario
 * inexistente (verify-credentials-service.ts, camino del señuelo) — `unknown_user` solo
 * existe en el CHECK del rastro (T14) y ningun camino lo emite en esta tanda. El test
 * aserta el comportamiento REAL del servicio.
 *
 * Convenciones: los casos se nombran por comportamiento; los plazos se comparan como
 * `locked_until::text` (el Date de JS pierde microsegundos); no se importa node:crypto.
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
import type { ISessionStarter, SessionTicket } from '../../lib/interfaces/services/i-session-starter'
import type { ILoginAttemptRecorder } from '../../lib/interfaces/repositories/i-login-attempt-recorder'
import type { IUserCredentialsReader } from '../../lib/interfaces/repositories/i-user-credentials-reader'

process.loadEnvFile('.env')
const DATABASE_URL = process.env.DATABASE_URL ?? ''
if (DATABASE_URL === '') {
  throw new Error('Falta DATABASE_URL: el test necesita la .env de la feature')
}

const pool = new Pool({ connectionString: DATABASE_URL })
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })

const CLAVE = 'secreta-2026'
const sufijo = crypto.randomUUID()

// Registro de TODAS las filas que este archivo crea (fixtures y casos): la limpieza y el
// assert final se apoyan en estos dos arreglos, no en un memento parcial.
const idsUsuarios: string[] = []
const usernames: string[] = []
const empresaId = crypto.randomUUID()

// Registro nombreCorto -> id real del fixture, poblado en beforeAll (y en casos puntuales).
const idsAsociados = new Map<string, string>()

function usuariosId(nombre: string): string {
  const id = idsAsociados.get(nombre)
  if (id === undefined) {
    throw new Error(`fixture ${nombre} sin registrar — beforeAll debe crearlo`)
  }
  return id
}

function usernameDe(nombre: string): string {
  return `${nombre}-${sufijo}`
}

interface EstadoUsuario {
  failed: number
  nivel: number
  lu: string | null
  status: string
}

async function idRolAdmin(): Promise<string> {
  // Catalogo de TI2: los roles ya estan en la base, no se siembran (R23).
  const r = await pool.query('SELECT id FROM roles WHERE name = $1', ['admin'])
  if (r.rows[0] === undefined) {
    throw new Error('el rol admin no existe: TI2 (seed_roles) debe estar aplicada')
  }
  return r.rows[0].id as string
}

async function crearUsuario(rolAdmin: string, nombreCorto: string, accountStatus: string): Promise<string> {
  const username = `${nombreCorto}-${sufijo}`
  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO users
       (id, company_id, role_id, username, password_hash, account_status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, empresaId, rolAdmin, username, await new PasswordHasher().hash(CLAVE), accountStatus],
  )
  idsUsuarios.push(id)
  usernames.push(username)
  idsAsociados.set(nombreCorto, id)
  return id
}

async function estadoDeUsuario(id: string): Promise<EstadoUsuario> {
  const r = await pool.query<EstadoUsuario>(
    `SELECT failed_login_attempts::int AS failed,
            lock_level::int AS nivel,
            locked_until::text AS lu,
            account_status AS status
     FROM users WHERE id = $1`,
    [id],
  )
  if (r.rows[0] === undefined) {
    throw new Error(`el usuario ${id} no existe — estado de fixture roto`)
  }
  return r.rows[0]
}

/**
 * Pone un escenario arbitrario sobre una cuenta. `lu` es un timestamp ISO RESUELTO
 * (nunca una expresion SQL): el parametro se castea `$n::timestamptz` en la query.
 */
async function fijarEstado(
  id: string,
  estado: { failed?: number; nivel?: number; lu?: string | null; status?: string },
): Promise<void> {
  await pool.query(
    `UPDATE users SET
       failed_login_attempts = $2,
       lock_level = $3,
       locked_until = $4::timestamptz,
       account_status = $5
     WHERE id = $1`,
    [id, estado.failed ?? 0, estado.nivel ?? 0, estado.lu ?? null, estado.status ?? 'active'],
  )
}

const dentroDeMinutos = (min: number): string =>
  new Date(Date.now() + min * 60_000).toISOString()

/** Caso de uso con adaptadores REALES (repos + hasher + fabrica de sid) y sesion noop. */
function crearContexto(): {
  ctx: VerifyCredentialsContext
  reader: IUserCredentialsReader
  recorder: ILoginAttemptRecorder
  sesiones: SessionTicket[]
} {
  const reader = new UserCredentialsRepo(db)
  const recorder = new LoginAttemptRepo(db)
  const sesiones: SessionTicket[] = []
  const sessionStarter: ISessionStarter = {
    async startSession(ticket) {
      sesiones.push(ticket)
    },
  }
  return {
    ctx: {
      reader,
      hasher: new PasswordHasher(),
      recorder,
      sessionStarter,
      sessionIdFactory: crearSessionIdFactory(),
      clock: () => new Date(),
      lockPolicy: { maxFailedAttempts: 5, lockDurationsMinutes: [1, 5, 15, 60] },
    },
    reader,
    recorder,
    sesiones,
  }
}

let rolAdmin: string

beforeAll(async () => {
  rolAdmin = await idRolAdmin()
  await pool.query('INSERT INTO companies (id) VALUES ($1)', [empresaId])
  await crearUsuario(rolAdmin, 'bloqueo', 'active')
  await crearUsuario(rolAdmin, 'bloqueada', 'active')
  await crearUsuario(rolAdmin, 'aba', 'active')
  await crearUsuario(rolAdmin, 'aba2', 'active')
  await crearUsuario(rolAdmin, 'pend', 'pending')
  await crearUsuario(rolAdmin, 'inact', 'inactive')
  await crearUsuario(rolAdmin, 'exito', 'active')
  await crearUsuario(rolAdmin, 'cas', 'active')
})

afterAll(async () => {
  // Limpieza en orden de FK: rastro (por user_id y por username — el inexistente solo
  // deja rastro) -> usuarios -> empresa.
  await pool.query(
    'DELETE FROM login_attempts WHERE user_id = ANY($1::uuid[]) OR username = ANY($2)',
    [idsUsuarios, usernames],
  )
  await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [idsUsuarios])
  await pool.query('DELETE FROM companies WHERE id = $1', [empresaId])

  // R23: assert — no quedan filas de ningun fixture (ni rastro huerfano por username).
  const restantes = await pool.query<{ n: number }>(
    `SELECT
       (SELECT count(*) FROM users WHERE id = ANY($1::uuid[]))::int
       + (SELECT count(*) FROM companies WHERE id = $2)::int
       + (SELECT count(*) FROM login_attempts
          WHERE user_id = ANY($1::uuid[]) OR username = ANY($3))::int
       AS n`,
    [idsUsuarios, empresaId, usernames],
  )
  expect(restantes.rows[0].n).toBe(0)
  await pool.end()
  await db.$disconnect()
})

describe('login integracion (T17)', () => {
  it('R15: cinco fallos en paralelo bloquean la cuenta y no emiten sesion', async () => {
    const h = crearContexto()
    const id = usuariosId('bloqueo')
    const username = usernameDe('bloqueo')

    const resultados = await Promise.all(
      Array.from({ length: 5 }, () =>
        verifyCredentials({ username, password: 'clave-incorrecta' }, h.ctx),
      ),
    )
    for (const r of resultados) {
      expect(r).toBe(REJECTED)
    }

    // El quinto fallo bloquea y REINICIA el contador; nivel 1; plazo ~1 min en futuro.
    const estado = await estadoDeUsuario(id)
    expect(estado.status).toBe('blocked')
    expect(estado.failed).toBe(0)
    expect(estado.nivel).toBe(1)
    expect(estado.lu).not.toBeNull()
    expect(new Date(estado.lu!).getTime()).toBeGreaterThan(Date.now())

    // Rastro de los 5 desenlaces resueltos, todos con vinculos a la cuenta (R24).
    const rastro = await pool.query<{ outcome: string }>(
      `SELECT outcome FROM login_attempts
       WHERE username = $1 ORDER BY attempted_at`,
      [username],
    )
    expect(rastro.rows).toHaveLength(5)
    for (const fila of rastro.rows) {
      expect(fila.outcome).toBe('bad_credentials')
    }
    expect(h.sesiones).toHaveLength(0)
  })

  it('R17: fallos en paralelo sobre una cuenta YA bloqueada no la desbloquean ni la mutan', async () => {
    const h = crearContexto()
    const id = usuariosId('bloqueada')
    const username = usernameDe('bloqueada')
    await fijarEstado(id, { status: 'blocked', failed: 3, nivel: 2, lu: dentroDeMinutos(10) })
    const antes = await estadoDeUsuario(id)

    const resultados = await Promise.all(
      Array.from({ length: 5 }, () =>
        verifyCredentials({ username, password: 'clave-incorrecta' }, h.ctx),
      ),
    )
    for (const r of resultados) {
      expect(r).toBe(REJECTED)
    }

    // Estado INTACTO: ni contador, ni nivel, ni plazo, ni status (R17/R18).
    const despues = await estadoDeUsuario(id)
    expect(despues).toEqual(antes)

    // Cada fallo sobre la bloqueada deja su fila account_blocked (frontera 5.3).
    const rastro = await pool.query<{ outcome: string }>(
      `SELECT outcome FROM login_attempts WHERE username = $1 ORDER BY attempted_at`,
      [username],
    )
    expect(rastro.rows).toHaveLength(5)
    for (const fila of rastro.rows) {
      expect(fila.outcome).toBe('account_blocked')
    }
    expect(h.sesiones).toHaveLength(0)
  })

  it('R18: el CAS ABA no puede borrar un bloqueo vigente con un estado obsoleto', async () => {
    const h = crearContexto()
    const id = usuariosId('aba')
    const username = usernameDe('aba')

    // Lee el estado HOY (obsoleto al cabo de un momento): activa, contador 0.
    const obsoleto = await h.reader.findActiveByUsername(username)
    expect(obsoleto).not.toBeNull()
    expect(obsoleto?.accountStatus).toBe('active')
    expect(obsoleto?.failedLoginAttempts).toBe(0)

    // Otro escritor bloquea la cuenta EN VIGOR entre la lectura y la escritura.
    await pool.query(
      `UPDATE users SET account_status = 'blocked', locked_until = now() + interval '10 minutes',
              failed_login_attempts = 0, lock_level = 1
       WHERE id = $1`,
      [id],
    )
    const antes = await estadoDeUsuario(id)

    // El intento obsoleto intenta "limpiar" el bloqueo (siguiente = todo a cero). El
    // predicado exige status 'active' y el estado real es 'blocked': NO aplica.
    const aplicado = await h.recorder.compareAndSet(
      id,
      obsoleto!.failedLoginAttempts,
      { failedLoginAttempts: 0, lockLevel: 0, lockedUntil: null },
      new Date(),
      obsoleto!.accountStatus,
      null,
    )
    expect(aplicado).toBe(false)

    const despues = await estadoDeUsuario(id)
    expect(despues).toEqual(antes)
  })

  it('R18: el CAS no aplica si el contador cambio entre lectura y escritura', async () => {
    const h = crearContexto()
    const id = usuariosId('aba2')
    const username = usernameDe('aba2')

    const obsoleto = await h.reader.findActiveByUsername(username)
    expect(obsoleto?.failedLoginAttempts).toBe(0)

    // Otra sesion anota fallos (contador 3) sin bloquear.
    await pool.query('UPDATE users SET failed_login_attempts = 3 WHERE id = $1', [id])

    const aplicado = await h.recorder.compareAndSet(
      id,
      obsoleto!.failedLoginAttempts, // 0, ya no es el valor real
      { failedLoginAttempts: 0, lockLevel: 0, lockedUntil: null },
      new Date(),
      obsoleto!.accountStatus,
      null,
    )
    expect(aplicado).toBe(false)

    const despues = await estadoDeUsuario(id)
    expect(despues.failed).toBe(3) // el contador fresco no se toco
  })

  it('R1/R3: el lector devuelve la fila unica o ninguna, sin desambiguar (decision 6)', async () => {
    const h = crearContexto()
    const id = usuariosId('exito')
    const username = usernameDe('exito')

    const fila = await h.reader.findActiveByUsername(username.toUpperCase()) // R3: case-insensitive
    expect(fila).not.toBeNull()
    expect(fila).toEqual({
      id,
      passwordHash: expect.any(String),
      failedLoginAttempts: 0,
      lockLevel: 0,
      lockedUntil: null,
      accountStatus: 'active',
      roleName: 'admin',
      companyId: empresaId,
      companyDeleted: false,
    })

    // Inexistente -> null, sin fila creada ni ambiguedad.
    const fantasma = `fantasma-${crypto.randomUUID()}`
    expect(await h.reader.findActiveByUsername(fantasma)).toBeNull()
  })

  it('R1: el lector no desambigua aunque exista una fila borrada con el mismo username', async () => {
    const h = crearContexto()
    const username = `lec-${sufijo}`
    const idViejo = crypto.randomUUID()
    const idNuevo = crypto.randomUUID()
    const hash = await new PasswordHasher().hash(CLAVE)
    usernames.push(username)
    idsUsuarios.push(idViejo, idNuevo)

    await pool.query(
      `INSERT INTO users (id, company_id, role_id, username, password_hash, account_status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [idViejo, empresaId, rolAdmin, username, hash],
    )
    await pool.query('UPDATE users SET deleted_at = now() WHERE id = $1', [idViejo])
    // El indice parcial de R27 permite el reuso tras el borrado logico.
    await pool.query(
      `INSERT INTO users (id, company_id, role_id, username, password_hash, account_status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [idNuevo, empresaId, rolAdmin, username, hash],
    )

    const fila = await h.reader.findActiveByUsername(username)
    expect(fila).not.toBeNull()
    expect(fila?.id).toBe(idNuevo) // la viva, no la borrada
    expect(fila?.companyDeleted).toBe(false)
  })

  it('R21: pendiente e inactiva no entran ni con la contrasena correcta, sin escrituras de cuenta', async () => {
    const h = crearContexto()
    for (const nombre of ['pend', 'inact'] as const) {
      const id = usuariosId(nombre)
      const username = usernameDe(nombre)
      const antes = await estadoDeUsuario(id)

      const resultado = await verifyCredentials({ username, password: CLAVE }, h.ctx)
      expect(resultado).toBe(REJECTED)
      expect(h.sesiones).toHaveLength(0)

      // Sin escrituras de cuenta (R21): nada cambio.
      const despues = await estadoDeUsuario(id)
      expect(despues).toEqual(antes)

      const rastro = await pool.query<{ outcome: string }>(
        `SELECT outcome FROM login_attempts WHERE username = $1 ORDER BY attempted_at`,
        [username],
      )
      expect(rastro.rows).toHaveLength(1)
      expect(rastro.rows[0].outcome).toBe('account_not_active')
    }
  })

  it('R7: el inexistente no toca la tabla de cuentas y deja rastro sin vinculos ni secretos', async () => {
    const h = crearContexto()
    const username = `fantasma-${crypto.randomUUID()}`
    usernames.push(username)

    const antes = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM users WHERE username = $1',
      [username],
    )
    expect(antes.rows[0].n).toBe(0)

    // Contrasena correcta o no: el camino inexistente verifica contra el señuelo (R4).
    const resultado = await verifyCredentials({ username, password: CLAVE }, h.ctx)
    expect(resultado).toBe(REJECTED)
    expect(h.sesiones).toHaveLength(0)

    // Ninguna escritura de cuenta: la tabla sigue sin filas para ese username (R7).
    const despues = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM users WHERE username = $1',
      [username],
    )
    expect(despues.rows[0].n).toBe(0)

    // Rastro: username guardado, vinculos NULL, desenlace uniforme (R2/R24). El servicio
    // escribe bad_credentials para el inexistente — ver nota de desviacion en la cabecera.
    const rastro = await pool.query(
      `SELECT * FROM login_attempts WHERE username = $1 ORDER BY attempted_at DESC LIMIT 1`,
      [username],
    )
    expect(rastro.rows[0]).toMatchObject({
      username,
      outcome: 'bad_credentials',
      annotation_failed: false,
    })
    expect(rastro.rows[0].user_id).toBeNull()
    expect(rastro.rows[0].company_id).toBeNull()

    // R13 por valor: el rastro real no tiene columnas que puedan llevar secretos.
    const claves = Object.keys(rastro.rows[0])
    for (const columna of claves) {
      expect(columna).not.toMatch(/password|hash|token|session|sid/i)
    }
    expect(rastro.rows[0].ip_address).toBeNull()
    expect(rastro.rows[0].user_agent).toBeNull()
  })

  it('R19/R20: un bloqueo caducado no frena el exito, que resetea contador, nivel y plazo y deja rastro success', async () => {
    const h = crearContexto()
    const id = usuariosId('exito')
    const username = usernameDe('exito')

    // Estado con bloqueo CADUCADO (plazo en pasado): el caso de uso acepta (R19).
    await fijarEstado(id, { status: 'active', failed: 3, nivel: 1, lu: dentroDeMinutos(-1) })

    const resultado = await verifyCredentials({ username, password: CLAVE }, h.ctx)
    expect(resultado).toEqual({ ok: true })

    // El ticket sale de lo que devolvio el puerto, con un sid nuevo (inv. 10/11, R14).
    expect(h.sesiones).toHaveLength(1)
    expect(h.sesiones[0]).toMatchObject({ sub: id, roleName: 'admin', companyId: empresaId })
    expect(h.sesiones[0].sid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )

    // R20: reset de los tres campos.
    const estado = await estadoDeUsuario(id)
    expect(estado).toEqual({ failed: 0, nivel: 0, lu: null, status: 'active' })

    const rastro = await pool.query(
      `SELECT outcome, user_id, company_id FROM login_attempts
       WHERE username = $1 ORDER BY attempted_at DESC LIMIT 1`,
      [username],
    )
    expect(rastro.rows[0]).toMatchObject({ outcome: 'success' })
    expect(rastro.rows[0].user_id).not.toBeNull()
    expect(rastro.rows[0].company_id).not.toBeNull()
  })

  it('R24: una fila de rastro por cada desenlace resuelto, con username y vinculos correctos', async () => {
    const h = crearContexto()
    const username = usernameDe('exito')
    const pend = usernameDe('pend')
    const inline = `fantasma-inline-${sufijo}`
    usernames.push(inline)

    // Desenlaces ya resueltos por los casos anteriores, contados desde la tabla real:
    // 1 success (exito) + 1 account_not_active (pend) + escrituras propias de este caso.
    await verifyCredentials({ username, password: 'clave-incorrecta' }, h.ctx) // malpass: CAS escribe 1
    await verifyCredentials({ username: inline, password: 'x' }, h.ctx)

    const resumen = await pool.query<{ username: string; outcome: string; n: number }>(
      `SELECT username, outcome, count(*)::int AS n
       FROM login_attempts
       WHERE username = ANY($1)
       GROUP BY username, outcome
       ORDER BY username, outcome`,
      [[username, pend, inline]],
    )
    expect(resumen.rows).toContainEqual({ username, outcome: 'success', n: 1 })
    expect(resumen.rows).toContainEqual({ username, outcome: 'bad_credentials', n: 1 })
    expect(resumen.rows).toContainEqual({ username: pend, outcome: 'account_not_active', n: 1 })
    expect(resumen.rows).toContainEqual({ username: inline, outcome: 'bad_credentials', n: 1 })
  })

  it('decision 3/R24: el CAS agotado deja annotation_failed en la fila real', async () => {
    const h = crearContexto()
    const id = usuariosId('cas')
    const username = usernameDe('cas')

    // Ocho conexiones writer compiten por la fila: entre la lectura del servicio y su CAS
    // siempre cae al menos un UPDATE, asi el predicado (contador == leido) nunca aplica y
    // el servicio agota los ~10 reintentos sin escribir (decision 3). Se valida sobre
    // base REAL; si el mecanismo quedara inestable en algun ambiente, este es el caso
    // que lo delata (contrato: se documenta y se salta, no se falsifica).
    const writers = Array.from({ length: 8 }, () => new Pool({ connectionString: DATABASE_URL }))
    try {
      for (let ronda = 0; ronda < 3; ronda++) {
        await fijarEstado(id, { status: 'active', failed: 0, nivel: 0, lu: null })
        let correr = true
        const tareas = writers.map(async (w) => {
          while (correr) {
            try {
              await w.query(
                'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1',
                [id],
              )
            } catch {
              // Best-effort: si una conexion rota, las otras siete siguen compitiendo.
            }
          }
        })

        const resultado = await verifyCredentials({ username, password: 'clave-incorrecta' }, h.ctx)
        correr = false
        await Promise.all(tareas)

        expect(resultado).toBe(REJECTED)
        expect(h.sesiones).toHaveLength(0)

        const ultimo = await pool.query<{ annotation_failed: boolean }>(
          `SELECT annotation_failed FROM login_attempts
           WHERE username = $1 ORDER BY attempted_at DESC LIMIT 1`,
          [username],
        )
        if (ultimo.rows[0]?.annotation_failed === true) {
          return // el mecanismo comprobo el camino real del CAS agotado
        }
      }
    } finally {
      await Promise.all(writers.map((w) => w.end()))
    }

    expect.fail(
      'tras 3 rondas el CAS real nunca se agoto: el mecanismo de writers no esta compitiendo ' +
        'como se esperaba. Revisar el test o saltarlo documentando la limitacion (contrato).',
    )
  })
})