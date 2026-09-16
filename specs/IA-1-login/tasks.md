# tasks.md — IA-1 login (port)

Checklist de implementacion para `requirements.md` + `design.md` de IA-1. El `implementer` las
ejecuta en orden, marcando `[x]`; **`[P]`** = paralelizable (sin conflicto de archivos entre
si). Cada tarea cierra con su criterio de «hecho». Todo el trabajo ocurre en el worktree
`.worktrees/IA-1-login/` sobre la rama `feature/IA-1-login` (el leader la creo).

**Ampliaciones 2026-09-16 (decision 7; el spec vuelve a F1.4 con ellas):** se añaden el
**Bloque 0** —stack base (TS1-TS6), infraestructura previa sin R propio— y el **Bloque I**
—identidad minima, R25-R30 (TI1-TI3)—. T1-T19 conservan su numeracion; T0 deja de ser
STOP-and-report y pasa a **preflight** tras TI1/TI2.

Convenciones:

- `[ ]` pendiente · `[x]` hecha · `[P]` paralelizable (respetando dependencias).
- La verificacion que el `implementer` corre es la de su zona (typecheck, lint y `vitest
  related` sobre sus archivos — `AGENTS.md > Regla del gate`); la suite completa y el gate
  (`./init.sh`) los corre el **leader**. `tasks.md` dice QUE se verifica; los comandos exactos
  los marca el leader.
- `progress/impl_IA-1-login.md` = bitacora del implementer (archivos tocados, mapa
  `R<n> -> test`, salida de tests).
- Toda dependencia nueva debe estar en `docs/dependencias.md` (aprobada en F1.4 junto al spec —
  esta ronda la re-aprueba con las ampliaciones A/B) antes de instalarse. Nada se instala «por
  si acaso».
- El **unico bloqueo por entorno** es la config (`SESSION_SECRET`/`DATABASE_URL`/`DIRECT_URL`
  de T0). El stack y la identidad ya son de esta feature (decision 7): no existe base externa
  por la que parar y reportar.

---

## Bloque 0 — Stack base (ampliacion A, decision 7) — infraestructura previa, sin R propio

El stack del repo **no esta montado** en esta rama (T0 dejaba de correr antes de empezar); este
bloque lo construye como base de todo lo demas. Salvo TS1 (declara, no instala), las tareas del
bloque dependen de T1.

### TS1 — `package.json`, tsconfig strict y layout base

Crea/escribe en la raiz del worktree:

- `package.json`: `"type": "module"`, scripts base (`typecheck`, `lint`, `db:migrate`,
  `db:migrate:create`, `db:rollback`) y el campo `"prisma": { "schema": "db/schema.prisma" }`.
- `tsconfig.json`: **strict** (`conventions.md`/`architecture.md`), rutas `@/*` -> `./*`.
- `db/schema.prisma`: datasource `postgresql` con `url = env("DATABASE_URL")` y
  `directUrl = env("DIRECT_URL")`; **aun sin models** (los añaden TI1 y T14).

**Hecho:** los scripts estan declarados y `pnpm typecheck`/`pnpm lint` pasan tras T1; el schema
apunta a `db/schema.prisma`.

### T1 — Instalar dependencias aprobadas

Instala (y solo estas) las dependencias aprobadas en F1.4; verificar que cada fila de
`docs/dependencias.md` dice `aprobada` con fecha. **Dos listas:**

- **Stack base** (tabla «Stack base» del `design.md`): `next`, `react`, `react-dom`; dev:
  `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss`,
  `@tailwindcss/postcss`, `tsx`, `pg`.
- **Feature** (tabla de dependencias del `design.md`): `bcryptjs`, `zod`,
  `@prisma/client@7.10.0`, `prisma@^7.10.0` (dev), `vitest` (dev), `@playwright/test` (dev).

Correcciones de la verificacion de los 4 checks con red (2026-09-16):

- `@types/bcryptjs` **NO se instala**: es un stub deprecado («This is a stub types definition.
  bcryptjs provides its own type definitions»); bcryptjs 3.x trae sus propios tipos.
- `prisma` **se pinea a `^7.10.0`** (casa con `@prisma/client@7.10.0`): `npm view prisma
  version` devuelve `8.0.0-rc.15`, un release candidate; no se instala como `@latest`.
