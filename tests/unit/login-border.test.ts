/**
 * T7 — Unit del borde y el formulario (design.md §10, §11, invariante 15): esquema zod,
 * estado tipado SIN contrasena, normalizacion R3, aterrizaje `next` sin open redirect.
 *
 * R2, R3, R6, R13, R14, R21 (corte en el borde).
 */
import { describe, expect, it } from 'vitest'
import { CREDENTIAL_MAX_LENGTH, USERNAME_MAX_LENGTH } from '../../lib/types/identity-constants'
import {
  LOGIN_COPY_CREDENTIALS_INVALID,
  LOGIN_COPY_FIELD_REQUIRED,
  loginCopyFieldTooLong,
  loginCopyPasswordTooLong,
} from '../../lib/types/login-copy'
import {
  DASHBOARD_ROUTE,
  LOGIN_INITIAL_STATE,
  loginFormError,
  loginFormInvalid,
  loginFormRejected,
  normalizeUsername,
  parseLoginInput,
  resolveNextDestination,
} from '../../lib/types/login'
import type { LoginFormState } from '../../lib/types/login'

/** Extrae el estado de un rechazo del borde; falla si el borde (sorpresivamente) acepto. */
function rechazo(
  res: { ok: true; data: unknown } | { ok: false; state: LoginFormState },
): LoginFormState {
  if (res.ok) throw new Error('se esperaba rechazo del borde')
  return res.state
}

describe('parseLoginInput (borde)', () => {
  it('los campos vacios dan errores por campo, con la constante obligatoria y el username escrito', () => {
    const estado = rechazo(parseLoginInput({ username: '  ', password: '' }, 'att-1'))

    expect(estado.status).toBe('invalid')
    if (estado.status !== 'invalid') return
    expect(estado.attemptId).toBe('att-1')
    expect(estado.username).toBe('  ') // lo que se tecleo, para el re-render del campo
    expect(estado.fieldErrors).toEqual({
      username: LOGIN_COPY_FIELD_REQUIRED,
      password: LOGIN_COPY_FIELD_REQUIRED,
    })
  })

  it('la contrasena y el username demasiado largos dan el mensaje parametrizado por campo (R6)', () => {
    const passLarga = rechazo(
      parseLoginInput({ username: 'ana', password: 'x'.repeat(CREDENTIAL_MAX_LENGTH + 1) }, 'att-1'),
    )
    if (passLarga.status !== 'invalid') throw new Error('se esperaba rechazo del borde')
    expect(passLarga.fieldErrors.password).toBe(loginCopyPasswordTooLong(CREDENTIAL_MAX_LENGTH))
    expect(passLarga.fieldErrors.username).toBeUndefined()

    const userLargo = rechazo(
      parseLoginInput({ username: 'a'.repeat(USERNAME_MAX_LENGTH + 1), password: 'ok' }, 'att-2'),
    )
    if (userLargo.status !== 'invalid') throw new Error('se esperaba rechazo del borde')
    expect(userLargo.fieldErrors.username).toBe(loginCopyFieldTooLong(USERNAME_MAX_LENGTH))
    expect(userLargo.fieldErrors.password).toBeUndefined()
  })

  it('un par valido pasa el borde: username con trim, contrasena intacta (R3)', () => {
    const res = parseLoginInput({ username: '  Ana.MarIa  ', password: '  Secreta  ' }, 'att-3')
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error('se esperaba aceptacion del borde')
    // El borde solo TRIMEA; las minusculas las aplica el servicio (normalizeUsername).
    expect(res.data.username).toBe('Ana.MarIa')
    expect(res.data.password).toBe('  Secreta  ')
  })

  it('la entrada invalida no llega al servicio: ningun puerto se toca (R6, corte en el borde)', () => {
    // A nivel de borde no hay puertos; el contrato de capas es que la Server Action (T15)
    // valida con parseLoginInput ANTES de instanciar el servicio tipado (LoginInput).
    const estado = rechazo(parseLoginInput({ username: '', password: '' }, 'att-1'))
    expect(estado.status).toBe('invalid')

    // Y el mensaje de estos errores de FORMA nunca es el de AUTENTICACION (R2/R6): son dos
    // categorias distintas y el usuario necesita saber que campo corregir.
    expect(LOGIN_COPY_FIELD_REQUIRED).not.toBe(LOGIN_COPY_CREDENTIALS_INVALID)
  })
})

