// Test estructural de la capa de login (T13): verifica por grep lo que en T17 no se
// puede verificar en runtime. Cada regla mapea directo a un requisito/spec:
//   R22   -> solo la composicion importa adaptadores concretos
//   R29   -> el paquete bcryptjs solo se IMPORTE desde password-hasher.ts (contencion de
//            la dependencia; las MENCIONES como dato — p. ej. la guardia de docs/
//            dependencias.md — no son uso y no se marcan)
//   firma -> las primitivas HMAC/timingSafeEqual/crypto.subtle solo se USAN en
//            session-token.ts (y en su harness de tests, que forja firmas a proposito)
//   "No implementar" -> must_change_password no existe en schema/migraciones/codigo
//   R30   -> mascaras de contrasena sin decodificacion de senales (falta de forma/longitud)
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

const DIR_SKIP = new Set(["generated", "node_modules", ".next"]);
const DIR_ADAPTADOR = [
  path.join(RAIZ, "lib/repositories"),
  path.join(RAIZ, "lib/services/login"),
];
const COMPOSICION_REL = "lib/composition/login.ts";
const HASHER_REL = "lib/services/login/password-hasher.ts";
const TOKEN_REL = "lib/services/login/session-token.ts";
const VERIFY_REL = "lib/services/login/verify-credentials-service.ts";
const TEST_TOKEN_REL = "tests/unit/session-token.test.ts";
// Este mismo archivo se cita a si mismo al nombrar las primitivas en comentarios y
// titulos: se excluye por construccion, no porque sea una zona de firma legitima.
const SELF_REL = "tests/unit/architecture-login.test.ts";

interface Archivo {
  ruta: string;
  rel: string; // normalizado SIEMPRE con "/" (portable Windows/POSIX)
  contenido: string;
}

function listarArchivos(dir: string): Archivo[] {
  if (!fs.existsSync(dir)) return [];
  const archivos: Archivo[] = [];
  const cola = [dir];
  while (cola.length > 0) {
    const actual = cola.pop()!;
    for (const entrada of fs.readdirSync(actual, { withFileTypes: true })) {
      const ruta = path.join(actual, entrada.name);
      if (entrada.isDirectory()) {
        if (!DIR_SKIP.has(entrada.name)) cola.push(ruta);
      } else if (ruta.endsWith(".ts") || ruta.endsWith(".tsx")) {
        archivos.push({
          ruta,
          rel: path.relative(RAIZ, ruta).split(path.sep).join("/"),
          contenido: fs.readFileSync(ruta, "utf8"),
        });
      }
    }
  }
  return archivos;
}

const IMPORT_RE = /(?:from\s+["']([^"']+)["'])|(?:import\s*\(\s*["']([^"']+)["']\s*\))/g;

function especuladores(f: Archivo): string[] {
  return [...new Set([...f.contenido.matchAll(IMPORT_RE)].map((m) => m[1] ?? m[2]).filter((s): s is string => s !== undefined))];
}

function resolver(spec: string, desde: Archivo): string | null {
  let base: string;
  if (spec.startsWith("lib/")) base = path.join(RAIZ, spec);
  else if (spec.startsWith("@/")) base = path.join(RAIZ, spec.slice(3));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(desde.ruta), spec);
  else return null; // paquete externo o dinamico: fuera de alcance

  for (const candidato of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(candidato) && fs.statSync(candidato).isFile()) return candidato;
  }
  return null;
}

function esAdaptador(target: string): boolean {
  return DIR_ADAPTADOR.some((d) => target.startsWith(d + path.sep));
}

function esImportadorPermitido(rel: string): boolean {
  // R22: la composicion y los propios archivos de lib/services/login son los unicos
  // importadores legitimos de ese paquete y de lib/repositories.
  return rel === COMPOSICION_REL || rel.startsWith("lib/services/login/");
}

function violacionesDeImportacion(): string[] {
  const violaciones: string[] = [];
  for (const f of [...listarArchivos(path.join(RAIZ, "lib")), ...listarArchivos(path.join(RAIZ, "app"))]) {
    if (esImportadorPermitido(f.rel)) continue;
    for (const spec of especuladores(f)) {
      const target = resolver(spec, f);
      if (target !== null && esAdaptador(target)) {
        violaciones.push(`${f.rel}: importa ${spec} (badapter) [R22]`);
      }
    }
  }
  return violaciones;
}

