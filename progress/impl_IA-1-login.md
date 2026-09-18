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

---

## Tanda 1 (frontend) — TS2 + TS5

Rango: **sin R propio y sin test unitario propio** (los R1-R30 los cubren T2-T19 y el Bloque I;
TS2/TS5 son infraestructura previa). Fecha: 2026-09-16.

### Archivos creados/modificados

| Archivo | Cambio | Tarea |
| --- | --- | --- |
| `app/layout.tsx` | nuevo: root layout (html/body, `lang="es"`, metadata estatica, importa `globals.css`) | TS2 |
| `app/globals.css` | nuevo: `@import 'tailwindcss';` (hoja global de Tailwind v4) | TS2 |
| `app/(public)/layout.tsx` | nuevo: layout de la zona publica (`min-h-dvh`, regla multiplataforma; da hogar a `/login` de T16) | TS2 |
| `app/(public)/page.tsx` | nuevo: andamiaje desechable «IA-1 WIP» con clases Tailwind de humo (target del smoke; T16 la complementa/sobrescribe — reviewer decide) | TS2 |
| `postcss.config.mjs` | nuevo: plugin `@tailwindcss/postcss` (guia 11-css.md de Next 16) | TS2 |
| `package.json` | script `dev` = `next dev` (TS2 exige `pnpm dev`; Turbopack es el bundler default en Next 16) | TS2 |
| `.gitignore` | ignorado `next-env.d.ts` (docs de Next 16: se regenera con `next dev`/`next build`, no se versiona) | TS2 |
| `playwright.config.ts` | nuevo: E2E — baseURL local, proyecto chromium, `webServer` con `pnpm dev` y `reuseExistingServer: true`, `testDir: ./e2e` | TS5 |
| `e2e/smoke.spec.ts` | nuevo: visita `/`, afirma el andamiaje visible y que Tailwind compilo (`font-weight: 600` computado) | TS5 |
| `progress/impl_IA-1-login.md` | esta seccion | — |

Creado **con** la tanda, por `next dev`/typegen, y NO versionado: `next-env.d.ts` y `.next/`
(ignorados). `e2e/` quedo en el scope via `testDir` del config; no hizo falta campo `files`
en `package.json` (no hubiera aportado nada en una app no publicable).

### Decisiones (para el reviewer)

1. **Nombre del grupo de ruta: `(public)`.** `docs/architecture.md` dibuja `(marketing)` /
   `(dashboard)`, pero `tasks.md` (TS2, T16) usa `app/(public)/login/` y el leader pidio
   `app/(public)/layout.tsx`. Manda el spec de la feature: zona publica = `app/(public)/`.
   El grupo privado **no se crea** en esta tanda: no tendria paginas y un grupo vacio es
   infraestructura «por si acaso» que el reviewer rechaza; lo crea la feature que construya
   el area autenticada (el repo lo nombra `(dashboard)`).
2. **Sin `next.config.*`**: Next 16 arranca sin config; no se agrego nada «por si acaso».
3. **`next-env.d.ts` sin versionar** siguiendo los docs del propio Next 16 instalado
   (`project-structure.md`); `tsconfig.json` ya lo incluye en `include` (patron que no casa
   cuando el archivo aun no existe = sin error, verificado con `pnpm typecheck` en limpio).

### Verificacion (salidas reales)

- `pnpm exec playwright install chromium` -> OK (Chrome for Testing 153.0.8010.12 + headless shell, cache de usuario).
- `pnpm typecheck` -> OK (tsc --noEmit, sin errores).
- `pnpm lint` -> OK (lint = tsc --noEmit, provisional del stack).
- `pnpm exec playwright test e2e/smoke.spec.ts` -> **1 passed (13.3s)**: el webServer levanto `pnpm dev`, GET / respondio 200 y el `<h1>` computa `font-weight: 600` (Tailwind v4 compilado).

### Nota para el leader

El smoke confirma el criterio de «hecho» de TS2/TS5: la app arranca y responde, Tailwind
compila y el E2E corre con navegador real.

---

## Tanda 2 (backend) — TI1 + TI2 + T14 (migraciones escritas; aplicacion pendiente)

Rango: **R24 (T14)**, **R25/R26-esquema/R27/R28/R30-esquema (TI1)**, **R26 (TI2)**. Sin tests
unitarios propios en esta tanda: son migraciones; los tests que las ejercitan real son TI3
(integration, identidad) y T17 (validation), que vienen en tanda posterior. La verificacion de
una migracion escrita sin base es validate + diff de fidelidad (abajo). Fecha: 2026-09-16.

### Archivos creados/modificados

| Archivo | Cambio | Tarea |
| --- | --- | --- |
| `db/migrations/20260916090000_init_identity/migration.sql` | nuevo: `companies`, `roles`, `users` (tipo/estructura/nombres identicos a los que Prisma 7 genera; CHECKs de estados R28; UNIQUE+CHECK de `roles.name` R26; `password_hash` NOT NULL R30; FK de users restrictivas R25; indice GLOBAL a mano R27; RLS×3 con FORCE + policy del owner) | TI1 |
| `db/migrations/20260916090000_init_identity/down.sql` | nuevo: revierte en orden inverso (policy, NO FORCE, DISABLE, indice global, DROP TABLE) | TI1 |
| `db/migrations/20260916090001_seed_roles/migration.sql` | nuevo: INSERT de los 2 roles con `gen_random_uuid()` + `ON CONFLICT (name) DO NOTHING` (data migration, alternativa 8) | TI2 |
| `db/migrations/20260916090001_seed_roles/down.sql` | nuevo: `DELETE ... WHERE name IN ('admin_maestro','admin')` | TI2 |
| `db/migrations/20260916090002_add_login_attempts/migration.sql` | nuevo: `login_attempts` (uuid PK, FKs nullable a users/companies `ON DELETE SET NULL`, CHECK del conjunto cerrado de outcomes, `annotation_failed` default false, `attempted_at` déf. CURRENT_TIMESTAMP, `ip_address inet`, `user_agent` varchar(512), 3 indices con attemptedAt DESC; RLS idem TI1) | T14 |
| `db/migrations/20260916090002_add_login_attempts/down.sql` | nuevo: revierte exactamente (policy, NO FORCE, DISABLE, DROP TABLE) | T14 |
| `db/schema.prisma` | modificado: models `Company`, `Role`, `User`, `LoginAttempt` verbatim de design.md §10 (sin `@unique` en `username` a proposito, R27; `roles.name` si `@unique`) | TI1, T14 |
| `progress/impl_IA-1-login.md` | esta seccion | — |

### Decisiones y hallazgos (para el reviewer)

1. **Fidelidad verificada con el propio Prisma**: `prisma migrate diff --from-empty
   --to-schema db/schema.prisma --script` (read-only, sin DB) confirma que la estructura de las
   dos migraciones de esquema es identica a la que Prisma 7 generaria — tipos (`TIMESTAMPTZ(6)`,
   `INET`, `VARCHAR(n)`), nombres de indices/FKs y `ON UPDATE CASCADE`. **Hallazgo clave**:
   Prisma NO emite `DEFAULT gen_random_uuid()` para `@default(uuid())` — el default es del
   CLIENTE, no de la base; por eso los ids de las 4 tablas van sin DEFAULT y el seed de TI2
   inserta ids explícitos. Los unicos deltas a mano son los mandatados por design.md §10:
   CHECKs de estados, indice parcial/global R27, RLS FORCE + policy, y el INSERT de TI2.
2. **`migrate diff` en Prisma 7**: la flag `--to-schema-datamodel` fue RENOMBRADA a
   `--to-schema` (error del CLI con la flag vieja). Sin env no hace nada (datasource
   condicional); con `DATABASE_URL`+`DIRECT_URL` dummy (aunque no conecta en `--from-empty`)
   emite el SQL completo.
3. **La APLICACION de TI1/TI2/T14 queda PENDIENTE (T0 item 2)**: no hay `.env` ni base en el
   worktree (ni se crea — prohibicion del implementer). El `db:migrate` que aplica y los
   criterios «Hecho:`\d users` / `count(*) = 2`» los corre el human+leader cuando exista la
   config; mientras tanto TI1/TI2/T14 quedan `[ ]` en el checklist de tasks.md y esta rama no
   se da por cerrada en ese eje. (Smoke de `db:migrate:create` ya documentado pendiente en
   Tanda 1, punto 2.)

### Verificacion (salidas reales)

- `pnpm exec prisma validate` -> OK: `The schema at db\schema.prisma is valid` (sin env).
- `pnpm exec prisma generate` -> OK sin env: `Generated Prisma Client (7.10.0) to
  .\lib\generated\prisma in 216ms`.
