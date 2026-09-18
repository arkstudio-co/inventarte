/**
 * T6 — Unit de la politica de bloqueo PURA (design.md §7, R15-R20) con reloj INYECTADO:
 * el `now` entra por parametro y el test lo mueve con un fake — sin sleeps, sin esperas.
 *
 * R15, R16, R18, R19, R20.
 */
import { describe, expect, it } from 'vitest'
import { effectiveAccountStatus } from '../../lib/services/login/account-status'
import { nextFailureState, successResetState } from '../../lib/services/login/account-lock-policy'
import type { AccountLockState, FailureEscalation, LockPolicy } from '../../lib/services/login/account-lock-policy'

const MINUTO = 60_000

const POLITICA: LockPolicy = { maxFailedAttempts: 5, lockDurationsMinutes: [1, 5, 15, 60] }

/** Reloj fake: `ahora()` devuelve copia del instante actual; `avanzar` lo desplaza. */
function crearRelojFake() {
  let actual = new Date('2026-09-16T10:00:00.000Z')
  return {
    ahora(): Date {
      return new Date(actual.getTime())
    },
    avanzar(ms: number) {
      actual = new Date(actual.getTime() + ms)
    },
  }
}

/** Estado inicial de una cuenta nunca bloqueada. */
function estadoLimpio(): AccountLockState {
  return { failedLoginAttempts: 0, lockLevel: 0, lockedUntil: null, accountStatus: 'active' }
}

/** Aplica una escalada: escribe lo que el CAS escribiria sobre la cuenta. */
function aplicar(estado: AccountLockState, esc: FailureEscalation): AccountLockState {
  return {
    failedLoginAttempts: esc.siguiente.failedLoginAttempts,
    lockLevel: esc.siguiente.lockLevel,
    lockedUntil: esc.siguiente.lockedUntil,
    accountStatus: esc.estadoNuevo ?? estado.accountStatus,
  }
}

describe('nextFailureState', () => {
  it('el quinto fallo consecutivo bloquea y reinicia el contador (R15)', () => {
    const r = crearRelojFake()
    let estado = estadoLimpio()
    const contadores: number[] = []
    let bloqueo: FailureEscalation | null = null

    for (let fallo = 1; fallo <= 5; fallo++) {
      const esc = nextFailureState(estado, r.ahora(), POLITICA)
      contadores.push(esc.siguiente.failedLoginAttempts)
      estado = aplicar(estado, esc)
      if (esc.estadoNuevo === 'blocked') bloqueo = esc
    }

    // Fallos 1-4: solo sube el contador; el quinto lo REINICIA a cero (R15).
    expect(contadores).toEqual([1, 2, 3, 4, 0])
    expect(bloqueo).not.toBeNull()
    expect(bloqueo!.siguiente.lockLevel).toBe(1)
    expect(bloqueo!.siguiente.lockedUntil!.getTime() - r.ahora().getTime()).toBe(1 * MINUTO)
    expect(bloqueo!.locked).toBe(true)
    expect(estado.accountStatus).toBe('blocked')
  })

  it('la duracion del bloqueo escala 1/5/15/60 minutos y se repite 60, nunca permanente (R16)', () => {
    const r = crearRelojFake()
    let estado = estadoLimpio()
    const duraciones: number[] = []
    const niveles: number[] = []
    const primerasNoBloquean: boolean[] = []

    for (let bloque = 0; bloque < 5; bloque++) {
      for (let fallo = 0; fallo < 5; fallo++) {
        const esc = nextFailureState(estado, r.ahora(), POLITICA)
        if (fallo === 0) primerasNoBloquean.push(esc.locked)
        if (esc.estadoNuevo === 'blocked') {
          duraciones.push((esc.siguiente.lockedUntil!.getTime() - r.ahora().getTime()) / MINUTO)
          niveles.push(esc.siguiente.lockLevel)
        }
        estado = aplicar(estado, esc)
      }
      // Pasa el tiempo hasta despues del vencimiento del plazo actual: el proximo bloque
      // arranca con el bloqueo caducado (R19) y sube de nivel.
      r.avanzar(estado.lockedUntil!.getTime() - r.ahora().getTime() + 2 * MINUTO)
    }

    expect(duraciones).toEqual([1, 5, 15, 60, 60])
    expect(niveles).toEqual([1, 2, 3, 4, 4])
    // El nivel se CAPS en la longitud del arreglo: el quinto bloqueo mantiene 60 minutos,
    // nunca se vuelve permanente la duracion ni el estado.
    expect(primerasNoBloquean).toEqual([false, false, false, false, false])
    expect(estado.lockLevel).toBe(4)
    expect(estado.lockedUntil).not.toBeNull()
  })

  it('el fallo estando bloqueada devuelve el estado intacto: no suma, no sube nivel, no alarga (R18)', () => {
    const r = crearRelojFake()
    const lockHasta = new Date(r.ahora().getTime() + 10 * MINUTO)
    const estado: AccountLockState = {
      failedLoginAttempts: 4,
      lockLevel: 2,
      lockedUntil: lockHasta,
      accountStatus: 'blocked',
    }

    const esc = nextFailureState(estado, r.ahora(), POLITICA)

    expect(esc.siguiente).toEqual({ failedLoginAttempts: 4, lockLevel: 2, lockedUntil: lockHasta })
    expect(esc.estadoNuevo).toBeNull()
    expect(esc.locked).toBe(true)
  })

  it('el bloqueo caducado deja de bloquear, limpia el plazo y no sube nivel (R19)', () => {
    const r = crearRelojFake()
    const vencido = new Date(r.ahora().getTime() - 1 * MINUTO)
    const estado: AccountLockState = {
      failedLoginAttempts: 2,
      lockLevel: 2,
      lockedUntil: vencido,
      accountStatus: 'blocked',
    }

    const esc = nextFailureState(estado, r.ahora(), POLITICA)

    expect(esc.locked).toBe(false)
    expect(esc.siguiente).toEqual({ failedLoginAttempts: 3, lockLevel: 2, lockedUntil: null })
    expect(esc.estadoNuevo).toBeNull()
    // R19 se sostiene en el traductor de estado efectivo: con plazo vencido, la cuenta
    // 'blocked' cuenta como activa — misma rama que vuelve a aceptar credenciales.
    expect(
      effectiveAccountStatus('blocked', { companyDeleted: false, lockedUntil: vencido, now: r.ahora() }),
    ).toBe('active')
  })
})

describe('successResetState', () => {
  it('el exito deja contador, nivel y bloqueo a cero y el estado a active (R20)', () => {
    expect(successResetState()).toEqual({
      siguiente: { failedLoginAttempts: 0, lockLevel: 0, lockedUntil: null },
      estadoNuevo: 'active',
    })
  })
})