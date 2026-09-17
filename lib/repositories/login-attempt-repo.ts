// Registrador de intentos (design.md §4, §7, §9, §10; T12): unico camino de escritura
// sobre la cuenta (CAS del fallo y set del exito) y sobre el rastro (R24). Nunca toca
// contrasena, hash ni valor de sesion (R13 — el tipo del registro ni siquiera los admite).
import { PrismaClient } from "../generated/prisma/client";
import type { AccountStatusRaw } from "../interfaces/repositories/i-user-credentials-reader";
import type {
  CasSiguiente,
  ILoginAttemptRecorder,
  LoginAttemptRecord,
} from "../interfaces/repositories/i-login-attempt-recorder";

export class LoginAttemptRepo implements ILoginAttemptRecorder {
  constructor(private readonly db: PrismaClient) {}

  // CAS del fallo (design.md §7, invariantes 5, 6 y 12): updateMany cuyo predicado exige
  // contador esperado, estado esperado y plazo por RANGO (locked_until IS NULL OR
  // locked_until <= ahora — NUNCA por igualdad con el reloj). Devuelve si afecto filas:
  // false = perdio la carrera, el servicio relee y reintenta.
  async compareAndSet(
    id: string,
    esperado: number,
    siguiente: CasSiguiente,
    ahora: Date,
    estadoEsperado: AccountStatusRaw,
    estadoNuevo: AccountStatusRaw | null,
  ): Promise<boolean> {
    const resultado = await this.db.user.updateMany({
      where: {
        id,
        failedLoginAttempts: esperado, // invariante 5: contador == esperado
        accountStatus: estadoEsperado,
        // invariante 6: el plazo se compara por rango, no por igualdad
        OR: [{ lockedUntil: null }, { lockedUntil: { lte: ahora } }],
      },
      data: {
        // los tres campos SIEMPRE se escriben; lockedUntil: null aqui significa LIMPIAR la
        // columna (design.md §7) — distinto de estadoNuevo de abajo.
        failedLoginAttempts: siguiente.failedLoginAttempts,
        lockLevel: siguiente.lockLevel,
        lockedUntil: siguiente.lockedUntil,
        // invariante 12: estadoNuevo null = NO incluir la columna account_status
        ...(estadoNuevo !== null ? { accountStatus: estadoNuevo } : {}),
      },
    });
    return resultado.count > 0;
  }

  // Reset del exito (R20): INCONDICIONAL — `estado` (lo leido) es informativo y no
  // participa del predicado. Contador, nivel y bloqueo a cero, estado a `estadoNuevo`
  // (null = no tocar la columna, invariante 12).
  async set(
    id: string,
    _estado: AccountStatusRaw,
    estadoNuevo: AccountStatusRaw | null,
  ): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockLevel: 0,
        lockedUntil: null,
        ...(estadoNuevo !== null ? { accountStatus: estadoNuevo } : {}),
      },
    });
  }

  // Rastro best-effort (design.md §9): el INSERT jamas rompe el login — un fallo de
  // auditoria se traga (solo queda documentado que se trago). R13 por tipo: el registro
  // no lleva contrasena, hash ni valor de sesion.
  async recordAttempt(registro: LoginAttemptRecord): Promise<void> {
    try {
      await this.db.loginAttempt.create({
        data: {
          username: registro.username,
          outcome: registro.outcome,
          annotationFailed: registro.annotationFailed,
          companyId: registro.companyId ?? undefined,
          userId: registro.userId ?? undefined,
          ipAddress: registro.ipAddress ?? undefined,
          userAgent: registro.userAgent ?? undefined,
        },
      });
    } catch {
      // Best-effort deliberado (design.md §9): se traga el fallo del rastro; el desenlace
      // del intento lo decide el dominio, nunca la auditoria.
    }
  }
}