- `pnpm exec prisma migrate diff --from-empty --to-schema db/schema.prisma --script` ->
  SQL completo de las 4 tablas + 8 indices + 4 FKs; comparado 1:1 con los `migration.sql`
  escritos (deltas = solo los mandatos a mano, listados arriba).
- `pnpm typecheck` -> OK (tsc --noEmit, 0).
- `pnpm lint` -> OK (provisional: tsc --noEmit, mismo estatus que Tanda 1).
- `must_change_password` -> **ausente** de `*.sql`/`*.prisma`/`*.ts` (solo aparece en los
  specs como mandato de NO declararlo: requirements.md L202, tasks.md L398).

### Veredicto

TI1 + TI2 + T14 escritos y verificados al maximo posible sin base: esquema valido, cliente
generado, estructura 1:1 con lo que Prisma 7 emitiria, RLS/CHECKs/indice global/seed presentes
con su down.sql; la aplicacion queda bloqueada por T0 item 2 (config de entorno), que gestiona
el human+leader.

---

## Tanda 3 - Bloque A: dominio puro (T2, T3, T4, T5, T6, T7)

Rango: R1-R7, R12-R21, R24, R26, R27 (parcial; tabla completa en T19). Restricciones de la
tanda cumplidas: dominio SIN `@prisma/client`, `next/*`, adaptadores ni lecturas de env
(eso es Bloque B/T13); verificación acotada a typecheck + lint + vitest related.

### Archivos creados/modificados

| Archivo | Cambio | Tarea |
| --- | --- | --- |
| `lib/types/identity-constants.ts` | nuevo: `USERNAME_MAX_LENGTH = 255` (provisional, casa con `varchar(255)` de TI1), `CREDENTIAL_MAX_LENGTH = 64` (margen bajo los 72 bytes de bcrypt) | T2 |
| `lib/types/login-copy.ts` | nuevo: `LOGIN_COPY_CREDENTIALS_INVALID`, `LOGIN_COPY_FIELD_REQUIRED`, `loginCopyPasswordTooLong(max)`, `loginCopyFieldTooLong(max, campo='Este campo')` | T2 |
| `lib/types/login.ts` | nuevo: `loginInputSchema` (zod v4: username trim 1..255, password sin trim 1..64), `LoginInput`, `LoginFieldErrors`, `LoginFormState` (union `idle \| invalid \| error`, attemptId SOLO en fallo, SIN contrasena — inv. 15), `LOGIN_INITIAL_STATE`, `normalizeUsername` (R3), `loginFormInvalid/Error/Rejected`, `parseLoginInput`, `resolveNextDestination` (sin open redirect), `DASHBOARD_ROUTE` | T2 |
| `lib/interfaces/repositories/i-user-credentials-reader.ts` | nuevo: `AccountStatusRaw`, `RoleName`, `AuthenticatableUser` (crudo, sin cocinar "activa"; filtro no-borrado del puerto), `IUserCredentialsReader.findActiveByUsername` (sin desambiguacion: unicidad global R27) | T3 |
| `lib/interfaces/repositories/i-login-attempt-recorder.ts` | nuevo: `LoginAttemptOutcome` (CHECK real), `LoginAttemptRecord` (sin password/hash/sesion, ip/userAgent opcionales), `CasSiguiente` estructurado, `ILoginAttemptRecorder.compareAndSet/set/recordAttempt` | T3 |
| `lib/interfaces/services/i-password-hasher.ts` | nuevo: `verify` fail-closed (decision 4), `getDecoyHash()` (una vez por proceso, promesa cacheada; añadido por R4/R5) | T3 |
| `lib/interfaces/services/i-session-starter.ts` | nuevo: `SessionTicket` (sub/roleName/companyId/sid), `startSession` puede lanzar y se PROPAGA (inv. 9) | T3 |
| `lib/interfaces/services/i-session-id-factory.ts` | nuevo: `newSessionId(): string` (inv. 4, 11 — el id viene SIEMPRE de este puerto) | T3 |
| `lib/services/login/account-status.ts` | nuevo: `effectiveAccountStatus` — unica funcion, orden de ramas fijado (inv. 13): raw fuera de {active,blocked} -> account_not_active; companyDeleted -> org_inactive; lockedUntil > now -> account_blocked; resto -> active (incluye bloqueo vencido R19) | T4 |
| `lib/services/login/account-lock-policy.ts` | nuevo: `LockPolicy { maxFailedAttempts: 5, lockDurationsMinutes: [1,5,15,60] }`, `nextFailureState` (R18 intacto si bloqueo vigente; quinto fallo bloquea + reinicia contador y sube nivel CAPS en longitud — nunca permanente; fallos previos solo contador + limpiar plazo) y `successResetState` (R20) | T4 |
| `lib/services/login/verify-credentials-service.ts` | nuevo: `verifyCredentials(input, ctx)` + `REJECTED` (congelado, inv. 1) + `MAX_CAS_RETRIES = 10`; flujo: normaliza -> lee -> inexistente (señuelo + 1 verify + rastro null) -> 1 verify (inv. 2, tambien en bloqueada R17) -> cortes de estado/org despues del hash sin escrituras (R21) -> exito (`set` reset, startSession propagando, rastro success) -> fallo (CAS con reloj fresco por iteracion, releer sin rehash inv. 8, desaparecido sin escribir R7, tope -> `annotation_failed: true`) | T4 |
| `tests/unit/verify-credentials.test.ts` | nuevo: 13 casos con puertos falsos compartiendo store; reloj mutable; CAS programable (resultado + mutacion); contadores de verify/señuelo/sid | T5 |
| `tests/unit/account-lock-policy.test.ts` | nuevo: reloj fake sin sleeps; 5 bloques encadenados con escalada 1/5/15/60/60; R19 cruzado con `effectiveAccountStatus` | T6 |
| `tests/unit/login-border.test.ts` | nuevo: borde zod por campo, constante R2, normalizacion R3, estado sin contrasena (valor + negativo de compilacion con `@ts-expect-error`), attemptId/username conservados, aterrizaje `next` | T7 |
| `progress/impl_IA-1-login.md` | modificado: esta seccion | — |

### Desviaciones documentadas (Tanda 3)

1. **Set de outcomes del rastro**: la consigna de tanda citaba `invalid_credentials` y
   `annotation_failed` como miembros del CHECK; el CHECK REAL commiteado en Tanda 2 (design
   §9, decision 3) es `success | bad_credentials | unknown_user | account_blocked |
   account_not_active | org_inactive`, y `annotation_failed` es la columna booleana que se
   pone a true solo si el CAS se agota. Manda design.md §9 + el migration; el codigo de T4
   usa ese set.
2. **`IPasswordHasher.getDecoyHash()`**: la tabla de puertos del design §4 tenia solo
   hash/verify; R4/R5 (§8) exigen un hash señuelo con el mismo mecanismo y coste creado una
   vez por proceso — se añade al puerto 2 con la misma justificacion con que `recordAttempt`
   se añadio por R24.
3. **`CasSiguiente` estructurado**: la firma plana `siguiente: { failedLoginAttempts,
   lockedUntil }` del §7 no transporta `lockLevel` de la escalada; el objeto lleva los tres
   campos y SIEMPRE se escriben (`lockedUntil: null` = limpiar columna), mientras que en
   `estadoNuevo` null = no tocar esa columna (inv. 12).
4. **`attemptId` no nace en el servicio**: el §5 paso 1 lo hacia sonar parte del caso de
   uso, pero el §11 (union del formulario) lo pone solo en los estados de FALLO, y el
   servicio no conoce formulario: lo genera el controller/Server Action (T15) y lo recibe
   `loginFormInvalid/Error/Rejected` para armar el estado.
5. **`ipAddress`/`userAgent` reservados**: R24 pide "desde donde" pero el contexto de esta
   tanda no los provee; son opcionales en `LoginAttemptRecord` y el servicio los omite
   (null en base cuando el adaptador exista).
6. **Bug real corregido en T5** (lo cazo el typecheck): el servicio llamaba
   `ctx.sessionIdFactory()` como si el puerto fuera una funcion; la interfaz T3 es objeto
   con metodo `newSessionId()`. Corregido a `ctx.sessionIdFactory.newSessionId()`.

### Mapa R<n> -> test (parcial de la tanda; tabla completa en T19)

