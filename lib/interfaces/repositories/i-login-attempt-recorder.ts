// Puerto 3 (en el orden de §4): registrador de intentos y escritor del bloqueo (design.md
// §4, §7, §9). Es el unico camino de escritura sobre la cuenta (CAS del fallo y set del
// exito) y sobre el rastro (R24).
import type { AccountStatusRaw } from "./i-user-credentials-reader";

// Conjunto cerrado de desenlaces del rastro — el CHECK de la migracion add_login_attempts
// (design.md §9): success | bad_credentials | unknown_user | account_blocked |
// account_not_active | org_inactive. `annotation_failed` NO es un outcome: es la columna
// booleana del registro (decision 3).
export type LoginAttemptOutcome =
  | "success"
  | "bad_credentials"
  | "unknown_user"
  | "account_blocked"
  | "account_not_active"
  | "org_inactive";

// Fila de auditoria (R24, R13): quien, cuando (la base pone attempted_at), desde donde
// (opcionales; esta tanda no los provee — quedan null), con que desenlace, y los vinculos
// a cuenta/organizacion cuando el intento resolvio a una. El tipo NO admite contrasena,
// hash ni valor de sesion (R13 garantizado por el tipo).
export interface LoginAttemptRecord {
  username: string; // el username normalizado recibido (R3)
  outcome: LoginAttemptOutcome;
  annotationFailed: boolean; // decision 3: el CAS se agoto sin poder anotar su fila
  companyId: string | null;
  userId: string | null;
  ipAddress?: string | null; // reservados: "desde donde" (R24) si el contexto los provee
  userAgent?: string | null;
}

// Valores a escribir en el CAS (design.md §7, invariante 12). A diferencia de
// `estadoNuevo` (donde null = NO incluir la columna), aquí los tres campos SIEMPRE se
// escriben: `lockedUntil: null` significa LIMPIAR la columna. El predicado por rango del
// plazo (invariante 6) valida el estado previo; el nivel y el plazo los calcula el dominio
// (invariante 7) y este objeto los transporta.
export interface CasSiguiente {
  failedLoginAttempts: number;
  lockLevel: number;
  lockedUntil: Date | null;
}

// El `set` del exito es INCONDICIONAL (R20): resetea las tres columnas y lleva el estado a
// `estadoNuevo`; `estado` (el estado leido) es informativo, no participa del predicado.
export interface ILoginAttemptRecorder {
  compareAndSet(
    id: string,
    esperado: number, // contador leido: el predicado exige contador == esperado (inv. 5)
    siguiente: CasSiguiente,
    ahora: Date, // reloj del caso de uso: predicado por RANGO del plazo (inv. 6)
    estadoEsperado: AccountStatusRaw, // exige el estado leido
    estadoNuevo: AccountStatusRaw | null, // null = no toques esa columna (inv. 12)
  ): Promise<boolean>; // false = perdio la carrera (0 filas afectadas)

  set(
    id: string,
    estado: AccountStatusRaw,
    estadoNuevo: AccountStatusRaw | null,
  ): Promise<void>;

  // Best-effort (design.md §9): el INSERT del rastro se traga, jamas rompe el login.
  recordAttempt(registro: LoginAttemptRecord): Promise<void>;
}