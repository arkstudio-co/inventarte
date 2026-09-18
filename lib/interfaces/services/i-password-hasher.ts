// Puerto 2: hasher de contrasenas (design.md §4, §5, §8). Fail-closed (decision 4):
// `verify` NUNCA lanza por hash vacio, mal formado o corrupto — devuelve false. El dominio
// no tiene fuente de azar propia: un solo hasher compartido en todo el repo (R29).
export interface IPasswordHasher {
  hash(texto: string): Promise<string>;

  // verdadero SOLO si texto corresponde al hash guardado; ante hash invalido -> false.
  verify(texto: string, hashGuardado: string): Promise<boolean>;

  // R4/R5 (design.md §8): el hash señuelo lo crea el HASHEADOR con el mismo mecanismo y
  // coste de los de produccion, UNA sola vez por proceso, cacheando la promesa (dos
  // intentos concurrentes reutilizan el mismo calculo). La composicion (T13) lo calienta.
  // Firmas del §4 ampliadas por R4/R5, igual que recordAttempt lo fue por R24.
  getDecoyHash(): Promise<string>;
}