| R<n> | Test |
| --- | --- |
| R1 | T5 `acepta credenciales validas...` (activo + correcta) y camino inexistente -> rechazo |
| R2 | T5 `todo rechazo devuelve el MISMO objeto congelado` (=== REJECTED en los 3 caminos) + T7 `todo rechazo de credenciales usa la misma constante exportada` |
| R3 | T5 (`lecturas` recibe 'ana' al entrar '  Ana  ') + T7 `trim + minusculas del username; la contrasena nunca se normaliza` |
| R4 | T5 `el senuelo se calcula una sola vez por proceso y se verifica una vez por intento` |
| R5 | T5 (idem: 1 computacion por proceso, 2 verificaciones en 2 intentos) |
| R6 | T5 `la entrada invalida se corta en el borde: ningun puerto llega a ser llamado` + T7 (vacios/largos por campo; corte en el borde) |
| R7 | T5 `si el usuario desaparece entre intento y reintento, el reintento no escribe nada` + inexistente sin escrituras de cuenta (rastro null) |
| R10 | T5 `acepta credenciales validas...` (ticket con sub/roleName/companyId del puerto, sid del puerto fabrica; entrada jamas) |
| R12 | T5: ningun camino de fallo emite sesion (cortes + contrasena mala + agotado + desaparecido) |
| R13 | T5 `cada desenlace deja su rastro... sin secretos` (por valor) + T7 estado sin contrasena (valor y negativo de compilacion) |
| R14 | T5 (sid nuevo por emision, `sid-0` no derivado) + T7 `attemptId distinto por invocacion y username conservado` |
| R15 | T6 `el quinto fallo consecutivo bloquea y reinicia el contador` |
| R16 | T6 `la duracion del bloqueo escala 1/5/15/60 minutos y se repite 60, nunca permanente` |
| R17 | T5 `la cuenta bloqueada verifica el hash UNA sola vez, aun con contrasena correcta` (y tambien con incorrecta) |
| R18 | T6 `el fallo estando bloqueada devuelve el estado intacto` |
| R19 | T6 `el bloqueo caducado deja de bloquear...` + `effectiveAccountStatus(...) === 'active'` |
| R20 | T6 `successResetState` deja los tres a cero y estado active |
| R21 | T5 `los cortes de estado, organizacion y bloqueo rechazan sin escribir ni emitir sesion` + T7 (corte en el borde) |
| R24 | T5 `cada desenlace deja su rastro con username, outcome y vinculos` + `agotado el CAS registra annotation_failed` (recordAttempt en CADA desenlace resuelto) |
| R26 | T5 (roleName del ticket sale del conjunto cerrado del puerto) — completo en T9/T11 |
| R27 | parcial: lector busca por username normalizado, fila unica sin desambiguacion — el query real es T12 |

### Verificacion (salidas reales)

- `pnpm typecheck` -> OK: `tsc --noEmit` sin errores (tras corregir el bug de la nota 6 y un
  import faltante en el test).
- `pnpm lint` -> OK (provisional: `tsc --noEmit`, mismo estatus que Tandas 1-2).
- `pnpm exec vitest related --run tests/unit/verify-credentials.test.ts
  tests/unit/account-lock-policy.test.ts tests/unit/login-border.test.ts` ->
  `Test Files 3 passed (3)` / `Tests 29 passed (29)` (13 + 5 + 11). Suite completa y
  `./init.sh` NO se corrieron (regla del gate: los corre el leader).
- Nada se instalo: `package.json` intacto (guardia de dependencias sigue verde).

### Veredicto

Bloque A completo y verde: dominio puro del login (tipos, 5 puertos, escalada de bloqueo y
caso de uso con CAS) con 29 tests de unit que fijan R1-R7, R12-R21 y R24; las desviaciones
frente al design/consigna quedaron documentadas arriba y el unico bug real (sesionIdFactory
como funcion) lo detecto el propio typecheck y se corrigio en el fichero.
---

## Tanda 4 — Bloque B adaptadores (T8-T12) + composicion unica (T13) + Server Action (T15)

Rango: R8, R9 (token), R10 (sesion), R11, R14 (uas menos el CAS), R22, R26 (role), R27 (query
del lector sin desambiguacion), R29, R30 (sin forma). Restricciones de tanda cumplidas: repos
SOLO compilan (no ejecutan contra base — T0 item 2), la composicion es el unico importador de
adaptadores, el action importa solo composicion+types, nada se instalo.

### Archivos creados/modificados

| Archivo | Cambio | Tarea |
| --- | --- | --- |
| `lib/services/login/password-hasher.ts` | nuevo: `PasswordHasher` (bcryptjs coste 10, `PASSWORD_HASHER_COSTE = 10`), `verify` fail-closed SIN chequeo de forma (R30), señuelo con texto fijo cacheando la PROMESA (R4/R5) | T8 |
| `lib/services/login/session-id-factory.ts` | nuevo: `crearSessionIdFactory` -> `crypto.randomUUID()` (inv. 4/11; comentario documenta edge-ready: WebCrypto global, nada de `node:crypto`) | T9 |
| `lib/services/login/session-token.ts` | nuevo: codec `v1.<payload>.<hmac>`, HMAC-SHA-256 via `crypto.subtle`, `timingSafeEqual` (node:crypto) para la firma, claims `{sub,iat,exp,role,cid,sid}`, `exp = iat + 480 min` absoluta firmada (R9), secreto min 32 leido en la llamada fail-closed (R11), version != `v1` rechazada sin verificar, role en conjunto cerrado (R26). `crearToken` es `async` (ver desviaciones, punto 2) | T10 |
| `lib/services/login/session-starter.ts` | nuevo: `cookieDeSesion(token, produccion)` puro (httpOnly, lax, path /, secure solo prod, SIN domain — R8) + `crearSessionStarter` con reloj y escritor inyectados; `startSession` lanza si el secreto esta ausente/corto y la excepcion se PROPAGA (inv. 9) | T11 |
| `lib/repositories/user-credentials-repo.ts` | nuevo: `` con `Prisma.sql`, `lower(username) = lower()`, `users.deleted_at IS NULL`, JOIN roles/companies, `(c.deleted_at IS NOT NULL) AS company_deleted`, SIN desambiguacion (R27/decision 6: `filas[0] ?? null`) | T12 |
| `lib/repositories/login-attempt-repo.ts` | nuevo: `compareAndSet` (updateMany: contador esperado + estado esperado + plazo por RANGO — inv. 5/6), `set` incondicional con `estadoNuevo: null` = omitir columna (inv. 12), `recordAttempt` INSERT best-effort (se traga errores — design §9; nunca password/hash/sesion, R13) | T12 |
| `lib/composition/login.ts` | nuevo: UNICO importador de adaptadores (R22); `parseLockPolicy` fail-fast exportada (default 5 y [1,5,15,60]); hasher en scope de modulo + calentado; `crearClientePrisma()` que LANZA con mensaje explicito (bloqueo Prisma adapter, ver punto 1); `obtenerContexto()` lazy; `verifyCredentials` compuesto | T13 |
| `lib/actions/login.ts` | nuevo: `'use server'` (T15): attemptId = `crypto.randomUUID()` por invocacion, `parseLoginInput` + `resolveNextDestination` en el borde (R6), exito -> `redirect` FUERA de try/catch (Next 16: lanza para cortar el stream), fallo -> `loginFormRejected` sin motivo (R2) | T15 |
| `tests/unit/password-hasher.test.ts` | nuevo: 6 casos (coste visible en el hash, fail-closed vacio/corrupto, promesa del señuelo con `toBe`, señuelo nunca autentica) | T8 |
| `tests/unit/session-id-factory.test.ts` | nuevo: 3 casos (ids distintos, UUID v4, sin colisiones) | T9 |
| `tests/unit/session-token.test.ts` | nuevo: 13 casos (formato, roundtrip con reloj EXPLICITO, exp-iat=8h, firma/payload alterados, v0/v2 sin verificar, expirado == exp / vigente 1s antes, secreto corto, role invalido, payload no-JSON con HMAC VALIDO forjado con `createHmac` del test, claims malformadas, dos tickets) | T10 |
| `tests/unit/session-starter.test.ts` | nuevo: 5 casos (attrs por entorno y sin domain, token verificado con el mismo secreto en la salida, lanza sin secreto / corto, cero cookies) | T11 |
| `tests/unit/architecture-login.test.ts` | nuevo: 5 greps estructurales con fs (R22 imports de adaptadores, R29 contencion del paquete bcryptjs, primitivas de firma solo en session-token + su harness, must_change_password ausente, R30 sin decodificacion de forma) | T13 |
| `progress/impl_IA-1-login.md` | modificado: esta seccion | — |