- El resto de la pila de stack base se instala a la **version estable actual** de cada paquete
  (los 4 checks de `architecture.md` se corren con red en este paso).

**Hecho:** `package.json` contiene exactamente lo del registro (nada «por si acaso»);
`pnpm typecheck` y `pnpm lint` pasan; una linea en `progress/impl_IA-1-login.md` con el
resultado. Si alguna fila no esta aprobada: **PARA y reporta**.

### TS2 — [P] Next.js App Router + Tailwind v4 (depende de T1 y TS1)

- Layout de la app segun `architecture.md` (`app/(public)/` y `app/(private)/` si el repo lo
  define asi) y `app/(public)/layout.tsx` minimo para que `/login` tenga donde vivir.
- Tailwind v4: `postcss.config.*` + directiva `@import "tailwindcss"` en la hoja de estilos.

**Hecho:** la app arranca (`pnpm dev` levanta y responde); Tailwind compila (un estilado de
humo visible en cualquier componente).

### TS3 — [P] Prisma cableado (depende de T1 y TS1)

`prisma generate` + cliente disponible; `db:migrate:create <nombre>` genera
`db/migrations/<timestamp>_<nombre>/` con `migration.sql` + `down.sql` (convencion
`architecture.md > Migraciones`; el down lo escribe el implementer, no Prisma).

**Hecho:** `pnpm exec prisma validate` pasa; `db:migrate:create smoke` produce las dos carpetas
esperadas en un dry-run y se descarta.

### TS4 — [P] vitest + guardia de dependencias (depende de T1 y TS1)

- Config de vitest (include de `tests/`).
- `tests/guards/guard-dependencias-aprobadas.test.ts`: recorre `docs/dependencias.md` y falla
  si hay una fila sin `aprobada` — la materializacion de «nada se instala por si acaso»
  (`architecture.md > Dependencias de terceros`).

**Hecho:** `pnpm exec vitest run tests/guards` verde (la guardia pasa contra
`docs/dependencias.md` ya completado por el leader en F1.4).

### TS5 — [P] Playwright (depende de T1 y TS1)

Config E2E (baseURL local, chromium) y `e2e/` en el scope de `package.json`.

**Hecho:** `pnpm exec playwright install chromium` ejecutado; un smoke test corre y pasa.

### TS6 — [P] `.env.example` + `.gitignore` (depende de T1)

- `.env.example` con `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` (>= 32),
  `LOGIN_MAX_FAILED_ATTEMPTS` (default 5) y `LOGIN_LOCK_MINUTES` (default "1,5,15,60") —
  **sin valores reales** (los nombres y defaults de `design.md`).
- Amplia el `.gitignore` existente: `.next/`, `coverage/`, `playwright-report/`,
  `test-results/` (`.env` y `node_modules/` ya estaban).

**Hecho:** `.env.example` versionado y sin secretos; `git status` no muestra `.env`,
`node_modules/` ni `.next/`.

---

## Bloque I — Identidad minima (ampliacion B, decision 7) — R25-R30

Crea el esquema y el catalogo que el login consume (`design.md > Modelo de datos y migracion`).
Depende de TS3. Orden: **TI1 → TI2**; TI3 es paralelo al Bloque A.

### TI1 — Migracion `init_identity` (R25, R26-esquema, R27, R28, R30-esquema)

`db/migrations/<timestamp>_init_identity/` con:

- `migration.sql`: tablas `companies`, `roles` y `users` segun el schema de `design.md`; FKs
  de `users` a `companies`/`roles` **restrictivas** (`ON DELETE RESTRICT`); CHECK
  `account_status IN ('active','pending','inactive','blocked')` (R28); CHECK `roles.name IN
  ('admin_maestro','admin')` + UNIQUE (R26); `password_hash` **NOT NULL** (R30); indice global
  **escrito a mano** — `CREATE UNIQUE INDEX users_username_unique_active ON users
  (lower(username)) WHERE deleted_at IS NULL;` (R27; el schema Prisma NO lleva `@unique` sobre
  `username`).