describe('mensaje de autenticacion (R2)', () => {
  it('todo rechazo de credenciales usa la misma constante exportada', () => {
    const fr = loginFormRejected('att-9', 'ana')
    expect(fr.status).toBe('error')
    if (fr.status !== 'error') return
    expect(fr.message).toBe(LOGIN_COPY_CREDENTIALS_INVALID)
    expect(fr.attemptId).toBe('att-9')
    expect(fr.username).toBe('ana')
    // El estado de rechazo no mezcla errores de forma ni lleva contrasena.
    expect(fr).not.toHaveProperty('fieldErrors')
    expect(fr).not.toHaveProperty('password')
  })
})

describe('normalizacion (R3)', () => {
  it('trim + minusculas del username; la contrasena nunca se normaliza', () => {
    expect(normalizeUsername('  JoSe  ')).toBe('jose')
    expect(normalizeUsername('ANA')).toBe('ana')

    const res = parseLoginInput({ username: '  Ana.MarIa  ', password: '  Secreta  ' }, 'att-1')
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error('se esperaba aceptacion del borde')
    expect(normalizeUsername(res.data.username)).toBe('ana.maria')
    expect(res.data.password).toBe('  Secreta  ')
  })
})

describe('estado del formulario sin contrasena (R13, invariante 15)', () => {
  it('ningun estado devuelto contiene la contrasena (valor)', () => {
    const invalida = rechazo(parseLoginInput({ username: 'ana', password: 'x'.repeat(70) }, 'att-1'))
    const error = loginFormError('att-2', 'ana', 'mensaje')
    const inicial = LOGIN_INITIAL_STATE

    expect(invalida).not.toHaveProperty('password')
    expect(error).not.toHaveProperty('password')
    expect(inicial).toEqual({ status: 'idle' })
  })

  it('ningun miembro del tipo LoginFormState admite contrasena (negativo de compilacion)', () => {
    const estado: LoginFormState = loginFormInvalid('att-3', 'ana', {})
    // @ts-expect-error la contrasena no existe en ningun miembro de LoginFormState
    estado.password
  })
})

describe('attemptId y username tras el rechazo (R14)', () => {
  it('attemptId distinto por invocacion y username conservado para el re-render', () => {
    const a1 = rechazo(parseLoginInput({ username: ' ana ', password: '' }, 'att-1'))
    const a2 = rechazo(parseLoginInput({ username: ' ana ', password: '' }, 'att-2'))

    expect(a1.status).toBe('invalid')
    expect(a2.status).toBe('invalid')
    if (a1.status !== 'invalid' || a2.status !== 'invalid') return
    expect(a1.attemptId).toBe('att-1')
    expect(a2.attemptId).toBe('att-2')
    expect(a1.attemptId).not.toBe(a2.attemptId)
    expect(a1.username).toBe(' ana ')
    expect(a2.username).toBe(' ana ')
  })
})

describe('resolveNextDestination (sin open redirect)', () => {
  it('un destino interno valido manda', () => {
    expect(resolveNextDestination('/pedidos')).toBe('/pedidos')
    expect(resolveNextDestination('/')).toBe('/')
    expect(resolveNextDestination('/ruta/con espacios')).toBe('/ruta/con espacios')
  })

  it('esquema, autoridad, backslash, control y ausencia de slash caen al respaldo', () => {
    expect(resolveNextDestination(null)).toBe(DASHBOARD_ROUTE)
    expect(resolveNextDestination(undefined)).toBe(DASHBOARD_ROUTE)
    expect(resolveNextDestination('dashboard')).toBe(DASHBOARD_ROUTE)
    expect(resolveNextDestination('https://evil.com')).toBe(DASHBOARD_ROUTE)
    expect(resolveNextDestination('//evil.com/x')).toBe(DASHBOARD_ROUTE)
    expect(resolveNextDestination('/\\evil.com')).toBe(DASHBOARD_ROUTE)
    expect(resolveNextDestination('javascript:alert(1)')).toBe(DASHBOARD_ROUTE)
    expect(resolveNextDestination('mailto:a@b.c')).toBe(DASHBOARD_ROUTE)
    expect(resolveNextDestination('/con\u0000trol')).toBe(DASHBOARD_ROUTE)
    expect(resolveNextDestination('/con\u001ftrol')).toBe(DASHBOARD_ROUTE)
  })
})