### Desviaciones y hallazgos de tanda (para el reviewer)

1. **Prisma 7 NO admite `new PrismaClient()` sin opciones — bloqueo real documentado en
   codigo.** `PrismaClientConstructorArgs` es union `{adapter} | {accelerateUrl}`, una de
   las dos OBLIGATORIA (verificado en `lib/generated/prisma/internal/class.ts:85` y
   `prismaNamespace.ts:1046`). `@prisma/adapter-pg` no esta aprobado en
   `docs/dependencias.md` (el head del proyect decide). En vez de un cast que finja un
   adapter, `crearClientePrisma()` lanza con un mensaje que nombra la solucion y T17; el
   typecheck queda limpio y el fallo de runtime es actionable, no opaco. La firma del
   constructor era la causa del error TS2554 inicial de esta tanda.
2. **`crearToken` se declaro `async`.** Originalmente validaba (secret/role) y lanzaba
   SINCRONO desde una funcion tipada `Promise<string>`: un llamador con `.reject` no
   atraparia la validacion. Declarandola async, TODO fallo es rechazo (consistencia
   fail-closed, design §6).
3. **Tests de token con reloj EXPLICITO en `verificarToken`**: el AHORA fijo de emision
   (2026-09-16T12:00Z) y el reloj real del runner ya no conviven (hoy es el mismo dia; el
   token expiraba a las 20:00Z). Los unit tests pasan siempre el reloj a la verificacion —
   nunca dependen de la pared.
4. **Test estructural afinado a USO real, no a menciones**: R29 mira el import del paquete
   `bcryptjs` (un grep literal de la palabra marca a la guardia de dependencias, que cita
   `bcryptjs` como DATO de su fixture); «firma» matchea imports de `node:crypto` y
   llamadas/accesos (`timingSafeEqual(`, `createHmac(`, `crypto.subtle.`), no
   comentarios; el propio archivo de arquitectura se cita a si mismo al nombrar las
   primitivas y se excluye por construccion (`SELF_REL`).
5. **`attemptId` en el controller**: confirmado el mando de Tanda 3 (desviacion 4): el
   servicio conoce la sesion (sid) via puerto, el id del FORMULARIO nace en el action por
   invocacion (`crypto.randomUUID()`) — sin parametros ni derivaciones.
6. **`process.env` no pasa directo a `parseLockPolicy`**: su tipo (`ProcessEnv`) no es
   estructuralmente compatible con la interfaz del parser (TS2559) — se pasa campo a campo y
   queda asi documentado en la composicion.
7. Remanente del Bloque 0: `lint = tsc --noEmit` (provisional, sin eslint aprobado).

### Mapa R<n> -> test (parcial de la tanda; tabla completa en T19)