describe("arquitectura del login (T13)", () => {
  it("R22: solo lib/composition/login.ts (y los propios servicios del paquete) importa adaptadores concretos", () => {
    expect(violacionesDeImportacion(), "importadores ilegales de adaptadores").toEqual([]);
  });

  it("R29: el paquete bcryptjs solo se importa desde lib/services/login/password-hasher.ts", () => {
    // Contencion de la dependencia: un "import bcryptjs" en otro archivo es la violacion.
    // Menciones de la palabra (comentarios, fixtures de la guardia de dependencias) no.
    const re = /from\s+["']bcryptjs["']/;
    const archivos = [
      ...listarArchivos(path.join(RAIZ, "lib")),
      ...listarArchivos(path.join(RAIZ, "app")),
      ...listarArchivos(path.join(RAIZ, "tests")),
    ];
    const violaciones = archivos
      .filter((f) => f.rel !== HASHER_REL && re.test(f.contenido))
      .map((f) => `${f.rel} importa bcryptjs [R29]`);
    expect(violaciones).toEqual([]);
  });

  it("firma: primitivas HMAC/timingSafeEqual/crypto.subtle solo se usan en session-token.ts (y su harness de tests)", () => {
    // Patron de USO, no de mencion: un import de node:crypto, una llamada a
    // timingSafeEqual/createHmac o un acceso crypto.subtle.<metodo>. Los comentarios que
    // nombran la primitiva (p. ej. session-id-factory) no cuentan.
    const re = /from\s+["']node:crypto["']|timingSafeEqual\s*\(|createHmac\s*\(|crypto\.subtle\./;
    const produccion = [...listarArchivos(path.join(RAIZ, "lib")), ...listarArchivos(path.join(RAIZ, "app"))];
    const violacionesProd = produccion
      .filter((f) => f.rel !== TOKEN_REL && re.test(f.contenido))
      .map((f) => `${f.rel} usa primitivas de firma`);
    const tests = listarArchivos(path.join(RAIZ, "tests"));
    // El harness de session-token forja firmas VALIDAS para probar tamper-resistance:
    // es la unica zona de tests que puede tocar primitivas. Los demas tests, no.
    const violacionesTests = tests
      .filter((f) => f.rel !== TEST_TOKEN_REL && f.rel !== SELF_REL && re.test(f.contenido))
      .map((f) => `${f.rel} usa primitivas de firma fuera del harness de session-token`);
    expect([...violacionesProd, ...violacionesTests]).toEqual([]);
  });

  it('"No implementar" (design.md §10): must_change_password no existe en schema, migraciones, lib ni app', () => {
    const re = /must_change_password/i;
    const candidatos = [
      ...listarArchivos(path.join(RAIZ, "db")),
      ...listarArchivos(path.join(RAIZ, "lib")),
      ...listarArchivos(path.join(RAIZ, "app")),
    ];
    const violaciones = candidatos
      .filter((f) => re.test(f.contenido))
      .map((f) => `${f.rel} menciona must_change_password`);
    expect(violaciones).toEqual([]);
  });

  it("R30: ninguna mascara de contrasena rechaza por forma (startsWith/charAt/[N]/centinela '!')", () => {
    const re = /\.startsWith\(|\.charAt\(|\[[0-9]\]|['"]!['"]/g;
    const candidatos = [HASHER_REL, VERIFY_REL].map((rel) => path.join(RAIZ, rel));
    const violaciones: string[] = [];
    for (const ruta of candidatos) {
      if (!fs.existsSync(ruta)) continue;
      const contenido = fs.readFileSync(ruta, "utf8");
      for (const m of contenido.matchAll(re)) {
        violaciones.push(`${path.relative(RAIZ, ruta).split(path.sep).join("/")}: decodifica forma de contrasena (${m[0]}) [R30]`);
      }
    }
    expect(violaciones).toEqual([]);
  });
});