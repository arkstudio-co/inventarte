// Borde del login (design.md §11): esquema zod, estado del formulario, aterrizaje.
// Nada de esto toca la base ni el framework: es la forma que la Server Action (T15)
// y el servicio consumen.
import { z } from "zod";
import {
  CREDENTIAL_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
} from "./identity-constants";
import {
  LOGIN_COPY_CREDENTIALS_INVALID,
  LOGIN_COPY_FIELD_REQUIRED,
  loginCopyFieldTooLong,
  loginCopyPasswordTooLong,
} from "./login-copy";

// Destino por defecto tras autenticar (design.md §12): provisional hasta que exista la
// ruta real del producto. Nunca se redirige a un destino externo (§11).
export const DASHBOARD_ROUTE = "/dashboard";

// Esquema de credenciales (R3, R6):
// - username: se TRIMEA en el borde y se acota con la constante compartida con el alta.
// - password: SIN trim, sin normalizar, sin recortar (R3: se verifica exacta); tope propio 64.
export const loginInputSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, LOGIN_COPY_FIELD_REQUIRED)
    .max(USERNAME_MAX_LENGTH, loginCopyFieldTooLong(USERNAME_MAX_LENGTH)),
  password: z
    .string()
    .min(1, LOGIN_COPY_FIELD_REQUIRED)
    .max(CREDENTIAL_MAX_LENGTH, loginCopyPasswordTooLong(CREDENTIAL_MAX_LENGTH)),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export type LoginFieldErrors = Partial<Record<"username" | "password", string>>;

// Invariante 15 (design.md §11): union discriminada SIN campo de contrasena — el tipo lo
// garantiza (test de borde T7 con negativo de compilacion). `attemptId` solo en los dos
// estados de FALLO: distingue un resultado nuevo del re-render de useActionState. Sin
// estado de exito: el exito redirige y no devuelve estado.
export type LoginFormState =
  | { status: "idle" }
  | {
      status: "invalid";
      attemptId: string;
      username: string;
      fieldErrors: LoginFieldErrors;
    }
  | { status: "error"; attemptId: string; username: string; message: string };

export const LOGIN_INITIAL_STATE: LoginFormState = { status: "idle" };

// R3: el identificador se compara sin distinguir mayusculas ni espacios al inicio/final.
// Compartido con el indice funcional `lower(username)` (R27): el servicio normaliza con
// esta misma funcion antes de consultar.
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function loginFormInvalid(
  attemptId: string,
  username: string,
  fieldErrors: LoginFieldErrors,
): LoginFormState {
  return { status: "invalid", attemptId, username, fieldErrors };
}

export function loginFormError(
  attemptId: string,
  username: string,
  message: string,
): LoginFormState {
  return { status: "error", attemptId, username, message };
}

// R2: todo rechazo de autenticacion muestra la MISMA constante congelada. La Server Action
// usa esta funcion; el mensaje no puede divergir entre caminos de rechazo.
export function loginFormRejected(attemptId: string, username: string): LoginFormState {
  return loginFormError(attemptId, username, LOGIN_COPY_CREDENTIALS_INVALID);
}

// Valida la entrada cruda del formulario (R6): en el borde, sin base y sin hasher.
// Devuelve los errores POR CAMPO y conserva el username escrito para el re-render.
export function parseLoginInput(
  raw: unknown,
  attemptId: string,
): { ok: true; data: LoginInput } | { ok: false; state: LoginFormState } {
  const result = loginInputSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const candidate = raw as { username?: unknown } | null;
  const typedUsername =
    typeof candidate?.username === "string" ? candidate.username : "";
  const flat = result.error.flatten().fieldErrors;
  const fieldErrors: LoginFieldErrors = {};
  if (flat.username?.[0]) fieldErrors.username = flat.username[0];
  if (flat.password?.[0]) fieldErrors.password = flat.password[0];
  return {
    ok: false,
    state: loginFormInvalid(attemptId, typedUsername, fieldErrors),
  };
}

// Aterrizaje (design.md §11): `next` es entrada externa y se REVALIDA en servidor. Solo
// cuentan las rutas internas: empieza por `/` simple, sin autoridad, sin host, sin esquema,
// sin `//host`, sin `javascript:` y sin caracteres de control. Cualquier otra cosa cae al
// respaldo (DASHBOARD_ROUTE). Nunca un redirect a destino externo.
export function resolveNextDestination(
  next: string | null | undefined,
): string {
  if (typeof next !== "string") return DASHBOARD_ROUTE;
  if (!next.startsWith("/")) return DASHBOARD_ROUTE;
  if (next.startsWith("//") || next.startsWith("/\\")) return DASHBOARD_ROUTE;
  for (const ch of next) {
    if (ch.charCodeAt(0) < 0x20) return DASHBOARD_ROUTE;
  }
  return next;
}