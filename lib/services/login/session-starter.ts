// Escritor de sesion (design.md §4, §6; T11): parte PURA de la cookie de sesion +
// escritor inyectable. NO importa `next/headers` aqui: la composicion (T13) inyecta el
// escritor real con `cookies()` para que este modulo sea testeable en vitest (node) sin
// request scope, y no dependa de Next.
import type { ISessionStarter, SessionTicket } from "../../interfaces/services/i-session-starter";
import {
  crearToken,
  SESSION_TOKEN_MIN_SECRET_LENGTH,
} from "./session-token";

// Nombre provisional (design.md §12): "qcl_session". Atributos (R8): httpOnly, sameSite
// lax, path /, secure SOLO en produccion, SIN atributo domain.
export const SESSION_COOKIE_NAME = "qcl_session";

export interface CookieAtributos {
  name: string;
  value: string;
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
}

export interface SessionStarterEnv {
  produccion: boolean; // secure solo en produccion (R8)
  leerSecret: () => string | undefined; // SESSION_SECRET, leido EN LA LLAMADA (design §6)
  escribirCookie: (atributos: CookieAtributos) => Promise<void>;
  reloj: () => Date; // invariante 3: SIEMPRE inyectado por la composicion, nunca new Date() en el puerto
}

// Parte pura: los atributos que el navegador debe recibir. Separada del escritor para que
// los tests de atributos por entorno no necesiten request scope.
export function cookieDeSesion(token: string, produccion: boolean): CookieAtributos {
  const atributos: CookieAtributos = {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: produccion,
  };
  return atributos;
}

export function crearSessionStarter(env: SessionStarterEnv): ISessionStarter {
  return {
    async startSession(ticket: SessionTicket): Promise<void> {
      // R11 (design §6): el secreto se lee EN LA LLAMADA y si no esta configurado (o es
      // corto) la emision LANZA — la excepcion se PROPAGA (invariante 9), el caso de uso
      // no la atrapa. Sin secreto valido no hay cookie de sesion.
      const secreto = env.leerSecret();
      if (typeof secreto !== "string" || secreto.length < SESSION_TOKEN_MIN_SECRET_LENGTH) {
        throw new Error(
          "SESSION_SECRET no esta configurado o es menor a 32 caracteres: no se emite cookie de sesion",
        );
      }

      // Invariante 10 en adelante: el ticket del dominio (sub/roleName/companyId/sid) se
      // convierte al payload del token; las claims viajan firmadas con exp = iat + 8 h (R9).
      // Invariante 3: reloj SIEMPRE inyectado por la composicion; sin fallback.
      const token = await crearToken(
        {
          sub: ticket.sub,
          role: ticket.roleName,
          cid: ticket.companyId,
          sid: ticket.sid,
        },
        secreto,
        env.reloj(),
      );

      await env.escribirCookie(cookieDeSesion(token, env.produccion));
    },
  };
}