import { describe, expect, it } from "vitest";
import type { SessionTicket } from "../../lib/interfaces/services/i-session-starter";
import {
  cookieDeSesion,
  crearSessionStarter,
  SESSION_COOKIE_NAME,
  type CookieAtributos,
} from "../../lib/services/login/session-starter";
import {
  SESSION_TOKEN_MIN_SECRET_LENGTH,
  verificarToken,
} from "../../lib/services/login/session-token";

const SECRETO = "x".repeat(SESSION_TOKEN_MIN_SECRET_LENGTH);
const AHORA = new Date("2026-09-16T12:00:00Z");
const TICKET: SessionTicket = { sub: "u-1", roleName: "admin", companyId: "c-1", sid: "s-1" };

describe("session-starter (T11)", () => {
  it("R8: la parte pura construye la cookie con httpOnly, sameSite lax, path / y sin domain", () => {
    const cookie = cookieDeSesion("el-token", false);
    expect(cookie).toEqual({
      name: SESSION_COOKIE_NAME,
      value: "el-token",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
    });
    expect(Object.keys(cookie)).not.toContain("domain");
  });

  it("R8: secure solo en produccion", () => {
    expect(cookieDeSesion("x", true).secure).toBe(true);
    expect(cookieDeSesion("x", false).secure).toBe(false);
  });

  it("startSession escribe la cookie de sesion con el token firmado (R9, R10)", async () => {
    const escritas: CookieAtributos[] = [];
    const starter = crearSessionStarter({
      produccion: false,
      leerSecret: () => SECRETO,
      escribirCookie: async (atributos) => {
        escritas.push(atributos);
      },
      reloj: () => AHORA,
    });

    await starter.startSession(TICKET);

    expect(escritas).toHaveLength(1);
    const cookie = escritas[0];
    expect(cookie.name).toBe(SESSION_COOKIE_NAME);
    expect(cookie.value).toMatch(/^v1\./);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(false);

    // El valor que viaja al navegador se verifica con el mismo secreto y lleva el sid
    // de la sesion (R14): la emision y el codec conviven sin desincronizarse.
    const claims = await verificarToken(cookie.value, SECRETO, AHORA);
    expect(claims).not.toBeNull();
    expect(claims!.sid).toBe(TICKET.sid);
    expect(claims!.sub).toBe(TICKET.sub);
  });

  it("R11: startSession LANZA si el secreto no esta configurado (fail-closed)", async () => {
    let escritas = 0;
    const starter = crearSessionStarter({
      produccion: false,
      leerSecret: () => undefined,
      escribirCookie: async () => {
        escritas++;
      },
      reloj: () => AHORA,
    });

    await expect(starter.startSession(TICKET)).rejects.toThrow(/SESSION_SECRET/);
    expect(escritas).toBe(0); // sin secreto valido no hay cookie (invariante 9/11)
  });

  it("R11: startSession LANZA si el secreto es menor al minimo", async () => {
    const starter = crearSessionStarter({
      produccion: false,
      leerSecret: () => "muy-corto",
      escribirCookie: async () => {},
      reloj: () => AHORA,
    });
    await expect(starter.startSession(TICKET)).rejects.toThrow(/SESSION_SECRET/);
  });
});