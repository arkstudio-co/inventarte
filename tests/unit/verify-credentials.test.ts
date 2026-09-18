/**
 * T5 — Unit del caso de uso verifyCredentials (design.md §5, invariantes 1-13) con
 * PUERTOS FALSOS: sin base, sin hash real, sin reloj del sistema ni azar. El hasher fake
 * hace `hash:texto`, el reloj es un puntero mutable y el CAS pierde la carrera cuando el
 * test lo programa. Cada caso se nombra por el comportamiento que fija.
 *
 * R1, R2, R4, R5, R7, R12, R14, R17, R21, R24.
 */
import { describe, expect, it } from 'vitest'
import type {
  AccountStatusRaw,
  AuthenticatableUser,
  IUserCredentialsReader,
} from '../../lib/interfaces/repositories/i-user-credentials-reader'
import type { CasSiguiente, ILoginAttemptRecorder, LoginAttemptRecord } from '../../lib/interfaces/repositories/i-login-attempt-recorder'
import type { IPasswordHasher } from '../../lib/interfaces/services/i-password-hasher'
import type { ISessionIdFactory } from '../../lib/interfaces/services/i-session-id-factory'
import type { ISessionStarter, SessionTicket } from '../../lib/interfaces/services/i-session-starter'
import { MAX_CAS_RETRIES, REJECTED, verifyCredentials } from '../../lib/services/login/verify-credentials-service'
import type { VerifyCredentialsContext } from '../../lib/services/login/verify-credentials-service'
import { parseLoginInput } from '../../lib/types/login'

const MINUTO = 60_000

/** Un usuario tal como lo devolveria el puerto lector, con valores por defecto de prueba. */
function usuario(sobre: Partial<AuthenticatableUser> = {}): AuthenticatableUser {
  return {
    id: 'u-1',
    passwordHash: 'hash:secreta',
    failedLoginAttempts: 0,
    lockLevel: 0,
    lockedUntil: null,
    accountStatus: 'active',
    roleName: 'admin',
    companyId: 'c-1',
    companyDeleted: false,
    ...sobre,
  }
}

/**
 * Arma el harness completo: los cinco puertos falsos comparten el MISMO store (el map que
 * ve el lector es el que el registrador escribe), el reloj es un puntero mutable y cada
 * llamada al CAS se puede programar (resultado + mutacion) para simular carreras.
 */
