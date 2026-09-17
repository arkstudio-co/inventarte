import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { RoleName } from "../../lib/interfaces/repositories/i-user-credentials-reader";
import {
  crearToken,
  SESSION_TOKEN_MIN_SECRET_LENGTH,
  SESSION_TOKEN_TTL_MINUTES,
  SESSION_TOKEN_VERSION,
  verificarToken,
  type SessionClaims,
  type SessionTicketInput,
} from "../../lib/services/login/session-token";

const SECRETO = "x".repeat(SESSION_TOKEN_MIN_SECRET_LENGTH);
const AHORA = new Date("2026-09-16T12:00:00Z");
const TICKET: SessionTicketInput = { sub: "u-1", role: "admin", cid: "c-1", sid: "s-1" };

describe("session-token (T10)", () => {
  it("crea tokens con el formato v1.<payload>.<firma> (design.md §6)", async () => {
    const token = await crearToken(TICKET, SECRETO, AHORA);
    expect(token).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifica y devuelve las claims {sub, iat, exp, role, cid, sid} (R10)", async () => {
    const token = await crearToken(TICKET, SECRETO, AHORA);
    const claims = await verificarToken(token, SECRETO, AHORA);
    const iat = Math.floor(AHORA.getTime() / 1000);
    expect(claims).toEqual<SessionClaims>({
      sub: TICKET.sub,
      iat,
      exp: iat + SESSION_TOKEN_TTL_MINUTES * 60,
      role: TICKET.role,
      cid: TICKET.cid,
      sid: TICKET.sid,
    });
  });

  it("R9: exp = iat + 8 horas, absoluta, viaja firmada", async () => {
    const token = await crearToken(TICKET, SECRETO, AHORA);
    const claims = await verificarToken(token, SECRETO, AHORA);
    expect(claims).not.toBeNull();
    expect(claims!.exp - claims!.iat).toBe(SESSION_TOKEN_TTL_MINUTES * 60);
  });

  it("rechaza una firma alterada (cualquier byte distinto no verifica)", async () => {
    const token = await crearToken(TICKET, SECRETO, AHORA);
    const [v, p, f] = token.split(".");
    const alterada = f.charAt(0) === "a" ? `b${f.slice(1)}` : `a${f.slice(1)}`;
    expect(await verificarToken(`${v}.${p}.${alterada}`, SECRETO)).toBeNull();
  });

  it("rechaza un payload alterado (la firma ya no cubre el valor intacto)", async () => {
    const token = await crearToken(TICKET, SECRETO, AHORA);
    const [v, p, f] = token.split(".");
    const tocado = p.charAt(0) === "A" ? `B${p.slice(1)}` : `A${p.slice(1)}`;
    expect(await verificarToken(`${v}.${tocado}.${f}`, SECRETO)).toBeNull();
  });

  it("rechaza una version distinta de v1 SIN verificar firma (sin back-compat)", async () => {
    const token = await crearToken(TICKET, SECRETO, AHORA);
    const partes = token.split(".");
    // v0. y v2. con firma "intacta": se rechazan por version, antes de tocar la firma.
    expect(await verificarToken(`v0.${partes[1]}.${partes[2]}`, SECRETO)).toBeNull();
    expect(await verificarToken(`v2.${partes[1]}.${partes[2]}`, SECRETO)).toBeNull();
  });

  it("rechaza tokens sin prefijo de version o mal formados", async () => {
    expect(await verificarToken("", SECRETO)).toBeNull();
    expect(await verificarToken("payload.firma", SECRETO)).toBeNull();
    expect(await verificarToken(`v1..${"a".repeat(43)}`, SECRETO)).toBeNull();
    expect(await verificarToken("v1.uno.dos.tres", SECRETO)).toBeNull();
  });

  it("R9: rechaza un token expirado (al llegar a exp termina la vigencia)", async () => {
    const token = await crearToken(TICKET, SECRETO, AHORA);
    const expMs = (Math.floor(AHORA.getTime() / 1000) + SESSION_TOKEN_TTL_MINUTES * 60) * 1000;
    // En el segundo exp exacto: vencido.
    expect(await verificarToken(token, SECRETO, new Date(expMs))).toBeNull();
    // Un segundo antes: vigente.
    expect(await verificarToken(token, SECRETO, new Date(expMs - 1000))).not.toBeNull();
  });

  it("R11: secreto ausente o corto hace fallar emision y verificacion (fail-closed)", async () => {
    await expect(crearToken(TICKET, "", AHORA)).rejects.toThrow(/SESSION_SECRET/);
    await expect(crearToken(TICKET, "corto", AHORA)).rejects.toThrow(/SESSION_SECRET/);
    await expect(verificarToken("v1.a.b", "", AHORA)).rejects.toThrow(/SESSION_SECRET/);
    await expect(verificarToken("v1.a.b", "corto", AHORA)).rejects.toThrow(/SESSION_SECRET/);
  });

  it("R26: un rol fuera del conjunto cerrado jamas entra al ticket", async () => {
    const invalido: SessionTicketInput = {
      ...TICKET,
      role: "superadmin" as unknown as RoleName,
    };
    await expect(crearToken(invalido, SECRETO, AHORA)).rejects.toThrow(/role/);
  });

  it("rechaza un payload que no es JSON aun con firma correcta (payload corrupto)", async () => {
    const payload = Buffer.from("no-soy-json", "utf8").toString("base64url");
    const prefijo = `${SESSION_TOKEN_VERSION}.${payload}`;
    const firma = createHmac("sha256", SECRETO).update(prefijo, "utf8").digest("base64url");
    expect(await verificarToken(`${prefijo}.${firma}`, SECRETO)).toBeNull();
  });

  it("rechaza claims con campos faltantes o con formas invalidas", async () => {
    // sub vacio (el resto bien formado y firmado): rechazado por estructura.
    const payload = Buffer.from(
      JSON.stringify({ sub: "", iat: 1, exp: 28801, role: "admin", cid: "c", sid: "s" }),
      "utf8",
    ).toString("base64url");
    const prefijo = `${SESSION_TOKEN_VERSION}.${payload}`;
    const firma = createHmac("sha256", SECRETO).update(prefijo, "utf8").digest("base64url");
    expect(await verificarToken(`${prefijo}.${firma}`, SECRETO)).toBeNull();
  });

  it("dos tickets distintos producen tokens distintos (y verifican solo el suyo)", async () => {
    const otro: SessionTicketInput = { sub: "u-2", role: "admin_maestro", cid: "c-2", sid: "s-2" };
    const t1 = await crearToken(TICKET, SECRETO, AHORA);
    const t2 = await crearToken(otro, SECRETO, AHORA);
    expect(t1).not.toBe(t2);
    const claims = await verificarToken(t2, SECRETO, AHORA);
    expect(claims!.sid).toBe("s-2");
    expect(claims!.role).toBe("admin_maestro");
  });
});