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