function armarHarness() {
  const reloj = { ahora: new Date('2026-09-16T10:00:00.000Z') }

  // --- puerto 1: lector (store compartido) ---
  const porUsername = new Map<string, AuthenticatableUser>()
  const lecturas: string[] = []
  const reader: IUserCredentialsReader = {
    async findActiveByUsername(username) {
      lecturas.push(username)
      return porUsername.get(username) ?? null
    },
  }

  // --- puerto 2: hasher (contadores observables) ---
  const contadores = { verificaciones: 0, computacionesSenuelo: 0, sid: 0 }
  let promesaSenuelo: Promise<string> | null = null
  const hasher: IPasswordHasher = {
    async hash(texto) {
      return `hash:${texto}`
    },
    async verify(texto, hashGuardado) {
      contadores.verificaciones++
      return hashGuardado === `hash:${texto}`
    },
    getDecoyHash() {
      if (promesaSenuelo === null) {
        contadores.computacionesSenuelo++
        promesaSenuelo = Promise.resolve(`hash:senuelo-${contadores.computacionesSenuelo}`)
      }
      return promesaSenuelo
    },
  }

  // --- puerto 3: registrador (CAS programable, set, rastro) ---
  type ComportamientoCas = { resultado: boolean; mutar?: () => void }
  const comportamientoCas: ComportamientoCas[] = []
  const llamadasCas: Array<{
    id: string
    esperado: number
    siguiente: CasSiguiente
    estadoEsperado: AccountStatusRaw
    estadoNuevo: AccountStatusRaw | null
  }> = []
  const llamadasSet: Array<{ id: string; estado: AccountStatusRaw; estadoNuevo: AccountStatusRaw | null }> = []
  const rastros: LoginAttemptRecord[] = []
  const recorder: ILoginAttemptRecorder = {
    async compareAndSet(id, esperado, siguiente, _ahora, estadoEsperado, estadoNuevo) {
      llamadasCas.push({ id, esperado, siguiente, estadoEsperado, estadoNuevo })
      const comportamiento = comportamientoCas.shift()
      if (comportamiento) {
        comportamiento.mutar?.()
        return comportamiento.resultado
      }
      // Comportamiento por defecto: aplica sobre el mismo store que ve el lector.
      for (const [username, u] of porUsername) {
        if (u.id === id) {
          porUsername.set(username, {
            ...u,
            failedLoginAttempts: siguiente.failedLoginAttempts,
            lockLevel: siguiente.lockLevel,
            lockedUntil: siguiente.lockedUntil,
            accountStatus: estadoNuevo ?? u.accountStatus,
          })
          break
        }
      }
      return true
    },
    async set(id, estado, estadoNuevo) {
      llamadasSet.push({ id, estado, estadoNuevo })
      for (const [username, u] of porUsername) {
        if (u.id === id) {
          porUsername.set(username, {
            ...u,
            failedLoginAttempts: 0,
            lockLevel: 0,
            lockedUntil: null,
            accountStatus: estadoNuevo ?? u.accountStatus,
          })
          break
        }
      }
    },
    async recordAttempt(registro) {
      rastros.push(registro)
    },
  }

  // --- puertos 4 y 5: sesion y fabrica de sid ---
  const sesiones: SessionTicket[] = []
  let sesionLanzaError = false
  const sessionStarter: ISessionStarter = {
    async startSession(ticket) {
      if (sesionLanzaError) throw new Error('transporte no disponible')
      sesiones.push(ticket)
    },
  }
  const sessionIdFactory: ISessionIdFactory = {
    newSessionId: () => `sid-${contadores.sid++}`,
  }

  const ctx: VerifyCredentialsContext = {
    reader,
    hasher,
    recorder,
    sessionStarter,
    sessionIdFactory,
    clock: () => reloj.ahora,
    lockPolicy: { maxFailedAttempts: 5, lockDurationsMinutes: [1, 5, 15, 60] },
  }

  return {
    ctx,
    reloj,
    porUsername,
    lecturas,
    contadores,
    comportamientoCas,
    llamadasCas,
    llamadasSet,
    rastros,
    sesiones,
    set sesionLanzaError(v: boolean) {
      sesionLanzaError = v
    },
  }
}