- RLS en las tres tablas: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` + policy
  `app_owner_full_access`: `FOR ALL TO CURRENT_USER USING (true) WITH CHECK (true)` (`design.md`
  §10, alternativa 9 — la policy del owner es obligatoria; sin ella Prisma/owner queda fuera).
- `down.sql` **OBLIGATORIO** que revierte exactamente el `migration.sql` (DROP TABLE con sus
  objetos RLS e indice).

**Hecho:** `db:migrate` aplica en la base de la feature; `db:rollback` la revierte y deja
`_prisma_migrations` consistente; `\d users` muestra el indice global (y no `username` UNIQUE
plano).

### TI2 — Migracion `seed_roles` — catalogo cerrado (R26)

`db/migrations/<timestamp>_seed_roles/` (data migration, no `prisma db seed` — alternativa 8
del design):

- `migration.sql`: `INSERT INTO roles (id, name) VALUES (gen_random_uuid(), 'admin_maestro'),
  (gen_random_uuid(), 'admin') ON CONFLICT (name) DO NOTHING;`
- `down.sql`: `DELETE FROM roles WHERE name IN ('admin_maestro','admin');`

**Hecho:** tras `db:migrate`, `SELECT count(*) FROM roles` = **2** con los nombres del conjunto
cerrado; `db:rollback` los elimina.

### TI3 — [P] Integration — identidad (R25-R30; paralelo con el Bloque A)

`tests/integration/identity.integration.test.ts`, base real de la feature, fixtures
auto-creados y limpiados (R23):

- el indice global rechaza el mismo `username` en **dos empresas** y un INSERT duplicado; tras
  borrado logico (`deleted_at`), el mismo `username` **se reusa** (R27).
- el catalogo tiene **exactamente dos roles**; INSERT de otro nombre o duplicado falla (R26).
- grafias de estado fuera de `active|pending|inactive|blocked` fallan (R28).
- `password_hash` NOT NULL: INSERT sin hash falla; una cuenta `pending` con **hash valido** se
  verifica al coste completo y fracasa con el desenlace uniforme de R2 (R30 con R4/R5;
  se reusa el hasher de T8, ya disponible).
- baja = UPDATE de `deleted_at`, nunca DELETE; las FKs restrictivas impiden borrar `companies`/
  `roles` referenciados (R25).
- flags RLS (`relrowsecurity`, `relforcerowsecurity`) y policy `app_owner_full_access` en las
  tres tablas.

**Hecho:** `vitest related --run tests/integration/identity.integration.test.ts` verde;
fixtures limpios al final.

---

## T0 — Preflight (sustituye al GATE; decision 7)

Confirma en orden:

1. **Scaffolding** del Bloque 0 completo (TS1-TS6): `pnpm typecheck`, `pnpm lint` y
   `pnpm exec vitest run tests/guards` pasan.
2. **Entorno** de la feature: `SESSION_SECRET` (>= 32 chars) y `DATABASE_URL` + `DIRECT_URL`
   alcanzables (item 9 del prerrequisito) — un `prisma migrate status` contra la base.
3. **Migraciones** TI1 + TI2 aplicadas: `SELECT count(*) FROM roles` = **2** (decision 5).

**Hecho:** checklist en `progress/impl_IA-1-login.md`. Si falta **config de entorno** (2), la
tarea queda `[ ]` y el leader gestiona con el humano — es el **unico bloqueo** de esta feature
(antes lo era la identidad externa, que ya no existe). Si TI1/TI2 no estan aplicadas es bug de
rama: se aplican las migraciones, no se reporta al board.

---

## Bloque A — Dominio (depende de T0; no toca DB ni framework)

### T2 — Tipos, schemas y constantes

Crea en `lib/types/`:

- `identity-constants.ts`: `USERNAME_MAX_LENGTH` (un solo numero compartido con la feature de
  alta; provisional = 255, ver `design.md`) y `CREDENTIAL_MAX_LENGTH = 64`.
- `login.ts`: `loginInputSchema` zod (username `trim().min(1).max(USERNAME_MAX_LENGTH)`;
  password `min(1).max(64)` **sin trim**), `LoginFormState` (union discriminada, **sin campo
  de contrasena** — invariante 15), `LOGIN_INITIAL_STATE`, `DASHBOARD_ROUTE` (provisional).
- `login-copy.ts`: mensajes **constantes exportadas y provisionales**
  («Usuario o contrasena incorrectos.», «Este campo es obligatorio.», «La contrasena no puede
  superar los N caracteres.»).

**Hecho:** `pnpm typecheck` pasa; el tipo `LoginFormState` no admite contrasena (compila un
negativo de tipo en el test T7); las constantes estan exportadas.

### T3 — Interfaces de los cinco puertos

Crea en `lib/interfaces/` (firmas del `design.md > Arquitectura`, valores **crudos**):

- `repositories/i-user-credentials-reader.ts` — `IUserCredentialsReader`
  (`findActiveByUsername` devolviendo `AuthenticatableUser | null` con id, passwordHash,
  failedLoginAttempts, lockLevel, lockedUntil, accountStatus crudo, roleName, companyId,
  companyDeleted).
- `repositories/i-login-attempt-recorder.ts` — `ILoginAttemptRecorder`
  (`compareAndSet`/`set`/`recordAttempt`; `null` en `estadoNuevo` = «no toques esa columna»).
- `services/i-password-hasher.ts` — `IPasswordHasher` (`hash`/`verify`, fail-closed).
- `services/i-session-starter.ts` — `ISessionStarter` (`startSession(ticket)`; puede lanzar).
- `services/i-session-id-factory.ts` — `ISessionIdFactory` (`newSessionId(): string`).

**Hecho:** compilan; ningun tipo importa de Prisma/Next; la firma de `IUserCredentialsReader`
no devuelve un booleano «activa» cocinado.

### T4 — Dominio puro

Crea en `lib/services/login/`:

- `account-status.ts`: `effectiveAccountStatus(...)` — UNA funcion, orden de ramas fijado
  (1 crudo no activo -> `account_not_active`; 2 organizacion borrada -> `org_inactive`;
  3 `lockedUntil > now` -> `account_blocked`; 4 resto -> activo), invariante 13.
- `account-lock-policy.ts`: calculo de escalada puro (5° fallo bloquea y reinicia; 1/5/15/60;
  tope 60; nunca permanente), con `clock()` inyectado.
- `verify-credentials-service.ts`: caso de uso `(loginInput, ctx) -> Promise<{ok: boolean}>`
  con los 5 puertos en `ctx`; exactamente una verificacion de hash por intento (invariante 2);
  senuelo en el camino inexistente (R4); cortes de estado/org DESPUES del hash; CAS con
  relectura + recalculo + reintento **sin rehash** (invariantes 7-8), tope ~10 y
  `recordAttempt(annotation_failed: true)` al agotarse (decision 3, R24); rechazo = **una sola
  instancia congelada** (invariante 1); exito: `set` reset + `startSession` (la excepcion se
  propaga — invariante 9) + rastro `success`.

**Hecho:** sin imports de Prisma ni de `next/*` (se verifica con el test estructural de T13);
`pnpm typecheck` pasa; el caso de uso no instancia nunca un adaptador.

### T5 — [P] Unit: caso de uso con puertos falsos (R1, R2, R4, R5, R7, R12, R14, R17, R21, R24)

`tests/unit/verify-credentials.test.ts` (puertos falsos, sin base ni hash real):

- activo + contrasena correcta -> `{ok:true}` + `startSession` llamado con sub/roleName/
  companyId **de lo que devolvio el puerto**, jamas de la entrada (invariantes 10-11, R10).
- inexistente, contrasena incorrecta y bloqueada -> **el mismo objeto** congelado (R2).
- entrada invalida **no toca ningun puerto** (R6, cubierto tambien en T7).
- ningun camino de fallo llama `startSession` (R12); ningun camino de fallo de cuenta llama
  `set`/`compareAndSet` (R7, R21).
- el senuelo se calcula una sola vez por proceso y se verifica una vez por intento (R4, R5).
- el camino bloqueado verifica el hash **una vez** (R17 + invariante 2), con contrasena
  correcta o incorrecta.
- perdida de la carrera: `compareAndSet` devuelve `false` -> se relee, se recalcula la politica
  y se reintenta **sin volver a llamar al hasher** (espia: count de llamadas a `verify`).
- usuario que desaparece entre el intento y el reintento: el reintento no escribe (R7).
- CAS agotado tras ~10 reintentos: `recordAttempt` con `annotation_failed: true`, y el log
  resultante sigue siendo el rechazo congelado (decision 3, R24).
- rastro: en CADA desenlace resuelto se llama `recordAttempt` con username/outcome/vinculos
  correctos y **sin** contrasena ni hash ni valor de sesion (R13 parcial, R24).

**Hecho:** `pnpm exec vitest related --run tests/unit/verify-credentials.test.ts` verde; el
archivo nombra los casos por comportamiento (convencion `conventions.md > Tests`).

### T6 — [P] Unit: politica de bloqueo con reloj inyectado (R15, R16, R19, R20)

`tests/unit/account-lock-policy.test.ts`:

- quinto fallo bloquea y reinicia el contador (R15).
- escalada 1/5/15/60 por nivel; a partir del cuarto se repite 60; nunca permanente (R16).
- con bloqueo caducado vuelve a aceptar, sin intervencion manual (R19) — probado con reloj
  inyectado, no con esperas reales.
- fallo estando bloqueada devuelve el mismo estado (sin sumar, sin subir nivel, sin alargar;
  R18); un exito deja los tres a cero (R20).

**Hecho:** suite verde; usa un `clock` fake; sin sleeps.

### T7 — [P] Unit: borde y formulario (R2, R3, R6, R13, R21)

`tests/unit/login-border.test.ts`:

- campos vacios y contrasena demasiado larga -> errores **por campo** y ningun puerto tocado
  (R6; el borde devuelve `status:'invalid'` con `fieldErrors`).
- el mensaje de autenticacion es **el mismo** para inexistente y para contrasena mala, y es la
  constante exportada (R2).
- la normalizacion del usuario (trim + minusculas) deja la contrasena **intacta** (R3).
- el estado devuelto **nunca** contiene contrasena (invariante 15/R13); afirmado sobre el tipo
  (negativo de compilacion) y sobre el valor.
- `attemptId` distinto por invocacion; conserva el `username` escrito tras un rechazo.
- destino `next`: interno valido manda; externo/esquema/autoridad se descartan y se cae a
  `DASHBOARD_ROUTE` (sin open redirect).

**Hecho:** suite verde.

---

## Bloque B — Adaptadores (dependen de T2+T3; [P] entre si)

### T8 — [P] Hasher — el UNICO del repo (R29)

`lib/services/login/password-hasher.ts` (implementa `IPasswordHasher`):

- bcryptjs coste **10** (decision 4); `verify` fail-closed (hash vacio/corrupto -> `false`, sin
  lanzar); tope 64/72 bytes respetado por el borde (T2).
- senuelo: texto fijo hasheado con **este mismo hasher**, promesa cacheada por proceso y
  calentada en la composicion (R4, R5, `design.md > Senuelo`).
- **R29**: este archivo es el **unico hasher del repo y nace compartido** — el alta y el cambio
  de credencial futuros lo importan desde aqui; nada de implementaciones paralelas (el grep de
  T13 lo verifica).

**Hecho:** unit tests (`tests/unit/password-hasher.test.ts`): fail-closed, promesa compartida
entre dos llamadas concurrentes, coste configurable a 10; typecheck.

### T9 — [P] Fabrica de id de sesion

`lib/services/login/session-id-factory.ts` (implementa `ISessionIdFactory`): `crypto.randomUUID`.

**Hecho:** devuelve un UUID por llamada; unit test: dos llamadas -> ids distintos.

### T10 — [P] Token de sesion

`lib/services/login/session-token.ts` (usado por `SessionStarter` y, en el futuro, por el
interceptor): formato `v1.<payloadBase64Url>.<hmacBase64Url>`; HMAC-SHA-256 via WebCrypto;
comparacion de firmas con `crypto.timingSafeEqual`; claims `{sub, iat, exp, role, cid, sid}`;
`exp = iat + 8h` **absoluta** viajando dentro del valor firmado (R9); secreto leido en la
llamada, min 32, fallo cerrado (R11); version `v1.` exigida — formato anterior se rechaza **sin
verificar firma** (version sin back-compat). `role` solo puede valer `admin_maestro` o `admin`
(conjunto cerrado, decision 5/R26).

**Hecho:** unit tests (`tests/unit/session-token.test.ts`): claims completos y solo
identificadores (R10); exp dentro y firmado; firma alterada o de otro secreto -> rechazo;
version vieja rechazada sin verificar firma; sin secreto / corto -> lanza (R11). Edge-ready: el
modulo no importa de `next/*`.

### T11 — [P] Escritor de cookie

`lib/services/login/session-starter.ts` (implementa `ISessionStarter`): usa `session-token` y
escribe la cookie `qcl_session` provisional con `httpOnly`, `sameSite=lax`, `path=/`,
`secure` solo en produccion, sin dominio (R8).
**Hecho:** unit tests: atributos de la cookie correctos por entorno; `startSession` lanza si el
secreto no esta configurado (R11); typecheck.

### T12 — [P] Repositorios

`lib/repositories/user-credentials-repo.ts` (implementa `IUserCredentialsReader`):
`$queryRaw` parametrizado con `lower(username) = lower($1)` y filtro `users.deleted_at IS
NULL` (el filtro «no borrado» es del puerto; los cortes de acceso NO van en el SQL —
invariante 14). Las tablas `users`/`companies`/`roles` las creo **esta feature** (TI1) y los
roles del catalogo los sembro TI2. **Sin desambiguacion** (decision 6): la unicidad del
identificador es GLOBAL —indice funcional y parcial `lower(username) WHERE deleted_at IS
NULL` (TI1, R27)—, asi que el lector devuelve la fila unica o `null`; **no existe `LIMIT 2`**
ni rama de ambiguedad.

`lib/repositories/login-attempt-repo.ts` (implementa `ILoginAttemptRecorder`):

- `compareAndSet`: `Prisma updateMany` con predicado = contador esperado **y** estado de cuenta
  esperado **y** (`locked_until IS NULL OR locked_until <= ahora`) — plazo por RANGO, nunca por
  igualdad (invariante 6); devuelve si afecto filas.
- `set`: actualizacion incondicional; `null` en `estadoNuevo` = no incluir la columna
  (invariante 12).
- `recordAttempt`: INSERT en `login_attempts` (tabla de T14) con los campos del rastro (nunca
  contrasena/hash/sesion — R13).

**Hecho:** compilan; typecheck; las queries se cubren en T17 (base real) y los mocks de Prisma
quedan prohibidos como unico test (el CAS se prueba de verdad en T17).

---

## T13 — Composicion unica + test estructural (R22, R29, R30)

`lib/composition/login.ts`: unico archivo que importa los adaptadores (T8-T12), construye el
`ctx` y expone `verifyCredentials` compuesto. Parseo de entorno **fail-fast** en la
composicion: `LOGIN_MAX_FAILED_ATTEMPTS` (default 5) y `LOGIN_LOCK_MINUTES` (default
"1,5,15,60"); valor invalido -> throw al arrancar (decision 1). Calienta el senuelo.

Test estructural (`tests/unit/architecture-login.test.ts` o linter de capas):

- ningun archivo fuera de `lib/composition/login.ts` importa adaptadores concretos
  (`lib/repositories/*`, `lib/services/login/*`); el caso de uso se construye con puertos.
- un solo hasher en el repositorio (grep: `bcrypt` solo en `password-hasher.ts`) — R29.
- una sola implementacion de firma (WebCrypto/HMAC solo en `session-token.ts`).
- sin `must_change_password` en ninguna migracion/schema/codigo (R30 — «no se replica el
  patron de una columna declarada y no consumida» de `## No implementar`).
- sin rechazo por forma de hash antes del coste: los parametros de `verify` no distinguen
  «hash centinela» de «hash real» (R30 — nada de `'!'`/NULL fast-fail; T8 y TI3 cubren el
  comportamiento, aqui el grep).

**Hecho:** composicion compila; el test estructural pasa; `pnpm lint` sin hallazgos en los
archivos nuevos.

---

## Bloque C — Action, migracion y pantalla

### T14 — Migracion `login_attempts` (R24)

`db/migrations/<timestamp>_add_login_attempts/` con:

- `migration.sql`: tabla `login_attempts` segun `design.md > Modelo de datos` (uuid PK
  `gen_random_uuid()`, `company_id` nullable FK -> companies, `user_id` nullable FK -> users
  `ON DELETE SET NULL`, `username` NOT NULL, `outcome` NOT NULL con CHECK del conjunto cerrado,
  `annotation_failed` bool default false, `attempted_at` timestamptz default now(),
  `ip_address inet`, `user_agent` varchar(512), indices por userId/companyId/username +
  attemptedAt DESC).
- **RLS** igual que TI1: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` + policy
  `app_owner_full_access`: `FOR ALL TO CURRENT_USER USING (true) WITH CHECK (true)` (design
  §10; alternativa 9 — la policy del owner es obligatoria, no «sin policies» como decia la
  ronda 1).
- `down.sql` **OBLIGATORIO** que revierte exactamente el `migration.sql`.
- Las FKs apuntan a `users`/`companies`, que ya existen por TI1 — sin bloqueo de T0 en este
  paso.

**Hecho:** creada con `db:migrate:create`; `down.sql` escrito; `db:migrate` aplica en la base
de la feature; `db:rollback` la revierte y deja `_prisma_migrations` consistente.

### T15 — Server Action (Controller)

`lib/actions/login.ts` ('use server'): recibe `(prevState, formData)`, valida con
`loginInputSchema` (borde), compone el servicio SOLO desde `lib/composition/login.ts`, ejecuta;
exito: `redirect()` al destino resuelto (default `DASHBOARD_ROUTE`), **fuera de todo
try/catch**; fallo: devuelve `LoginFormState` (`invalid` con fieldErrors por forma, `error` con
el mensaje congelado por autenticacion), conservando el `username` (R2, R6, R21, R22).
**Hecho:** typecheck; sin logica de negocio en el action (solo borde + composicion + redirect);
sin imports de adaptadores.

### T16 — Pantalla de login (UI minima)

`app/(public)/login/page.tsx` + `app/(public)/login/components/`:

- `index.ts` (barrel: reexporta todo), `login-form.tsx` ('use client', `useActionState` con
  `loginAction` e `LOGIN_INITIAL_STATE`), `submit-button.tsx`.
- Campo oculto `next` (revalidado en servidor, T15); el formulario re-renderiza con el estado
  devuelto; multiplataforma (targets >= 44px, font >= 16px en inputs, `min-h-dvh`).

**Hecho:** ruta accesible en `/login`; barrel respetado (nadie importa por ruta profunda); sin
fetch de datos en el cliente para datos privados; pagina *no* autenticada en zona publica.

---

## Bloque D — Verificacion (y cierre)

### T17 — [P] Integration contra base real (R1, R4, R15-R21, R23, R24)

`tests/integration/login.integration.test.ts`, base real de la feature, **fixtures creados y
limpiados por el propio test** (R23: sin datos sembrados). Los fixtures crean su `company` y su
`user` resolviendo el `role_id` desde el **catalogo de TI2** (los dos roles ya estan en la
base; no se sembran de nuevo) y con `password_hash` real del hasher de T8 (R29):

- cinco fallos en paralelo bloquean la cuenta; fallos en paralelo sobre una cuenta bloqueada **no
  la desbloquean** (concurrencia de verdad).
- el ABA: un intento con estado obsoleto **no puede borrar un bloqueo vigente**; el CAS no aplica
  si el estado de cuenta cambio entre lectura y escritura.
- el lector no desambigua (decision 6): con usuarios globalmente unicos devuelve la fila unica
  o ninguna, sin `LIMIT 2` (R1, R3; la globalidad del indice la cubre TI3).
- pendiente/inactiva no entra ni con la contrasena correcta (R21); inexistente no toca la tabla
  de cuentas (R7).
- rastro (R24): fila por cada desenlace (incluido inexistente, con `user_id` NULL y `username`
  guardado), `annotation_failed` true en CAS agotado, y las columnas nunca contienen contrasena/
  hash/valor de sesion (R13).

**Hecho:** `vitest related --run` verde contra la base real de la feature; fixtures limpios al
final (assert: no quedan filas).

### T18 — [P] E2E con navegador real (R2, R8, R9, R12, R21)

`e2e/login.spec.ts` (Playwright):

- credenciales correctas -> redireccion y **cookie inaccesible a scripts** (comprobado desde
  fuera con `document.cookie`).
- credenciales incorrectas -> se queda, no recibe cookie, ve el mensaje congelado (R2, R12).
- cuenta `pending` (fixture del Bloque D la crea) -> mismo mensaje, sin sesion (R21).

**Hecho:** `pnpm exec playwright test e2e/login.spec.ts` verde; es la unica forma honesta de
afirmar R8.

### T19 — Mapa R->test y cierre

Escribe en `progress/impl_IA-1-login.md` el mapa completo `R<n> -> test` (cada R1-R30 con su
test y archivo). Referencia para el reviewer (`CHECKPOINTS.md > Trazabilidad`):

| R | Test(es) |
| --- | --- |
| R1 | T5 (acepta activo+correcta) · T17 (base real) · T18 (e2e entra) |
| R2 | T5 (mismo objeto congelado) · T7 (mensaje constante) · T18 (mensaje uniforme) |
| R3 | T7 (normalizacion sin tocar contrasena) · T12 (query del lector) |
| R4 | T5 (una verificacion por intento; senuelo) · T7 (invalida no verifica) |
| R5 | T5 (senuelo una sola vez) · T8 (mismo hasher y coste) |
| R6 | T7 (invalida no toca puertos, no hash, no sesion) |
| R7 | T5 (inexistente: sin escrituras de cuenta) · T17 (base real) |
| R8 | T11 (atributos de cookie) · T18 (httpOnly comprobado en navegador) |
| R9 | T10 (exp dentro y firmado, 8h absolutas) |
| R10 | T10 (claims solo identificadores) · T5 (rol/org salen del puerto) |
| R11 | T10 + T11 (sin secreto -> lanza, no cookie) |
| R12 | T5 (ningun fallo emite sesion) · T18 (sin cookie en fallo) |
| R13 | T7 (estado sin contrasena) · T12/T17 (columnas del rastro) · T13 (estructural, sin logs de secretos) |
| R14 | T5 + T7 (ids distintos por invocacion) · T9 (UUIDs distintos por emision, no derivados) |
| R15 | T6 (quinto fallo bloquea y reinicia) · T17 (5 paralelos bloquean) |
| R16 | T6 (escalada 1/5/15/60, tope 60) |
| R17 | T5 (bloqueada con correcta rechaza) · T17 (paralelos no desbloquean) |
| R18 | T6 (fallo durante bloqueo: estado intacto) · T12 (predicado del CAS) |
| R19 | T6 (reloj inyectado: caducado acepta) · T4 (account-status) |
| R20 | T6 (exito resetea los tres) · T17 |
| R21 | T5 (no activa rechaza, sin escrituras) · T17 (pendiente/inactiva) · T18 (pending, mensaje) |
| R22 | T13 (estructural: solo composicion elige) |
| R23 | T17 + T18 + TI3 (fixtures auto creados/limpiados, sin seeds) |
| R24 | T5 (recordAttempt por desenlace + CAS agotado) · T17 (filas reales, inexistente incluido) |
| R25 | TI1 (esquema, FKs restrictivas) · TI3 (borrado logico, no DELETE) · T12 (filtro `deleted_at IS NULL` del puerto) |
| R26 | TI2 (catalogo = 2) · TI3 (rechazos de otros/duplicados) · T10 (role del ticket en el conjunto cerrado) |
| R27 | TI1 (indice global) · TI3 (duplicado entre empresas; reuso post-borrado) |
| R28 | TI1 (CHECK estados) · TI3 (grafias rechazadas) |
| R29 | T8 (unico hasher, coste 10) · T13 (grep: bcrypt solo en `password-hasher.ts`) |
| R30 | T13 (sin `must_change_password`; sin rechazo por forma) · T8 (fail-closed, sin centinela) · TI3 (pending al coste completo) |

> Nota 2026-09-16 (decision 7): la unicidad global ya **no** es prerrequisito de otra feature —
> el indice lo garantizan TI1 + TI3 en esta rama (R27) —. T17 conserva el caso «el lector no
> desambigua» (sin `LIMIT 2`, decision 6) y el mapa suma R25-R30; la decision 6 no cambio
> ninguna fila de R1-R24.

**Hecho:** mapa completo y sin R huerfanos; `pnpm typecheck` + `pnpm lint` del implementer en
verde; `progress/impl_IA-1-login.md` cierra con la nota para el leader de correr el gate
(`./init.sh --rapido` y, al cerrar la feature, `./init.sh` completo).