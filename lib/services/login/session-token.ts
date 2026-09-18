// Codec de sesion (design.md §6; T10): firma y verificacion del ticket "qcl_session".
//
// Formato: `v1.<payloadBase64Url>.<hmacBase64Url>` — el HMAC cubre el prefijo "v1."
// + payload tal cual viaja en el token (ni mas ni menos).
//
// - Algoritmo: HMAC-SHA-256 via WebCrypto (`crypto.subtle`), disponible en servidor y en
//   borde; NO importa de `next/*` (edge-ready en el sentido del spec).
// - Comparacion de firmas en tiempo constante con `crypto.timingSafeEqual`.
// - Claims { sub, iat, exp, role, cid, sid }: solo identificadores (R10); `exp` = `iat` +
//   8 h, absoluta, viaja FIRMADA (R9). `role` es el conjunto cerrado de R26.
// - Secreto `SESSION_SECRET` minimo 32 caracteres, LEIDO EN LA LLAMADA (no al cargar el
//   modulo): el puerto lo recibe por parametro (lo inyecta la composicion).
// - fail-closed (R11): sin secreto valido no se emite token; una version distinta de `v1`
//   se rechaza SIN verificar firma ni interpretar payload.
import { timingSafeEqual } from "node:crypto";
import type { RoleName } from "../../interfaces/repositories/i-user-credentials-reader";

export const SESSION_TOKEN_VERSION = "v1";
export const SESSION_TOKEN_TTL_MINUTES = 8 * 60; // R9: expira a las 8 h.
export const SESSION_TOKEN_MIN_SECRET_LENGTH = 32; // R11: secreto minimo.

const ROLES_VALIDOS: readonly RoleName[] = ["admin_maestro", "admin"]; // R26 (decision 5).

export interface SessionClaims {
  sub: string; // id de usuario
  iat: number; // segundos Unix
  exp: number; // segundos Unix
  role: RoleName;
  cid: string; // id de la empresa (invariante 10)
  sid: string; // id de ESTA sesion (R14)
}

export interface SessionTicketInput {
  sub: string;
  role: RoleName;
  cid: string;
  sid: string;
}

function validarSecreto(secreto: unknown): asserts secreto is string {
  // R11: se valida en la llamada; un secreto ausente o corto hace fallar la EMISION y la
  // VERIFICACION (fail-closed). El mensaje nombra la variable sin filtrar el valor.
  if (typeof secreto !== "string" || secreto.length < SESSION_TOKEN_MIN_SECRET_LENGTH) {
    throw new Error(
      "SESSION_SECRET no esta configurado o es menor a 32 caracteres: no se emite ni se verifica ninguna sesion",
    );
  }
}

export async function crearToken(
  ticket: SessionTicketInput,
  secreto: string,
  ahora: Date = new Date(),
): Promise<string> {
  validarSecreto(secreto);
  if (!ROLES_VALIDOS.includes(ticket.role)) {
    // fail-closed: un rol fuera del conjunto cerrado (R26) jamas entra a un ticket.
    throw new Error(`role invalido para el ticket de sesion: "${ticket.role}"`);
  }

  const iat = Math.floor(ahora.getTime() / 1000);
  const exp = iat + SESSION_TOKEN_TTL_MINUTES * 60;
  const claims: SessionClaims = {
    sub: ticket.sub,
    iat,
    exp,
    role: ticket.role,
    cid: ticket.cid,
    sid: ticket.sid,
  };

  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const prefijo = `${SESSION_TOKEN_VERSION}.${payload}`;
  const firma = await firmar(prefijo, secreto);
  return `${prefijo}.${firma}`;
}

export async function verificarToken(
  token: string,
  secreto: string,
  ahora: Date = new Date(),
): Promise<SessionClaims | null> {
  validarSecreto(secreto);

  if (typeof token !== "string" || token.length === 0) return null;
  // La version se rechaza sin verificar firma ni interpretar el payload: un valor que no
  // empiece por `v1.` ni siquiera se firma. (no hay back-compat: sin ventana de convivencia)
  if (!token.startsWith(`${SESSION_TOKEN_VERSION}.`)) return null;

  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [version, payloadB64, firmaB64] = partes;
  if (version !== SESSION_TOKEN_VERSION) return null;

  // tiempo constante: se recalcula la firma esperada sobre el prefijo TAL CUAL viaja y se
  // compara con timingSafeEqual (design.md §6); a longitudes distintas -> no coincide.
  const firmaEsperada = await calcularFirma(`${version}.${payloadB64}`, secreto);
  const firmaRecibida = base64UrlDecode(firmaB64);
  if (firmaRecibida.length !== firmaEsperada.length) return null;
  if (!timingSafeEqual(firmaRecibida, firmaEsperada)) return null;

  let obj: unknown;
  try {
    const json = new TextDecoder().decode(base64UrlDecode(payloadB64));
    obj = JSON.parse(json);
  } catch {
    return null; // payload corrupto o que no es JSON: rechazo sin excepcion.
  }
  return validarClaims(obj, Math.floor(ahora.getTime() / 1000));
}

// --- helpers ---------------------------------------------------------------------------

async function firmar(datos: string, secreto: string): Promise<string> {
  return calcularFirma(datos, secreto).then((firma) =>
    base64UrlEncode(firma),
  );
}

async function calcularFirma(datos: string, secreto: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("HMAC", key, enc.encode(datos));
  return new Uint8Array(firma);
}

function validarClaims(obj: unknown, ahoraSec: number): SessionClaims | null {
  if (typeof obj !== "object" || obj === null) return null;
  const c = obj as Record<string, unknown>;

  const sub = c.sub;
  const iat = c.iat;
  const exp = c.exp;
  const role = c.role;
  const cid = c.cid;
  const sid = c.sid;

  const esTextoNoVacio = (v: unknown): v is string =>
    typeof v === "string" && v.length > 0;
  const esSegundo = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v);

  if (!esTextoNoVacio(sub)) return null;
  if (!esSegundo(iat)) return null;
  if (!esSegundo(exp)) return null;
  if (!esTextoNoVacio(cid)) return null;
  if (!esTextoNoVacio(sid)) return null;
  if (typeof role !== "string" || !ROLES_VALIDOS.includes(role as RoleName)) return null;
  if (exp <= iat) return null; // caducidad anterior a la emision: malformado.
  if (ahoraSec >= exp) return null; // expirado (R9): el fin de la vigencia no incluye exp.

  return { sub, iat, exp, role: role as RoleName, cid, sid };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(texto: string): Uint8Array {
  // Restaura padding y el alfabeto estandar; si el texto no es base64url valido, atob
  // lanza y el llamador lo trata como rechazo (nunca como excepcion).
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(texto.length / 4) * 4,
    "=",
  );
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}