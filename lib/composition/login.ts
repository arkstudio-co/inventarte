// Punto UNICO de composicion del login (design.md §4; R22): el unico archivo que importa
// adaptadores concretos (lib/repositories/*, lib/services/login/*). El caso de uso se
// construye con puertos y la Server Action (T15) se compone SOLO desde aqui.
//
// Decision 1: parseo de entorno fail-fast AL ARRANCAR — un valor invalido lanza; la app
// no arranca mal configurada. R4/R5: el señuelo se calienta al arrancar.
import { cookies } from "next/headers";
import { PrismaClient } from "../generated/prisma/client";
import type { LoginInput } from "../types/login";
import type { LockPolicy } from "../services/login/account-lock-policy";
import { PasswordHasher } from "../services/login/password-hasher";
import { crearSessionIdFactory } from "../services/login/session-id-factory";
import { crearSessionStarter, type CookieAtributos } from "../services/login/session-starter";
import {
  verifyCredentials as verificarCredenciales,
  type VerifyCredentialsContext,
} from "../services/login/verify-credentials-service";
import { LoginAttemptRepo } from "../repositories/login-attempt-repo";
import { UserCredentialsRepo } from "../repositories/user-credentials-repo";

// Valores por defecto (design.md §7): 5 fallos y duraciones 1, 5, 15, 60 minutos.
export const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
export const DEFAULT_LOCK_MINUTES: readonly number[] = [1, 5, 15, 60];

export interface LockPolicyEnv {
  LOGIN_MAX_FAILED_ATTEMPTS?: string | undefined;
  LOGIN_LOCK_MINUTES?: string | undefined;
}

// Decision 1: el entorno se parsea al arrancar; valor invalido -> throw (fail-fast).
export function parseLockPolicy(env: LockPolicyEnv): LockPolicy {
  const maxTexto = env.LOGIN_MAX_FAILED_ATTEMPTS?.trim();
  const minutosTexto = env.LOGIN_LOCK_MINUTES?.trim();
  const max =
    maxTexto === undefined || maxTexto === ""
      ? DEFAULT_MAX_FAILED_ATTEMPTS
      : parseIntMax(maxTexto);
  const minutos =
    minutosTexto === undefined || minutosTexto === ""
      ? DEFAULT_LOCK_MINUTES
      : parseIntLista(minutosTexto);
  return { maxFailedAttempts: max, lockDurationsMinutes: minutos };
}

function parseIntMax(texto: string): number {
  if (!/^\d+$/.test(texto)) {
    throw new Error(
      `LOGIN_MAX_FAILED_ATTEMPTS invalido: "${texto}" (esperaba un entero positivo)`,
    );
  }
  const valor = Number(texto);
  if (valor < 1) {
    throw new Error(`LOGIN_MAX_FAILED_ATTEMPTS invalido: "${texto}" (minimo 1)`);
  }
  return valor;
}

function parseIntLista(texto: string): readonly number[] {
  const partes = texto
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (partes.length === 0 || partes.some((p) => !/^\d+$/.test(p))) {
    throw new Error(
      `LOGIN_LOCK_MINUTES invalido: "${texto}" (esperaba enteros positivos separados por coma, p. ej. "1,5,15,60")`,
    );
  }
  const valores = partes.map(Number);
  if (valores.some((v) => v < 1)) {
    throw new Error(
      `LOGIN_LOCK_MINUTES invalido: "${texto}" (minimo 1 minuto por duracion)`,
    );
  }
  return valores;
}

// R4/R5: el señuelo se calienta al arrancar. La promesa se cachea por proceso; si el
// calculo fallara, el arranque no muere por un señuelo (la verificacion de verdad lo
// esperaria en el caso de uso y ahi si veria el fallo).
const hasher = new PasswordHasher();
void hasher.getDecoyHash().catch(() => undefined);

// Fail-fast al arrancar (decision 1): la app no arranca con una politica invalida.
// `process.env` se pasa campo a campo: su tipo (ProcessEnv) no es estructuralmente
// compatible con la interfaz del parser.
const lockPolicy = parseLockPolicy({
  LOGIN_MAX_FAILED_ATTEMPTS: process.env.LOGIN_MAX_FAILED_ATTEMPTS,
  LOGIN_LOCK_MINUTES: process.env.LOGIN_LOCK_MINUTES,
});

let contexto: VerifyCredentialsContext | null = null;

// BLOQUEO CONOCIDO (T0 item 2 -> T17): Prisma 7 con el generador `prisma-client` NO admite
// `new PrismaClient()` sin opciones — `PrismaClientOptions` es union de `{ adapter }` o
// `{ accelerateUrl }` y una de las dos es obligatoria. El adapter (`@prisma/adapter-pg`)
// no esta aprobado todavia en docs/dependencias.md, asi que no hay construccion valida.
// Se difiere con un error EXPLICITO (mejor que un cast que finja adapter) en vez de dejar
// un fallo opaco de runtime. T17 reemplaza el cuerpo de esta funcion por:
//   return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
function crearClientePrisma(): PrismaClient {
  throw new Error(
    "Prisma 7 requiere un driver adapter (@prisma/adapter-pg) o accelerateUrl; " +
      "ninguno esta aprobado aun (docs/dependencias.md) ni cableado (T17). " +
      "El login compila, pero no ejecuta contra base hasta entonces.",
  );
}

// El cliente se instancia PER-EZOSAMENTE: esta tanda no ejecuta contra base (los repos
// compilan y sus queries se prueban en T17).
function obtenerContexto(): VerifyCredentialsContext {
  if (contexto === null) {
    const db = crearClientePrisma();
    contexto = {
      reader: new UserCredentialsRepo(db),
      hasher,
      recorder: new LoginAttemptRepo(db),
      sessionStarter: crearSessionStarter({
        produccion: process.env.NODE_ENV === "production",
        leerSecret: () => process.env.SESSION_SECRET, // leido EN LA LLAMADA (design §6)
        escribirCookie: async (atributos: CookieAtributos) => {
          // R8: httpOnly + sameSite lax + path / + secure solo produccion, sin domain.
          const store = await cookies();
          store.set(atributos.name, atributos.value, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: atributos.secure,
          });
        },
      }),
      sessionIdFactory: crearSessionIdFactory(),
      clock: () => new Date(),
      lockPolicy,
    };
  }
  return contexto;
}

// Lo unico que el controller (T15) consume: el caso de uso compuesto.
export async function verifyCredentials(input: LoginInput): Promise<{ ok: boolean }> {
  return verificarCredenciales(input, obtenerContexto());
}