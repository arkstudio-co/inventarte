// Hasher de contrasenas (design.md §4, §5, §8; R29): unico hasher del repositorio.
// Fail-closed (decision 4): `verify` NUNCA lanza por hash vacio, mal formado o corrupto —
// devuelve false. No distingue "hash sentinela" de "hash real" por forma (R30): la unica
// frontera es el algoritmo, nunca la grafia del valor guardado.
import bcrypt from "bcryptjs";
import type { IPasswordHasher } from "../../interfaces/services/i-password-hasher";

// Decision 4: bcrypt con coste 10 (configurable por constructor; el defensor usa 10).
export const PASSWORD_HASHER_COSTE = 10;

// R4/R5 (design.md §8): la verificacion del señuelo debe costar lo mismo que una
// verificacion real: mismo mecanismo, mismo coste, mismo hasher. El texto es fijo: no
// importa cual sea, solo que jamas coincide con una contrasena real.
const DECOY_TEXT = "senuelo-de-login-inventarte-2026";

export class PasswordHasher implements IPasswordHasher {
  private readonly coste: number;
  private decoy: Promise<string> | null = null;

  constructor(coste: number = PASSWORD_HASHER_COSTE) {
    this.coste = coste;
  }

  hash(texto: string): Promise<string> {
    return bcrypt.hash(texto, this.coste);
  }

  async verify(texto: string, hashGuardado: string): Promise<boolean> {
    // Fail-closed: cualquier forma invalida (vacio, mal formado, corrupto) -> false. El
    // try/catch absorbe lo que bcryptjs puedan lanzar por un hash que no es suyo: el
    // rechazo es el MISMO para todas las formas, sin distinguir nada por fuera del hash.
    try {
      return await bcrypt.compare(texto, hashGuardado);
    } catch {
      return false;
    }
  }

  // R4/R5: el señuelo se calcula UNA vez por proceso con el mismo mecanismo y coste y se
  // cachea la PROMESA: dos intentos concurrentes reutilizan el mismo calculo. La
  // composicion (T13) lo calienta al arrancar.
  getDecoyHash(): Promise<string> {
    if (this.decoy === null) {
      this.decoy = bcrypt.hash(DECOY_TEXT, this.coste);
    }
    return this.decoy;
  }
}

// R29: NINGUN otro modulo implementa hashing propio ni importa bcrypt. Lo verifica el
// test estructural de capas (tests/unit/architecture-login.test.ts).