| R<n> | Test |
| --- | --- |
| R4/R5 | `password-hasher` (promesa del señuelo compartida con `toBe`; el señuelo jamás autentica) + `architecture-login` (calentado no verificado) |
| R8 | `session-starter` (attrs httpOnly/lax//secure por entorno, sin domain) |
| R9 | `session-token` (exp = iat + 8h va DENTRO del valor firmado; vencido al llegar a exp, vigente 1s antes) |
| R10 | `session-token` (claims solo identificadores, roundtrip) + `session-starter` (el valor que viaja se verifica y lleva el sid) |
| R11 | `session-token` (sin secreto/corto lanza emision y verificacion — fail-closed) + `session-starter` (startSession lanza, cero cookies) |
| R14 | `session-id-factory` (UUID por llamada, no derivado) |
| R22 | `architecture-login` (grep: solo composicion + paquete de servicios importa adaptadores) |
| R26 | `session-token` (role fuera del conjunto cerrado -> ticket imposible) |
| R27 | `architecture-login`+T12: lector sin desambiguacion (query real en T17) |
| R29 | `architecture-login` (import de bcryptjs solo en password-hasher) + `password-hasher` (coste 10) |
| R30 | `architecture-login` (sin startsWith/charAt/[N]/centinela en hasher y servicio) + `password-hasher` (fail-closed por try/catch, sin forma) |

### Verificacion (salidas reales)

- `pnpm typecheck` -> OK: `tsc --noEmit` sin errores (tras documentar el bloqueo de
  Prisma en la composicion, punto 1).
- `pnpm lint` -> OK (provisional: `tsc --noEmit`, mismo estatus que tandas previas).
- `pnpm exec vitest related --run <5 tests nuevos + guardia>` ->
  `Test Files 6 passed (6)` / `Tests 37 passed (37)` (6 + 3 + 13 + 5 + 5 + 5 de la
  guardia). Suite completa y `./init.sh` NO se corrieron (regla del gate: leader).
- Nada se instalo: `package.json` intacto (guardia de dependencias sigue verde).

### Veredicto

Bloque B + composicion + action completos y en verde para lo que la tanda puede verificar sin
base: codec/cookie/hasher/factory con 27 tests nuevos, los 5 greps estructurales fijando
R22/R29/R30 y la contencion de Prisma a la composicion; el unico punto ciego es el runtime de
los repos, bloqueado por T0 item 2 -> T17 y dejado con error explicito en `crearClientePrisma`.

---

## Tanda 5 — Cablear PrismaPg (desbloqueo T0 item 2, parcial) + drop de `scripts/pg.d.ts`

Rango: desbloquea el constructor de `crearClientePrisma()` (R22 intacto: el adaptador se
importa SOLO en la composicion). Fecha: 2026-09-17. El humano aprobo `@prisma/adapter-pg`
7.10.0 (casa con `@prisma/client` 7.10.0) y `@types/pg` 8.23.1 (dev); ambas ya instaladas
(verificadas en `package.json`).

### Archivos creados/modificados

| Archivo | Cambio | Tarea |
| --- | --- | --- |
| `lib/composition/login.ts` | modificado: `import { PrismaPg } from "@prisma/adapter-pg"` (valor, `verbatimModuleSyntax`); `crearClientePrisma()` ya no lanza — construye `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`. El comentario del bloqueo viejo se sustituyo por: nota de que el adapter esta aprobado y cableado aqui (R22), nota breve de que el runtime sin `.env` falla al primer `crearClientePrisma()` (lazy, en `obtenerContexto`, fail-fast decision 1) y que T17 (integracion contra base) sigue pendiente por falta de `.env`. La firma de `verifyCredentials` exportada NO cambio | T13/T17 |
| `scripts/pg.d.ts` | eliminado: la declaracion ambiental provisional de `pg` ya no hace falta — existe `@types/pg` 8.23.1 aprobado (fila nueva en docs/dependencias.md) | Bloque 0 punto 3 |
| `progress/impl_IA-1-login.md` | modificado: esta seccion | — |

### `scripts/db-rollback.ts` — verificado contra `@types/pg` real, SIN cambios

Se reviso la superficie que el script usa contra `node_modules/@types/pg/index.d.ts`:
constructor `(config?: string | ClientConfig)` con `connectionString?: string`, `connect():
Promise<Client>`, overloads de `query` que aceptan `string | QueryConfig<I>` + `values?`,
`rowCount: number | null` (el `?? 0` del script sigue valido) y `end(): Promise<void>`. La
declaracion provisional era un subconjunto estricto de los tipos reales — **cero desajuste**:
no se toco el script ni su comportamiento.

### Test estructural R22 — sin ajustes

`tests/unit/architecture-login.test.ts` paso VERDE sin tocar nada. Motivo documentado: el
grep de imports de adaptadores (R22) solo persigue targets resolubles `lib/`, `@/` o
relativos; `@prisma/adapter-pg` es paquete externo y `resolver()` devuelve `null`, asi que ni
entra en la violacion. Ademas el import vive en la composicion, que es justamente el
importador permitido por R22 — no hizo falta ampliar ningun patron del test.

### Mapa R<n> -> test (delta de la tanda)

| R<n> | Test |
| --- | --- |
| R22 | `architecture-login` (grep de imports de adaptadores — verde sin cambios; `@prisma/adapter-pg` solo en composicion) |
| Dependencias | `guard-dependencias-aprobadas` (las 2 filas nuevas aprobadas, instaladas y verificadas por el implementer; guardia intacta, `package.json` ya las tenia) |

### Verificacion (salidas reales)

- `pnpm typecheck` -> OK: `tsc --noEmit` sin errores (con el adapter cableado y
  `scripts/pg.d.ts` borrado).
- `pnpm lint` -> OK (provisional: `tsc --noEmit`, mismo estatus que tandas previas).
- `pnpm exec vitest related --run lib/composition/login.ts tests/unit/architecture-login.test.ts
  scripts/db-rollback.ts` -> `Test Files 1 passed (1)` / `Tests 5 passed (5)`
  (architecture-login completo, incluido R22).
- Suite completa y `./init.sh` NO se corrieron (regla del gate: los corre el leader).
- Nada se instalo en esta tanda: `package.json` ya tenia `@prisma/adapter-pg` 7.10.0 y
  `@types/pg` 8.23.1.

### Veredicto

Tanda 5 verde: PrismaPg cableado en la composicion (el constructor de Prisma 7 deja de lanzar
y el login puede ejecutar contra base en cuanto exista `.env`), `pg.d.ts` eliminado con
`db-rollback.ts` compilando contra los tipos reales sin cambios y R22 intacto sin tocar el
test; lo unico pendiente sigue siendo T17 (integracion real, bloqueada por falta de `.env`).

---

## Tanda 5 (retoma — cierre de sesion del implementer): T16 + T18 revisados y commiteados

Fecha: 2026-09-17. La sesion anterior dejo en disco sin commitear la pantalla de login (T16)
y el E2E (T18). Esta tanda los REVISA contra el spec, confirma el adapter (Tanda 5 de
backend_dev, arriba) y cierra lo que puede cerrarse sin base. `.env` NO existe en el worktree
(verificado `ls .env`): **T0 item 2, la aplicacion de TI1/TI2/T14, TI3 y T17 quedan BLOQUEADOS**
y se reportan al final.

### Archivos revisados/confirmados (frontend_dev, sin cambios — ya cumplian el spec)

| Archivo | Verificacion |
| --- | --- |
| `app/(public)/login/page.tsx` | Server Component (`min-h-dvh`, metadata, `searchParams` Promise con `await` — Next 16), pasa `defaultNext` + `labels` al form; capa: solo barrel |
| `app/(public)/login/components/index.ts` | barrel sin `'use client'` |
| `app/(public)/login/components/login-form.tsx` | `'use client'`, `useActionState(loginAction, LOGIN_INITIAL_STATE)` de `react`; hidden `next` con `defaultValue`; `autoComplete`; `aria-invalid`/`aria-describedby`; **password SIN `defaultValue`** (inv. 15); username conservado; mensajes por campo + congelado (R2); `noValidate` |
| `app/(public)/login/components/submit-button.tsx` | `type=submit`, `disabled={pending}`, `aria-busy`, `h-11` (>=44px), `text-base` |
| `e2e/login.spec.ts` | 3 tests (exito->/dashboard + cookie invisible a scripts R8/R9; fallo->mensaje congelado sin cookie R2/R12; pending->mismo mensaje R21); `LOGIN_COPY_CREDENTIALS_INVALID` real; credenciales de env, no hardcodeadas; `getByLabel` resuelven contra los labels del form |
| `playwright.config.ts` | proyecto `chromium` con `testIgnore: /login\.spec\.ts/`; `login-e2e` condicional (`LOGIN_E2E=1`) con `testMatch` |

Los 6 archivos ya estaban COMPLETOS en disco; frontend_dev no toco ninguno
(«ya cumplia»). Se verifico ademas en el source de React 19 que el reset del form tras la
action corre en el commit after-mutation — **despues** de aplicar los `defaultValue` nuevos —
asi que el patron «username restaurado + password limpia» funciona como exige el spec.

### Evidencia real del render de `/login` (criterio «Hecho» de T16)

El smoke E2E de la tanda solo visitaba `/`. El implementer corrio un spec temporal
(`e2e/_t16-render-check.spec.ts`, borrado tras la corrida) que visito `/login` sin `.env`:
**1 passed** — el heading «Acceso a Inventarte», los dos inputs (`getByLabel`) y el boton
«Entrar» renderizan. El login pinta sin base porque `crearClientePrisma()` es lazy (solo se
instancia al primer submit, via `obtenerContexto`).

### Verificacion (salidas reales, implementer — regla del gate)

- `pnpm typecheck` -> OK (`tsc --noEmit`, 0 errores).
- `pnpm lint` -> OK (provisional: `tsc --noEmit`).
- `pnpm exec vitest related --run lib/composition/login.ts
  tests/guards/guard-dependencias-aprobadas.test.ts tests/unit/architecture-login.test.ts` ->
  `Test Files 2 passed (2)` / `Tests 10 passed (10)` (guardia 5/5 con las 2 filas nuevas +
  architecture-login 5/5 con R22 intacto).
- `pnpm exec playwright test e2e/smoke.spec.ts` -> **1 passed** (el `testIgnore` de
  playwright.config.ts no toca el smoke).
- `pnpm exec playwright test e2e/_t16-render-check.spec.ts` -> **1 passed** (temp, borrado).
- Suite completa y `./init.sh` NO se corrieron (regla del gate: leader).

### Tasks marcadas en tasks.md

- **T16 `[x]`** (pantalla de login, UI minima): archivos revisados, `/login` renderiza sin
  base, barrel respetado, sin fetch de datos privados en cliente, pagina no autenticada en
  zona publica.
- **T18 `[x]`** (E2E): spec completo y correcto contra el spec; queda **escrito pero sin
  ejecutar** — bloqueado por entorno (lo levanta el leader con `LOGIN_E2E=1` cuando exista
  `.env` + base + fixtures de T17; sin `LOGIN_E2E` el spec queda fuera del run default via
  `testIgnore`). El criterio de T18 exige «playwright test e2e/login.spec.ts verde», que
  solo es posible con base: se marca `[x]` por el estado del artefacto, con la corrida
  real diferida a cuando el leader active el proyecto `login-e2e`.

### Bloqueos reportados (T0 item 2 — unico bloqueo de la feature)

`.env` ausente en el worktree. **No se crea, no se migra, no se inventan credenciales**:
- **T0** queda `[ ]` (item 2: `SESSION_SECRET` >= 32, `DATABASE_URL`/`DIRECT_URL`
  alcanzables, `prisma migrate status`).
- **TI1 + TI2 + T14**: migraciones escritas y commiteadas (Tanda 2); la APLICACION (`prisma
  migrate deploy`) y los criterios «`\d users` / `count(*) = 2`» quedan pendientes de `.env`.
- **TI3** (integration identidad: R25-R30, R27 global) y **T17** (integration login contra
  base real: R1/R4/R15-R21/R23/R24 + fixtures auto) quedan pendientes de `.env`.
- El runtime de los repos ahora esta DESBLOQUEADO tecnicamente (`crearClientePrisma()` ya
  construye el adapter); falta solo el entorno para ejecutarlo (T17).

### Estado del mapa R<n> -> test (T19, parcial)

El mapa completo esta en `specs/IA-1-login/tasks.md` L497-528 (referencia del reviewer) y los
deltas por tanda en esta bitacora (Tandas 3, 4, 5). **Filas que dependen de base siguen
pendientes**: R23 (T17/TI3/T18), R24 (T17 real), R25-R28/R30 (TI3), R1/R4/R15-R21 (T17), y las
que citan T18 como test (R1/R2/R8/R9/R12/R21) esperan la corrida E2E real. T19 cierra cuando
exista `.env` y el leader corra `./init.sh --rapido` / `./init.sh` completo.

### Veredicto

Tanda 5 (retoma) verde: T16 y T18 revisados y confirmados contra el spec (archivos ya
completos en disco — frontend_dev no toco nada), `/login` renderiza sin base (evidencia
real), adapter PrismaPg cableado (Tanda 5 backend_dev) y tasks T16/T18 marcadas `[x]`; el
unico punto ciego es el runtime contra base — T0 item 2/TI1-TI3/T17 bloqueados por falta de
`.env`, gestionado por human+leader.

---

## Tanda 6 — Desbloqueo por entorno: migraciones aplicadas (T0, TI1, TI2, T14)

Fecha: 2026-09-17. El humano escribio `.worktrees/IA-1-login/.env` (verificado por el
leader: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` >= 32, y git lo ignora). Con eso se
**desbloquea** la aplicacion de TI1/TI2/T14 y los tests de integracion (TI3, T17) y el E2E
real (T18). Esta tanda aplica y verifica las migraciones, y documenta un hallazgo de red
que obligo a rutear `prisma migrate` por el **session pooler** en vez del host directo.

### Hallazgo de red (determinante para el resto del cierre)

`prisma migrate status` fallo primero con **P1001** (`Can't reach database server at
db.rfiwqjcqzxfgkudofskd.supabase.co:5432`). Diagnostico con evidencia:

- `db.rfiwqjcqzxfgkudofskd.supabase.co` resuelve **solo AAAA (IPv6)** — verificado con el
  resolver local y con 8.8.8.8 (`nslookup`; no hay registro A).
- Esta maquina **no tiene ruta IPv6**: `Test-NetConnection ipv6.google.com:443` ->
  `False`, y node falla con `ENOTFOUND getaddrinfo` contra el host directo.
- El pooler `aws-0-us-east-2.pooler.supabase.com` resuelve IPv4 (CNAME ->
  `pool-tcp-us-east-2-...elb...` con A 13.59.95.192 / 3.13.175.194 / 3.139.14.59) y
  **conecta en 5432 y 6543**. Con `pg` real: `SESSION_POOLER_5432: CONNECTED`,
  `TRANSACTION_POOLER_6543: CONNECTED`, autenticacion con la misma contraseña.

Causa raiz: Supabase ofrece el direct connection **IPv6-only** (sin IPv4 add-on) y el
worktree no tiene IPv6. Workaround usado, **sin tocar `.env`** (solo override de
`DIRECT_URL` en el comando — `process.loadEnvFile` no pisa variables ya definidas,
verificado): `prisma migrate` corre contra el **session pooler** (5432, IPv4), que pinnea
la conexion y soporta transacciones — el camino estandar cuando el direct connection es
IPv6-only. `DATABASE_URL` (runtime/app) queda como escribio el humano (6543).

> Nota para el leader/reviewer: el `DIRECT_URL` del `.env` solo es util en maquinas con
> IPv6, o si Supabase pasa a dual-stack. En esta maquina, cualquier `migrate
> deploy/dev/status` y `db:rollback` necesita el override del session pooler. Si se quiere
> dejar fijo, la alternativa es cambiar `DIRECT_URL` en `.env` al session pooler 5432
> (decision del humano; el script `prisma.config.ts` no hace distingos).

### Archivos aplicados/verificados

| Archivo | Accion | Tarea |
| --- | --- | --- |
| `db/migrations/20260916090000_init_identity/migration.sql` | aplicado | TI1 |
| `db/migrations/20260916090001_seed_roles/migration.sql` | aplicado | TI2 |
| `db/migrations/20260916090002_add_login_attempts/migration.sql` | aplicado | T14 |
| `db/migrations/*/down.sql` (3) | **validados en dry-run no destructivo**: BEGIN -> 3 downs en orden -> ROLLBACK, base intacta | TI1/TI2/T14 |
| `specs/IA-1-login/tasks.md` | T0, TI1, TI2, T14 marcadas `[x]` | T0/TI1/TI2/T14 |

Nada se edito ni se instalo: las migraciones estaban escritas y commiteadas (Tanda 2) y
solo se aplicaron. Sin `pnpm install`, `package.json` intacto.

### Salidas reales

- `pnpm exec prisma migrate status` (sin env de ruteo) -> **P1001** (halazgo de arriba).
- `DIRECT_URL=<session pooler> pnpm exec prisma migrate deploy` -> `All migrations have
  been successfully applied.` (3: init_identity, seed_roles, add_login_attempts).
- `DIRECT_URL=<session pooler> pnpm exec prisma migrate status` -> `Database schema is up
  to date!`
- Verificacion con `pg` real (via `DATABASE_URL`, transaction pooler 6543):
  - `roles count = 2 -> admin, admin_maestro` (seed TI2, R26).
  - tablas en `public`: `_prisma_migrations, companies, login_attempts, roles, users`.
  - `_prisma_migrations`: las 3 migraciones `done=true`.
  - indice global presente: `users_username_unique_active` =
    `CREATE UNIQUE INDEX ... ON public.users USING btree (lower((username)::text)) WHERE
    (deleted_at IS NULL)` (R27).
  - RLS: las 4 tablas con `relrowsecurity=true relforcerowsecurity=true` (TI1/T14).
- Dry-run de los 3 `down.sql` (transaccion + ROLLBACK, contra session pooler): los tres
  `OK`, `ROLLBACK: base intacta`.

### T0 (preflight) — checklist cerrado

1. Scaffolding TS1-TS6: `pnpm typecheck` OK, `pnpm lint` OK, `pnpm exec vitest run
   tests/guards` -> 1 archivo / 5 tests OK. (El `./init.sh` completo lo corre el leader.)
2. Entorno: `.env` presente con `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` (72 chars),
   `LOGIN_MAX_FAILED_ATTEMPTS=5`, `LOGIN_LOCK_MINUTES="1,5,15,60"`; base alcanzable via
   pooler (secuencia de arriba).
3. Migraciones aplicadas: `SELECT count(*) FROM roles` = **2** (`admin`,
   `admin_maestro`).

### Veredicto

T0/TI1/TI2/T14 cerradas: el esquema de identidad, el catalogo y el rastro de intentos
estan aplicados y verificados contra la base real (2 roles, indice global, RLS en las 4
tablas, `_prisma_migrations` consistente) y los 3 downs validados sin destruir nada; el
unico matiz es el ruteo IPv6 del direct connection, documentado arriba con el workaround
del session pooler. Pendiente de la tanda: TI3, T17, T18 real y T19.

---

## Tanda 7 (backend_dev) — TI3 + T17 (integration contra base real) + scripts de fixtures E2E

Rango: **R23, R25-R30 (TI3)** y **R1, R4, R15-R21, R23, R24 contra base real (T17)**.
Fecha: 2026-09-17. Con el entorno desbloqueado (Tanda 6), los tests de integracion corren
contra la base real via `DATABASE_URL` (transaction pooler 6543) — el mismo camino que usa
la app (`PrismaPg` envuelve un Pool de `pg` con `connectionString`; los tests usan `pg` y
`PrismaClient` directamente, sin opciones de ssl — la conexion funciona tal cual).

### Archivos creados/modificados

| Archivo | Cambio | Tarea |
| --- | --- | --- |
| `tests/integration/identity.integration.test.ts` | nuevo: 7 tests contra base real (R25-R30 + RLS); fixtures auto por id determinista, limpiados en `afterAll` (R23) | TI3 |
| `tests/integration/login.integration.test.ts` | nuevo: 11 tests contra base real (R1, R4, R15-R21, R23, R24); fixtures auto (+ fijador `fijarEstado` para bloqueos/borrados), limpiados al final | T17 |
| `scripts/seed-e2e-login-fixtures.mts` | nuevo: siembra idempotente (UPSERT por id fijo) de la empresa `e2e00000-0000-4000-8000-000000000001`, `e2e_login_admin` (active) y `e2e_login_pending` (pending) con `PasswordHasher` de T8; imprime 4 vars `E2E_LOGIN_*` parseables | T17/T18 |
| `scripts/cleanup-e2e-login-fixtures.mts` | nuevo: borra por los ids deterministas (reverse-safe, no toca nada que no sea de la feature) | T17/T18 |
| `specs/IA-1-login/tasks.md` | TI3 y T17 marcadas `**[x]**` | TI3/T17 |
| `progress/impl_IA-1-login.md` | esta seccion | — |

### Tests (titulos reales, con su R)

**TI3 — `identity.integration.test.ts` (7 tests):**

1. `R27: el indice global rechaza el mismo username en dos empresas y el duplicado directo`
2. `R27: tras el borrado logico, el mismo username se reusa`
3. `R26: el catalogo tiene exactamente dos roles y rechaza otros nombres o duplicados`
4. `R28: una grafia de estado fuera del conjunto cerrado no entra en users`
5. `R30: password_hash es obligatorio y una cuenta pending con hash valido se verifica al coste completo y fracasa con el desenlace uniforme de R2` (reusa el `PasswordHasher` de T8)
6. `R25: las FKs restrictivas impiden borrar companies y roles referenciados` (baja = UPDATE de `deleted_at`, nunca DELETE)
7. `RLS: companies, roles y users tienen ENABLE + FORCE y la policy app_owner_full_access` (las 3 tablas del contrato TI3)

**T17 — `login.integration.test.ts` (11 tests):**

1. `R15: cinco fallos en paralelo bloquean la cuenta y no emiten sesion`
2. `R17: fallos en paralelo sobre una cuenta YA bloqueada no la desbloquean ni la mutan`
3. `R18: el CAS ABA no puede borrar un bloqueo vigente con un estado obsoleto`
4. `R18: el CAS no aplica si el contador cambio entre lectura y escritura`
5. `R1/R3: el lector devuelve la fila unica o ninguna, sin desambiguar (decision 6)`
6. `R1: el lector no desambigua aunque exista una fila borrada con el mismo username`
7. `R21: pendiente e inactiva no entran ni con la contrasena correcta, sin escrituras de cuenta`
8. `R7: el inexistente no toca la tabla de cuentas y deja rastro sin vinculos ni secretos`
9. `R19/R20: un bloqueo caducado no frena el exito, que resetea contador, nivel y plazo y deja rastro success`
10. `R24: una fila de rastro por cada desenlace resuelto, con username y vinculos correctos`
11. `decision 3/R24: el CAS agotado deja annotation_failed en la fila real`

### Desviaciones y hallazgos (para el reviewer)

1. **`unknown_user` existe en el CHECK pero el servicio nunca lo escribe**: `verify-credentials-service.ts` emite `bad_credentials` en los 4 caminos de fallo de credenciales, incluido el inexistente (L53). La desviacion esta documentada en la cabecera del test T17 y el test aserta el comportamiento real (`bad_credentials` a secas, sin revelar existencia — R2).
2. **Dos fallos reales de TI3 en el primer run** (corregidos en el fichero): (a) la query de conteos mezclaba `count(*)` con una columna lista sin `GROUP BY` — refactorizada a subselects; (b) los chequeos de RLS via `pg_class`/`pg_policies` matcheaban tambien `auth.users` de Supabase (esquema `auth`, no `public`) — filtro `relnamespace = 'public'::regnamespace` y `schemaname = 'public'` (y el conteo de tablas publicadas con `to_regclass`).
3. **CAS agotado probado de verdad**: 8 pools writer haciendo `UPDATE users SET failed_login_attempts = failed_login_attempts + 1` en 3 rondas contra la misma cuenta (mismo `pg` Pool del adapter); el CAS se agota y la fila real queda `annotation_failed = true`. 28 filas de rastro, todas con el desenlace esperado.
4. **bcryptjs emite `$2b$10$`**, no `$2a$` (verificado con un probe temporal: prefijo `$2b$10$`, len 60, ambos fixtures). Sin impacto: `bcrypt.compare` maneja ambos y los tests T8 ya cubren el hasher.
5. **`tsconfig.json` no incluye `*.mts`** (`include: ["**/*.ts","**/*.tsx"]`): los scripts `seed/cleanup` `.mts` no los cubre `tsc --noEmit`. Son scripts de operacion (mismo estatus que `db-rollback.ts` era con `pg.d.ts`); se verifican con `tsx` real. Sigue pendiente la decision de incluir `**/*.mts` en el include (quedaria como sugerencia al reviewer — no se toco la config).
6. **Self-contained por contrato**: los dos archivos de integracion NO comparten helpers (cada uno lleva sus fixtures y el `fijarEstado`), para que los nombres de archivo y casos del spec sean exactos y los archivos se puedan mover a `tests/` del stack base sin arrastrar dependencias.
7. **Los tests de integracion se conectan a `DATABASE_URL` (6543) tal cual**: ni ssl ni override; `pg` Pool con `connectionString` y `PrismaClient` con el adapter `PrismaPg` (camino de la app). El historial de `DIRECT_URL` (IPv6) solo afecta a `prisma migrate`, ya documentado en Tanda 6.

### Mapa R<n> -> test (delta; la tabla completa queda en T19)

| R<n> | Test |
| --- | --- |
| R1 | T17 `R1/R3: el lector devuelve la fila unica o ninguna...` + `R1: el lector no desambigua aunque exista una fila borrada...` (base real) |
| R4/R5 | TI3 `R30: ...pending con hash valido se verifica al coste completo...` (reuso del hasher real) |
| R7 | T17 `R7: el inexistente no toca la tabla de cuentas y deja rastro...` (base real) |
| R15 | T17 `R15: cinco fallos en paralelo bloquean...` (base real) |
| R17 | T17 `R17: fallos en paralelo sobre una cuenta YA bloqueada...` (base real) |
| R18 | T17 `R18: el CAS ABA...` + `R18: el CAS no aplica si el contador cambio...` (base real) |
| R19/R20 | T17 `R19/R20: un bloqueo caducado no frena el exito...` (base real) |
| R21 | T17 `R21: pendiente e inactiva no entran...` (base real) |
| R23 | TI3 + T17 (fixtures auto creados/limpiados, sin seeds) + seed/cleanup scripts listos para T18 |
| R24 | T17 `R24: una fila de rastro por cada desenlace...` + `decision 3/R24: el CAS agotado deja annotation_failed...` (filas reales) |
| R25 | TI3 `R25: las FKs restrictivas impiden borrar companies y roles referenciados` (base real) |
| R26 | TI3 `R26: el catalogo tiene exactamente dos roles...` (base real) |
| R27 | TI3 `R27: el indice global rechaza...` + `R27: tras el borrado logico...` (base real) |
| R28 | TI3 `R28: una grafia de estado fuera del conjunto cerrado...` (base real) |
| R30 | TI3 `R30: password_hash es obligatorio...` (base real, coste completo) |
| RLS | TI3 `RLS: companies, roles y users tienen ENABLE + FORCE...` (base real) |

### Verificacion (salidas reales, backend_dev — regla del gate)

- `pnpm typecheck` -> OK (`tsc --noEmit`, 0 errores).
- `pnpm lint` -> OK (provisional: `tsc --noEmit`).
- `pnpm exec vitest related --run tests/integration/identity.integration.test.ts
  tests/integration/login.integration.test.ts tests/unit/architecture-login.test.ts
  tests/guards/guard-dependencias-aprobadas.test.ts` ->
  **`Test Files 4 passed (4)` / `Tests 28 passed (28)`** (7 + 11 + 5 + 5). Primera corrida
  26/28 (los 2 fallos de TI3 del punto 2); corregidos, 28/28.
- Seed verificado 2 veces (idempotente): salida
  `E2E_LOGIN_ADMIN_USERNAME=e2e_login_admin E2E_LOGIN_ADMIN_PASSWORD=E2eLogin-Admin-2026
  E2E_LOGIN_PENDING_USERNAME=e2e_login_pending E2E_LOGIN_PENDING_PASSWORD=E2eLogin-Pending-2026`;
  probe de estado (temp, borrado): 2 usuarios con `account_status` correcto y hash `$2b$10$`
  (60 chars); empresa `count = 1`.
- Cleanup verificado al final: `fixtures E2E de login eliminados.` y 0 filas restantes.
- Suite completa y `./init.sh` NO se corrieron (regla del gate: leader).

### Veredicto

TI3 y T17 verdes contra la base real (7 + 11 tests = 18 nuevos; 28/28 en el related),
con los fixtures auto de R23 y los scripts seed/cleanup listos y verificados para la
corrida E2E real de T18; el unico pendiente de la feature es esa corrida (la levanta el
leader con `LOGIN_E2E=1`) y el cierre de T19.

---

## Tanda 8 — E2E real (T18) + mapa R->test completo (T19)

Fecha: 2026-09-17. Con las migraciones (Tanda 6) y los tests de integracion (Tanda 7) en
verde contra la base real, se corrio el E2E de login con navegador real (`LOGIN_E2E=1`) y
se cierra el mapa completo de trazabilidad.

### T18 — corrida E2E real (salidas reales)

Fixtures: `pnpm exec tsx scripts/seed-e2e-login-fixtures.mts` (idempotente; empresa
`e2e00000-0000-4000-8000-000000000001`, `e2e_login_admin` active y `e2e_login_pending`
pending con hash real `$2b$10$`). `LOGIN_E2E=1` + las 4 `E2E_LOGIN_*` en el entorno.
Puerto 3000 libre (sin `pnpm dev` huerfano que `reuseExistingServer` pudiera reutilizar).

- `pnpm exec playwright test e2e/login.spec.ts` ->
  **`3 passed (7.1s)`**:
  1. `credenciales correctas redirigen al destino y la sesion no es visible a scripts`
     (2.0s) — redirige a /dashboard y `document.cookie` nunca contiene `qcl_session`
     (httpOnly real, R8; R1/R9 por el camino).
  2. `credenciales incorrectas se quedan en /login sin cookie y con el mensaje congelado`
     (768ms) — R2 + R12 sin cookie.
  3. `una cuenta pendiente recibe el mismo mensaje congelado y ninguna sesion` (737ms) —
     R21.

El `webServer` levanto `pnpm dev` (puerto 3000 estaba libre), que cargó `.env` y sirvio
el login real contra base. Limpieza post-corrida: `cleanup-e2e-login-fixtures.mts` ->
`fixtures E2E de login eliminados.`; luego se identifico y borro el rastro del test 2
(`username='usuario-inexistente'`, `outcome=bad_credentials` — el spec hardcodea ese
username) y se verifico la base limpia: `users=0 companies=0 login_attempts=0 roles=2`.
Nota: el `outcome` de esa fila confirma en la base real la desviacion 1 de Tanda 7 (el
servicio emite `bad_credentials` y nunca `unknown_user`, pese a que el CHECK lo admite).

### T19 — mapa completo R<n> -> test (R1-R30)

Consolidacion final (unit + integracion + E2E + estructural). Nombres de archivo, no
solo de tanda; los casos clave citados por su titulo.

| R | Test(es) y archivo |
| --- | --- |
| R1 | `tests/unit/verify-credentials.test.ts` (acepta activo+correcta) · `tests/integration/login.integration.test.ts` (`R1/R3` lector fila unica/ninguna; `R1` sin desambiguar con fila borrada) · `e2e/login.spec.ts` (entra y redirige) |
| R2 | `verify-credentials.test.ts` (mismo objeto congelado REJECTED) · `tests/unit/login-border.test.ts` (mensaje = constante exportada) · `e2e/login.spec.ts` (mensaje uniforme en fallo e inexistente) |
| R3 | `login-border.test.ts` (normalizacion sin tocar password) · `lib/repositories/user-credentials-repo.ts` (query `lower()=lower()`) ejercitada por `login.integration.test.ts` (`R1/R3`) |
| R4 | `verify-credentials.test.ts` (senuelo 1× por proceso, 1 verify por intento) · `tests/unit/password-hasher.test.ts` (promesa del senuelo compartida) · `tests/integration/identity.integration.test.ts` (`R30` pending verificado al coste completo) |
| R5 | `verify-credentials.test.ts` (senuelo 1 computacion) · `password-hasher.test.ts` (mismo hasher y coste) · `identity.integration.test.ts` (idem) |
| R6 | `login-border.test.ts` (invalida no toca puertos ni hash ni sesion) |
| R7 | `verify-credentials.test.ts` (desaparecido no escribe; inexistente sin escrituras) · `login.integration.test.ts` (`R7` inexistente no toca users, rastro sin vinculos) |
| R8 | `tests/unit/session-starter.test.ts` (atributos httpOnly/lax/path/secure por entorno) · `e2e/login.spec.ts` (httpOnly comprobado en navegador) |
| R9 | `tests/unit/session-token.test.ts` (exp dentro y firmado, 8h absolutas) |
| R10 | `session-token.test.ts` (claims solo identificadores) · `verify-credentials.test.ts` (rol/org salen del puerto, jamas de la entrada) |
| R11 | `session-token.test.ts` + `session-starter.test.ts` (sin secreto/corto -> lanza, cero cookies) |
| R12 | `verify-credentials.test.ts` (ningun fallo emite sesion) · `e2e/login.spec.ts` (sin cookie en fallo) |
| R13 | `login-border.test.ts` (estado sin contrasena, valor + negativo de tipo) · `login.integration.test.ts` (columnas del rastro sin secretos) · `architecture-login.test.ts` (estructural, sin logs de secretos) |
| R14 | `verify-credentials.test.ts` + `login-border.test.ts` (sid/attemptId nuevos por invocacion) · `tests/unit/session-id-factory.test.ts` (UUIDs no derivados) |
| R15 | `tests/unit/account-lock-policy.test.ts` (quinto fallo bloquea y reinicia) · `login.integration.test.ts` (`R15` cinco paralelos bloquean) |
| R16 | `account-lock-policy.test.ts` (escalada 1/5/15/60, tope 60, nunca permanente) |
| R17 | `verify-credentials.test.ts` (bloqueada verifica 1 vez con correcta e incorrecta) · `login.integration.test.ts` (`R17` paralelos sobre bloqueada no desbloquean) |
| R18 | `account-lock-policy.test.ts` (fallo estando bloqueada: estado intacto) · `login-attempt-repo.ts` (predicado del CAS por RANGO) · `login.integration.test.ts` (`R18` ABA + contador cambiado, updateMany real) |
| R19 | `account-lock-policy.test.ts` (reloj inyectado: caducado acepta) · `lib/services/login/account-status.ts` (orden de ramas) · `login.integration.test.ts` (`R19/R20` caducado no frena el exito) |
| R20 | `account-lock-policy.test.ts` (exito resetea los tres) · `login.integration.test.ts` (`R19/R20` reset + rastro success) |
| R21 | `verify-credentials.test.ts` (cortes de estado/org sin escrituras) · `login.integration.test.ts` (`R21` pending/inactive no entran) · `e2e/login.spec.ts` (pending, mismo mensaje, sin sesion) |
| R22 | `tests/unit/architecture-login.test.ts` (grep: solo `lib/composition/login.ts` importa adaptadores) |
| R23 | `identity.integration.test.ts` + `login.integration.test.ts` (fixtures auto creados/limpiados, assert sin filas) · `scripts/seed-e2e-login-fixtures.mts` + `scripts/cleanup-e2e-login-fixtures.mts` (fixtures E2E) |
| R24 | `verify-credentials.test.ts` (recordAttempt por desenlace + CAS agotado annotation_failed) · `login.integration.test.ts` (`R24` fila por desenlace con vinculos; `decision 3/R24` annotation_failed real con 8 writers) |
| R25 | `db/migrations/.../init_identity/migration.sql` (FKs restrictivas, esquema) · `identity.integration.test.ts` (`R25` baja=UPDATE deleted_at, FKs impiden DELETE) · `user-credentials-repo.ts` (filtro del puerto `deleted_at IS NULL`) |
| R26 | `db/migrations/.../seed_roles/migration.sql` (INSERT de 2 con ON CONFLICT) · `identity.integration.test.ts` (`R26` catalogo=2, otros/duplicados rechazados) · `session-token.test.ts` (role del ticket en conjunto cerrado) |
| R27 | `init_identity/migration.sql` (indice global funcional/parcial) · `identity.integration.test.ts` (`R27` duplicado entre empresas; reuso post-borrado) · `user-credentials-repo.ts` (sin desambiguacion, sin LIMIT 2) |
| R28 | `init_identity/migration.sql` (CHECK estados) · `identity.integration.test.ts` (`R28` grafias rechazadas) |
| R29 | `password-hasher.ts` (unico hasher, coste 10) · `architecture-login.test.ts` (grep bcrypt solo en password-hasher) |
| R30 | `architecture-login.test.ts` (sin `must_change_password`; sin rechazo por forma) · `password-hasher.test.ts` (fail-closed, sin centinela) · `identity.integration.test.ts` (`R30` NOT NULL; pending al coste completo) |

Sin R huerfanos: las 30 filas tienen test y archivo. El mapa del spec (tasks.md, nota
2026-09-16) se cumple integro: R25-R30 cerrados por TI1/TI3, R23 por los fixtures auto y
los scripts E2E, y las filas que citaban T18 como test quedaron con la corrida real 3/3.

### Verificacion (salidas reales, implementer — regla del gate)

- `pnpm typecheck` -> OK. `pnpm lint` -> OK (provisional: `tsc --noEmit`).
- `pnpm exec vitest related --run tests/integration/identity.integration.test.ts
  tests/integration/login.integration.test.ts tests/unit/architecture-login.test.ts
  tests/guards/guard-dependencias-aprobadas.test.ts` -> 28/28 (corrido por backend_dev en
  Tanda 7; aqui no se repitio la suite — solo se añadieron scripts de operacion `.mts` y
  documentacion).
- `pnpm exec playwright test e2e/login.spec.ts` con `LOGIN_E2E=1` y fixtures -> 3/3 (7.1s).
- Scripts seed (2×) y cleanup (1×) corridos reales; base verificada limpia al final.
- Suite completa y `./init.sh` NO se corrieron (regla del gate: leader).

### Tasks marcadas en tasks.md

- **T18** ya estaba `[x]` (Tanda 5 retoma, artefacto); la corrida REAL queda registrada
  en esta tanda (3/3).
- **T19 `[x]`** — marcada en tasks.md al escribir este mapa.

### Veredicto

Cierre de la feature en verde: todas las tasks de `specs/IA-1-login/tasks.md` completas,
con la base real aplicada y verificada (T0/TI1/TI2/T14), 28 tests de integracion+guardias
y 3 E2E reales habilitados por `.env`, y el mapa R1-R30 sin huerfanos. El unico bloqueo
vivido (ruteo IPv6 del direct connection) quedo resuelto con workaround documentado y sin
tocar `.env`. Queda al leader: `./init.sh --rapido` y `./init.sh` completo antes del PR, y
decidir si `DIRECT_URL` debe apuntar al session pooler en `.env`.
