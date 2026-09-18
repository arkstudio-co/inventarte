// Politica de bloqueo PURA (design.md §7, R15-R20): calcula la escalada de un fallo de
// contrasena y el reset de un exito. Funciones sin efectos: el reloj (`now`) y la politica
// (`LockPolicy`) entran por parametro — el caso de uso las pasa (invariantes 3 y 7: la
// escalada la decide SIEMPRE el dominio, tambien tras perder la carrera del CAS).
import type { AccountStatusRaw } from "../../interfaces/repositories/i-user-credentials-reader";
import type { CasSiguiente } from "../../interfaces/repositories/i-login-attempt-recorder";

// Value object que la composicion construye desde el entorno (T13, decision 1). Valores
// por defecto (design.md §7): 5 fallos y duraciones 1, 5, 15, 60 minutos.
export interface LockPolicy {
  maxFailedAttempts: number;
  lockDurationsMinutes: readonly number[];
}

export interface AccountLockState {
  failedLoginAttempts: number;
  lockLevel: number;
  lockedUntil: Date | null;
  accountStatus: AccountStatusRaw;
}

export interface FailureEscalation {
  // Valores a escribir en el CAS: SIEMPRE se escriben (lockedUntil: null = limpiar).
  siguiente: CasSiguiente;
  // Estado a escribir en account_status; null = no tocar esa columna (invariante 12).
  estadoNuevo: AccountStatusRaw | null;
  // Consumido por el caso de uso para decidir el cite del rastro.
  locked: boolean;
}

const MINUTOS = 60_000;

export function nextFailureState(
  current: AccountLockState,
  now: Date,
  policy: LockPolicy,
): FailureEscalation {
  // R18: un fallo estando bloqueada (plazo vigente) devuelve el estado INTACTO: ni suma
  // contador, ni sube nivel, ni alarga el plazo. (El caso de uso ya corto antes por el
  // estado efectivo; la funcion lo garantiza tambien como contrato puro.)
  if (
    current.accountStatus === "blocked" &&
    current.lockedUntil !== null &&
    current.lockedUntil > now
  ) {
    return {
      siguiente: {
        failedLoginAttempts: current.failedLoginAttempts,
        lockLevel: current.lockLevel,
        lockedUntil: current.lockedUntil,
      },
      estadoNuevo: null,
      locked: true,
    };
  }

  const siguienteContador = current.failedLoginAttempts + 1;

  // R15: el quinto fallo consecutivo (maxFailedAttempts, por defecto 5) bloquea y
  // REINICIA el contador. R16: la duracion sube por nivel (1/5/15/60) y se mantiene el
  // ultimo como tope — el nivel se CAPS en la longitud del arreglo (nunca permanente).
  if (siguienteContador >= policy.maxFailedAttempts) {
    const nivel = Math.min(
      current.lockLevel + 1,
      policy.lockDurationsMinutes.length,
    );
    return {
      siguiente: {
        failedLoginAttempts: 0,
        lockLevel: nivel,
        lockedUntil: addMinutes(now, policy.lockDurationsMinutes[nivel - 1]),
      },
      estadoNuevo: "blocked",
      locked: true,
    };
  }

  // Aun no bloquea: solo sube el contador, el nivel NO decae pero tampoco sube hasta el
  // bloqueo, y se LIMPIA un plazo caducado que pudiera quedar de un bloqueo anterior
  // (no se alarga nada; R18 solo rige con bloqueo vigente).
  return {
    siguiente: {
      failedLoginAttempts: siguienteContador,
      lockLevel: current.lockLevel,
      lockedUntil: null,
    },
    estadoNuevo: null,
    locked: false,
  };
}

// R20: un exito deja contador, nivel y bloqueo a cero, y el estado a active. Es lo que el
// `set` del puerto escribe (incondicional); aqui vive la semantica del dominio.
export function successResetState(): {
  siguiente: CasSiguiente;
  estadoNuevo: "active";
} {
  return {
    siguiente: { failedLoginAttempts: 0, lockLevel: 0, lockedUntil: null },
    estadoNuevo: "active",
  };
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * MINUTOS);
}