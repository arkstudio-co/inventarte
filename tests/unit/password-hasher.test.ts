import { describe, expect, it } from "vitest";
import { PasswordHasher } from "../../lib/services/login/password-hasher";

describe("PasswordHasher (T8)", () => {
  it("hashea con el coste configurado (por defecto 10; la grafia del hash lo expone)", async () => {
    const hasher = new PasswordHasher();
    const hash = await hasher.hash("clave-secreta-1");
    expect(hash).toMatch(/\$2[aby]\$10\$/);
  });

  it("verifica verdadero SOLO con la contrasena correcta", async () => {
    const hasher = new PasswordHasher();
    const hash = await hasher.hash("clave-secreta-1");
    expect(await hasher.verify("clave-secreta-1", hash)).toBe(true);
    expect(await hasher.verify("otra-clave", hash)).toBe(false);
  });

  it("verify es fail-closed con hash vacio, mal formado o corrupto (decision 4)", async () => {
    const hasher = new PasswordHasher();
    await expect(hasher.verify("x", "")).resolves.toBe(false);
    await expect(hasher.verify("x", "no-soy-un-hash-bcrypt")).resolves.toBe(false);
    await expect(hasher.verify("x", "$2b$10$muy-corto")).resolves.toBe(false);
  });

  it("R4/R5: la promesa del señuelo se cachea — dos llamadas concurrentes comparten el MISMO calculo", async () => {
    const hasher = new PasswordHasher();
    const primera = hasher.getDecoyHash();
    const segunda = hasher.getDecoyHash();
    // La misma referencia de promesa: el segundo llamador NO recalcula nada.
    expect(primera).toBe(segunda);
    const [h1, h2] = await Promise.all([primera, segunda]);
    expect(h1).toBe(h2);
  });

  it("R4/R5: el señuelo usa el mismo mecanismo y coste que los hashes reales", async () => {
    const hasher = new PasswordHasher();
    const decoy = await hasher.getDecoyHash();
    expect(decoy).toMatch(/\$2[aby]\$10\$/);
  });

  it("R4: el señuelo jamas autentica nada", async () => {
    const hasher = new PasswordHasher();
    const decoy = await hasher.getDecoyHash();
    expect(await hasher.verify("cualquier-texto", decoy)).toBe(false);
  });
});