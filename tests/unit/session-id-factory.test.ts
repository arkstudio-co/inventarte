import { describe, expect, it } from "vitest";
import { crearSessionIdFactory } from "../../lib/services/login/session-id-factory";

describe("SessionIdFactory (T9)", () => {
  it("R14: ids nuevos, distintos y no derivados de nada (sin parametros)", () => {
    const factory = crearSessionIdFactory();
    const a = factory.newSessionId();
    const b = factory.newSessionId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("genera un UUID v4 (forma estandar)", () => {
    const factory = crearSessionIdFactory();
    const id = factory.newSessionId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("dos fabricas distintas no colisionan (fuente de azar compartida)", () => {
    const f1 = crearSessionIdFactory();
    const f2 = crearSessionIdFactory();
    expect(f1.newSessionId()).not.toBe(f2.newSessionId());
  });
});