// Lector de credenciales (design.md §4, §10; T12): SQL parametrizado via Prisma.sql.
//
// Invariante 14: los cortes de acceso NO van en el SQL — el filtro "no borrada"
// (deleted_at IS NULL) SI es del puerto: una cuenta borrada no se encuentra y el caso de
// uso toma el camino del usuario inexistente.
//
// Decision 6 / R27: la unicidad del identificador es GLOBAL (indice funcional y parcial
// `lower(username) WHERE deleted_at IS NULL` creado en TI1), asi que el lector devuelve la
// fila unica o `null`. NO existe `LIMIT 2` ni rama de ambiguedad.
import { Prisma, PrismaClient } from "../generated/prisma/client";
import type {
  AccountStatusRaw,
  AuthenticatableUser,
  IUserCredentialsReader,
  RoleName,
} from "../interfaces/repositories/i-user-credentials-reader";

// Forma cruda que devuelve Postgres: columnas reales (snake_case) + join. Las columnas
// tipadas de Prisma se desnormalizan a los tipos del puerto al mapear.
interface FilaLector {
  id: string;
  password_hash: string;
  failed_login_attempts: number;
  lock_level: number;
  locked_until: Date | null;
  account_status: string;
  role_name: string;
  company_id: string;
  company_deleted: boolean;
}

export class UserCredentialsRepo implements IUserCredentialsReader {
  constructor(private readonly db: PrismaClient) {}

  async findActiveByUsername(username: string): Promise<AuthenticatableUser | null> {
    // Parametrizado por Prisma.sql (nunca interpolacion de strings) y comparacion
    // case-insensitive con lower() = lower() — la misma expresion que cubre el indice
    // funcional de R27 (TI1). company_deleted = (c.deleted_at IS NOT NULL): el puerto
    // necesita saber si la org esta borrada para que el dominio decida (invariante 13).
    const filas = await this.db.$queryRaw<FilaLector[]>(Prisma.sql`
      SELECT u.id,
             u.password_hash,
             u.failed_login_attempts,
             u.lock_level,
             u.locked_until,
             u.account_status,
             r.name AS role_name,
             u.company_id,
             (c.deleted_at IS NOT NULL) AS company_deleted
      FROM users u
      JOIN roles r ON r.id = u.role_id
      JOIN companies c ON c.id = u.company_id
      WHERE lower(u.username) = lower(${username})
        AND u.deleted_at IS NULL
    `);

    // Decision 6: fila unica o ninguna. La unicidad global (R27) la garantiza el indice
    // parcial de TI1; aqui no hay LIMIT ni rama de ambiguedad que implementar.
    const fila = filas[0];
    if (fila === undefined) return null;

    return {
      id: fila.id,
      passwordHash: fila.password_hash,
      failedLoginAttempts: fila.failed_login_attempts,
      lockLevel: fila.lock_level,
      lockedUntil: fila.locked_until,
      accountStatus: fila.account_status as AccountStatusRaw, // CHECK de TI1: conjunto cerrado (R28)
      roleName: fila.role_name as RoleName, // seed de TI2: conjunto cerrado (R26)
      companyId: fila.company_id,
      companyDeleted: fila.company_deleted,
    };
  }
}