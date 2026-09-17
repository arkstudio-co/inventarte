// Puerto 1: lector de credenciales (design.md §4). Devuelve CRUDO, no cocina reglas:
// "activa" es regla de dominio (invariante 13), nunca del puerto. El filtro "no borrado"
// (deleted_at IS NULL) SI es del puerto: una cuenta borrada no se encuentra y el caso de
// uso toma el camino del usuario inexistente (§4, §12).
import type { z } from "zod";

// Conjunto cerrado del estado de cuenta (R28): una sola grafia, minuscula, la misma en
// esquema, codigo y base (CHECK del migration TI1).
export type AccountStatusRaw = "active" | "pending" | "inactive" | "blocked";

// Conjunto cerrado de roles (decision 5, R26): lo que el ticket de sesion puede llevar.
export type RoleName = "admin_maestro" | "admin";

// Valor que el puerto devuelve por username. Solo lo que sale de la base: ni correo, ni
// documento, ni nombre — lo que no sale de la base no se puede filtrar por error en un
// registro (§4).
export interface AuthenticatableUser {
  id: string;
  passwordHash: string;
  failedLoginAttempts: number;
  lockLevel: number;
  lockedUntil: Date | null;
  accountStatus: AccountStatusRaw;
  roleName: RoleName;
  companyId: string;
  companyDeleted: boolean;
}

export interface IUserCredentialsReader {
  // username ya normalizado por el caso de uso (trim + minusculas, R3); el lector no
  // desambigua por empresa: la unicidad es global (R27) — fila unica o ninguna.
  findActiveByUsername(username: string): Promise<AuthenticatableUser | null>;
}