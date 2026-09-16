# progress/impl_IA-1-login.md — Bitacora del implementer (backend_dev)

## Tanda 1 — Bloque 0 (TS1, T1, TS3, TS4, TS6)

Rango: **sin R propio** (el Bloque 0 es infraestructura previa; los R1-R30 los cubren T2-T19
y el Bloque I). El mapa `R<n> -> test` completo se escribe en T19.

### Archivos creados/modificados

| Archivo | Cambio | Tarea |
| --- | --- | --- |
| `package.json` | nuevo: scripts del gate (typecheck, lint, test, test:rapido, test:guardias, test:json, test:e2e, db:migrate, db:migrate:create, db:rollback), deps=17 exactas del registro, `type: module`, `pnpm.onlyBuiltDependencies: [prisma, @prisma/client]` | TS1, T1 |
| `pnpm-lock.yaml` | nuevo (lockfile 9, pnpm 10.32.1, resolved 351) | T1 |
| `tsconfig.json` | nuevo: `strict: true`, `moduleResolution: bundler`, `verbatimModuleSyntax`, paths `@/* -> ./*`, exclude de artefactos/generados | TS1 |
| `prisma.config.ts` | nuevo: config v7 (schema, `migrations.path: db/migrations`, `datasource.url = DIRECT_URL` si presente; loadEnvFile solo si existe `.env`) | TS1, TS3 |
| `db/schema.prisma` | nuevo: generator `prisma-client` -> `lib/generated/prisma`; datasource `postgresql` **sin url** (v7); sin models (los traen TI1/T14) | TS1 |
| `vitest.config.ts` | nuevo: environment node, include `tests/**/*.test.ts` | TS4 |
| `tests/guards/guard-dependencias-aprobadas.test.ts` | nuevo: guardia (ver TS4) | TS4 |
| `.env.example` | nuevo: DATABASE_URL/DIRECT_URL/SESSION_SECRET (>=32)/LOGIN_MAX_FAILED_ATTEMPTS=5/LOGIN_LOCK_MINUTES="1,5,15,60", sin valores reales | TS6 |
| `.gitignore` | ampliado: `.next/`, `coverage/`, `playwright-report/`, `test-results/`, `lib/generated/`, `*.tsbuildinfo`, `.vitest-rojos.json` | TS6 |
| `scripts/pg.d.ts` | nuevo: declaracion ambiental minima de `pg` (ver Notas, punto 3) | TS1 |
| `docs/dependencias.md` | modificado: Notas de las 12 filas — «4 checks PENDIENTES» -> «4 checks VERIFICADOS 2026-09-16» + version exacta instalada y datos reales de la corrida | T1 |
| `progress/impl_IA-1-login.md` | esta bitacora | — |

### T1 — resultado (linea pedida por el implementer)

> **T1: 17 dependencias, los 4 checks de architecture.md pasan; versiones: bcryptjs 3.0.3 ·
> zod 4.6.5 · @prisma/client 7.10.0 (pin) · prisma ^7.10.0 (7.10.0 instalada; @latest =
> 8.0.0-rc.15, rc no instalado) · @playwright/test 1.63.0 · vitest 5.0.1 · next 16.3.5 ·
> react 19.3.0 · react-dom 19.3.0 · typescript 7.0.2 · @types/node 22.20.3 · @types/react
> 19.3.0 · @types/react-dom 19.3.0 · tailwindcss 4.3.3 · @tailwindcss/postcss 4.3.3 · tsx
> 4.23.13 · pg 8.23.0 — todas no deprecadas, release < 12m, >= 10k semanales, licencia
> MIT/Apache-2.0/BSD-3-Clause (corrida real del script de checks, salida en la conversacion).**

Las 12 filas de `docs/dependencias.md` estan `aprobada` con fecha 2026-09-16; Notas
actualizadas con la corrida real. `@types/bcryptjs` NO se instalo (stub deprecado; bcryptjs
3.x trae sus tipos).

### Verificacion (salidas reales)

- `pnpm typecheck` -> OK (tsc --noEmit, sin errores).
- `pnpm lint` -> OK. **Provisional:** `lint = tsc --noEmit`. `eslint` NO esta entre las 12
  filas aprobadas y no se instala «por si acaso»; cuando una feature apruebe eslint en el
  registro, este script se sustituye. Sin eso, `run_if lint` del gate omitiria o mentiria.
- `pnpm exec vitest run guard` -> 1 archivo, 5 tests OK (2 casos reales + 3 sinteticos de
  «que muerde»: dependencia sin fila, fila con estado pendiente, parseo de celdas agrupadas).
- `pnpm exec vitest related --run tests/guards/guard-dependencias-aprobadas.test.ts` -> 5/5 OK.
- `pnpm test` -> 5/5 OK.
- `pnpm exec prisma validate` -> OK **sin** env (el datasource condicional de
  `prisma.config.ts` no rompe validate).
- `pnpm exec prisma generate` -> OK sin env: `Generated Prisma Client (7.10.0) to
  .\lib\generated\prisma` (schema sin models aun; banner de 8.0.0-rc.15 esperado por el pin).
- `pnpm run` lista los 10 scripts declarados; `git status` sin artefactos (`.vitest-rojos.json`,
  `tsconfig.tsbuildinfo` y `lib/generated/` ignorados).

### Notas y decisiones (para el reviewer/leader)

1. **Prisma 7 vence a tasks.md TS1 en dos puntos**, autorizado por el implementer: (a) `package.json#prisma` NO se declaro (campo deprecado en v7; la config vive en `prisma.config.ts`); (b) el datasource del schema NO lleva `url/directUrl` (v7 los movio a config; `datasource.url = DIRECT_URL`). `db/schema.prisma` apunta a `db/migrations` via `migrations.path`.
2. **Smoke de `db:migrate:create` (TS3) documentado, no ejecutado**: requiere conexion a base y `prisma migrate dev`; el implementer prohibio migrate dev/deploy/reset en esta tanda y no hay `.env` (ni se crea). El flujo up/down real se valida en TI1/T14. El CLI quedo probado por validate+generate.
3. **`scripts/pg.d.ts`**: `db-rollback.ts` (harness commiteado) importa `pg`, que no trae tipos; `@types/pg` no esta aprobado. Declaracion ambiental que cubre SOLO la superficie que el script usa, sin `any`. Borrarla cuando `@types/pg` entre al registro con aprobacion humana (punto sugerido para el reviewer: ¿fila `@types/pg` en el registro para la auditoría?).
4. `tsconfig.json` con `incremental: true` (estandar Next) + `*.tsbuildinfo` ignorado.
5. Typescript **7.0.2** (native) y vitest **5.0.1** son los latest estables actuales; ambos verificados con la suite de esta tanda.

### Veredicto

Bloque 0 (TS1, T1, TS3, TS4, TS6) completo y en verde: 17 dependencias con 4 checks
verificados y acta al dia, typecheck/lint OK, guardia 5/5, validate+generate OK; el stack
queda listo para TS2 (frontend: App Router + Tailwind v4) y TS5 (Playwright).