describe('verifyCredentials', () => {
  it('acepta credenciales validas y emite la sesion con los datos del puerto, jamas de la entrada', async () => {
    const h = armarHarness()
    h.porUsername.set('ana', usuario({ id: 'u-42', roleName: 'admin_maestro', companyId: 'c-9' }))

    // El username llega "sucio" desde el borde (R3): el servicio lo normaliza antes de leer.
    const res = await verifyCredentials({ username: '  Ana  ', password: 'secreta' }, h.ctx)

    expect(res).toEqual({ ok: true })
    expect(h.lecturas).toEqual(['ana'])
    expect(h.sesiones).toHaveLength(1)
    expect(h.sesiones[0]).toEqual({
      sub: 'u-42',
      roleName: 'admin_maestro',
      companyId: 'c-9',
      sid: 'sid-0',
    })
    expect(h.sesiones[0]).not.toHaveProperty('password')
    expect(h.llamadasSet).toEqual([{ id: 'u-42', estado: 'active', estadoNuevo: 'active' }])
    expect(h.llamadasCas).toHaveLength(0)
    expect(h.rastros).toEqual([
      {
        username: 'ana',
        outcome: 'success',
        annotationFailed: false,
        companyId: 'c-9',
        userId: 'u-42',
      },
    ])
  })

  it('todo rechazo devuelve el MISMO objeto congelado, sin importar el motivo (R2)', async () => {
    const h = armarHarness()
    h.porUsername.set('ana', usuario({ id: 'u-1' }))
    h.porUsername.set(
      'blo',
      usuario({
        id: 'u-2',
        accountStatus: 'blocked',
        lockedUntil: new Date(h.reloj.ahora.getTime() + 10 * MINUTO),
      }),
    )

    const porContrasenaMala = await verifyCredentials({ username: 'ana', password: 'malapass' }, h.ctx)
    const porBloqueadaConCorrecta = await verifyCredentials({ username: 'blo', password: 'secreta' }, h.ctx)
    const porInexistente = await verifyCredentials({ username: 'fantasma', password: 'secreta' }, h.ctx)

    expect(porContrasenaMala).toBe(REJECTED)
    expect(porBloqueadaConCorrecta).toBe(REJECTED)
    expect(porInexistente).toBe(REJECTED)
  })

  it('la entrada invalida se corta en el borde: ningun puerto llega a ser llamado (R6)', async () => {
    const h = armarHarness()
    h.porUsername.set('ana', usuario())

    // El borde (parseLoginInput) rechaza; el servicio es de firma tipada (LoginInput) y
    // jamas ve entrada invalida — el contrato de capas lo garantiza sin try/catch.
    const res = parseLoginInput({ username: '', password: '' }, 'att-1')
    expect(res.ok).toBe(false)

    expect(h.lecturas).toHaveLength(0)
    expect(h.contadores.verificaciones).toBe(0)
    expect(h.contadores.computacionesSenuelo).toBe(0)
    expect(h.llamadasCas).toHaveLength(0)
    expect(h.llamadasSet).toHaveLength(0)
    expect(h.rastros).toHaveLength(0)
    expect(h.sesiones).toHaveLength(0)
  })

  it('los cortes de estado, organizacion y bloqueo rechazan sin escribir ni emitir sesion (R21)', async () => {
    const h = armarHarness()
    h.porUsername.set('pend', usuario({ id: 'u-p', accountStatus: 'pending' }))
    h.porUsername.set('org', usuario({ id: 'u-o', companyId: 'c-o', companyDeleted: true }))
    h.porUsername.set(
      'blo',
      usuario({ id: 'u-b', accountStatus: 'blocked', lockedUntil: new Date(h.reloj.ahora.getTime() + 10 * MINUTO) }),
    )

    const casos = [
      ['pend', 'account_not_active'],
      ['org', 'org_inactive'],
      ['blo', 'account_blocked'],
    ] as const
    for (const [username, outcome] of casos) {
      const res = await verifyCredentials({ username, password: 'secreta' }, h.ctx)
      expect(res).toBe(REJECTED)
      expect(h.sesiones).toHaveLength(0)
      expect(h.llamadasCas).toHaveLength(0)
      expect(h.llamadasSet).toHaveLength(0)
    }

    // R21: tres rechazos, sin escrituras de cuenta; una fila de rastro por desenlace.
    expect(h.rastros.map((r) => [r.username, r.outcome])).toEqual([
      ['pend', 'account_not_active'],
      ['org', 'org_inactive'],
      ['blo', 'account_blocked'],
    ])
    expect(h.contadores.verificaciones).toBe(3) // una por intento (invariante 2)
    expect(h.rastros[1]).toMatchObject({ companyId: 'c-o', userId: 'u-o' })
    expect(h.rastros[2]).toMatchObject({ companyId: 'c-1', userId: 'u-b' })
  })

  it('con contrasena incorrecta y cuenta activa escala con CAS, sin resetear ni emitir sesion', async () => {
    const h = armarHarness()
    h.porUsername.set('ana', usuario({ id: 'u-1' }))

    const res = await verifyCredentials({ username: 'ana', password: 'malapass' }, h.ctx)

    expect(res).toBe(REJECTED)
    expect(h.llamadasCas).toHaveLength(1)
    expect(h.llamadasCas[0].esperado).toBe(0)
    expect(h.llamadasCas[0].siguiente).toEqual({ failedLoginAttempts: 1, lockLevel: 0, lockedUntil: null })
    expect(h.llamadasCas[0].estadoNuevo).toBeNull()
    expect(h.llamadasSet).toHaveLength(0)
    expect(h.sesiones).toHaveLength(0)
    expect(h.rastros).toEqual([
      {
        username: 'ana',
        outcome: 'bad_credentials',
        annotationFailed: false,
        companyId: 'c-1',
        userId: 'u-1',
      },
    ])
  })

  it('el senuelo se calcula una sola vez por proceso y se verifica una vez por intento (R4, R5)', async () => {
    const h = armarHarness()

    await verifyCredentials({ username: 'ghost', password: 'x' }, h.ctx)
    await verifyCredentials({ username: 'phantom', password: 'y' }, h.ctx)

    expect(h.contadores.computacionesSenuelo).toBe(1)
    expect(h.contadores.verificaciones).toBe(2) // una verificacion del senuelo por intento
    expect(h.rastros.map((r) => r.username)).toEqual(['ghost', 'phantom'])
    // Inexistente: rastro sin vinculos de cuenta ni organizacion (R7, R24).
    for (const r of h.rastros) {
      expect(r.outcome).toBe('bad_credentials')
      expect(r.annotationFailed).toBe(false)
      expect(r.companyId).toBeNull()
      expect(r.userId).toBeNull()
    }
  })

  it('la cuenta bloqueada verifica el hash UNA sola vez, aun con contrasena correcta (R17)', async () => {
    const h = armarHarness()
    h.porUsername.set(
      'blo',
      usuario({ id: 'u-b', accountStatus: 'blocked', lockedUntil: new Date(h.reloj.ahora.getTime() + 10 * MINUTO) }),
    )

    const res = await verifyCredentials({ username: 'blo', password: 'secreta' }, h.ctx)

    expect(res).toBe(REJECTED)
    expect(h.contadores.verificaciones).toBe(1)
    expect(h.llamadasCas).toHaveLength(0)
    expect(h.llamadasSet).toHaveLength(0)
    expect(h.sesiones).toHaveLength(0)
    expect(h.rastros[0].outcome).toBe('account_blocked')
  })

  it('la cuenta bloqueada verifica el hash una sola vez, tambien con contrasena incorrecta', async () => {
    const h = armarHarness()
    h.porUsername.set(
      'blo',
      usuario({ id: 'u-b', accountStatus: 'blocked', lockedUntil: new Date(h.reloj.ahora.getTime() + 10 * MINUTO) }),
    )

    const res = await verifyCredentials({ username: 'blo', password: 'malapass' }, h.ctx)

    expect(res).toBe(REJECTED)
    expect(h.contadores.verificaciones).toBe(1)
    expect(h.llamadasCas).toHaveLength(0)
  })

  it('perder la carrera del CAS relee, recalcula sobre el estado fresco y reintenta sin rehacer el hash (inv. 8)', async () => {
    const h = armarHarness()
    const ana = usuario({ id: 'u-1' })
    h.porUsername.set('ana', ana)
    // El otro escritor ya anoto su fallo: el contador que releera el servicio es 1.
    h.comportamientoCas.push({
      resultado: false,
      mutar: () => h.porUsername.set('ana', { ...ana, failedLoginAttempts: 1 }),
    })

    const res = await verifyCredentials({ username: 'ana', password: 'malapass' }, h.ctx)

    expect(res).toBe(REJECTED)
    expect(h.contadores.verificaciones).toBe(1) // jamas se volvio al hasher
    expect(h.lecturas).toHaveLength(2) // lectura inicial + releida tras perder la carrera
    expect(h.llamadasCas).toHaveLength(2)
    expect(h.llamadasCas[1].esperado).toBe(1) // el segundo CAS usa el contador fresco
    expect(h.llamadasCas[1].siguiente.failedLoginAttempts).toBe(2)
    expect(h.rastros).toHaveLength(1) // el rastro solo llega cuando el CAS se aplico
    expect(h.rastros[0].outcome).toBe('bad_credentials')
  })

  it('si el usuario desaparece entre intento y reintento, el reintento no escribe nada (R7)', async () => {
    const h = armarHarness()
    h.porUsername.set('ana', usuario({ id: 'u-1' }))
    h.comportamientoCas.push({ resultado: false, mutar: () => h.porUsername.delete('ana') })

    const res = await verifyCredentials({ username: 'ana', password: 'malapass' }, h.ctx)

    expect(res).toBe(REJECTED)
    expect(h.llamadasCas).toHaveLength(1)
    expect(h.llamadasSet).toHaveLength(0)
    expect(h.sesiones).toHaveLength(0)
    expect(h.rastros).toEqual([
      {
        username: 'ana',
        outcome: 'bad_credentials',
        annotationFailed: false,
        companyId: null,
        userId: null,
      },
    ])
  })

  it('agotado el CAS registra annotation_failed y el resultado sigue siendo el rechazo congelado (decision 3)', async () => {
    const h = armarHarness()
    h.porUsername.set('ana', usuario({ id: 'u-1' }))
    for (let i = 0; i < MAX_CAS_RETRIES; i++) h.comportamientoCas.push({ resultado: false })

    const res = await verifyCredentials({ username: 'ana', password: 'malapass' }, h.ctx)

    expect(res).toBe(REJECTED)
    expect(h.llamadasCas).toHaveLength(MAX_CAS_RETRIES)
    expect(h.llamadasSet).toHaveLength(0)
    expect(h.sesiones).toHaveLength(0)
    expect(h.rastros).toEqual([
      {
        username: 'ana',
        outcome: 'bad_credentials',
        annotationFailed: true,
        companyId: 'c-1',
        userId: 'u-1',
      },
    ])
  })

  it('cada desenlace deja su rastro con username, outcome y vinculos, sin secretos (R13, R24)', async () => {
    const h = armarHarness()
    h.porUsername.set('ana', usuario({ id: 'u-1', roleName: 'admin_maestro' }))
    h.porUsername.set('org', usuario({ id: 'u-o', companyId: 'c-o', companyDeleted: true }))

    await verifyCredentials({ username: '  Ana  ', password: 'secreta' }, h.ctx) // success
    await verifyCredentials({ username: 'ana', password: 'malapass' }, h.ctx) // bad, CAS aplicado
    await verifyCredentials({ username: 'fantasma', password: 'x' }, h.ctx) // inexistente
    await verifyCredentials({ username: 'org', password: 'secreta' }, h.ctx) // org_inactive

    expect(h.rastros.map((r) => [r.username, r.outcome, r.annotationFailed])).toEqual([
      ['ana', 'success', false],
      ['ana', 'bad_credentials', false],
      ['fantasma', 'bad_credentials', false],
      ['org', 'org_inactive', false],
    ])
    expect(h.rastros[0]).toMatchObject({ companyId: 'c-1', userId: 'u-1' })
    expect(h.rastros[1]).toMatchObject({ companyId: 'c-1', userId: 'u-1' })
    expect(h.rastros[3]).toMatchObject({ companyId: 'c-o', userId: 'u-o' })

    // R13 por tipo y por valor: el rastro no tiene campo para contrasena, hash ni sesion.
    for (const r of h.rastros) {
      expect(r).not.toHaveProperty('password')
      expect(r).not.toHaveProperty('passwordHash')
      expect(r).not.toHaveProperty('hash')
      expect(r).not.toHaveProperty('token')
      expect(r).not.toHaveProperty('sid')
      expect(r).not.toHaveProperty('session')
      // Esta tanda el contexto no provee "desde donde" (R24): el servicio los omite.
      expect(r).not.toHaveProperty('ipAddress')
      expect(r).not.toHaveProperty('userAgent')
    }
  })

  it('si emitir la sesion lanza, la excepcion se propaga y no se registra el exito (inv. 9)', async () => {
    const h = armarHarness()
    h.porUsername.set('ana', usuario())
    h.sesionLanzaError = true

    await expect(verifyCredentials({ username: 'ana', password: 'secreta' }, h.ctx)).rejects.toThrow(
      'transporte no disponible',
    )

    // Verificar y LUEGO emitir: al lanzar la emision, el rastro de exito no se escribe.
    expect(h.rastros).toHaveLength(0)
  })
})