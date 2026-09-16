# design.md — IA-1 login (port)

- **Feature:** IA-1 login (port de `imports/login/`; fuente: `imports/login/prompt.md`).
- **Fecha:** 2026-09-16. **Estado:** pendiente de **RE-aprobacion** humana (F1.4): el 2026-09-16
  el humano amplio el alcance del spec ya aprobado (decision 7: stack base + identidad minima,
  secciones 3 y 10) y este diseño vuelve a revision con esas ampliaciones.
- **Requiere aprobacion junto con el spec:** las dependencias nuevas de `## Dependencias
  propuestas` (regla de `docs/architecture.md > Dependencias de terceros`: la propuesta del
  `design.md` se aprueba con el spec; el leader añade las filas a `docs/dependencias.md` al
  aprobar).
- **Preguntas abiertas:** ninguna pendiente — la de la organizacion en el login (decision 6,
  ronda 2) y la de prerrequisitos/stack (decision 7, ronda 3) estan **cerradas**; ver
  `requirements.md > Preguntas abiertas`.

---

## 1. Resumen y frontera

Que implementa: el flujo que convierte «usuario + contrasena» en «sesion emitida + aterrizaje»,
segun `requirements.md` (R1-R24). El dominio decide; los puertos traen el mundo; un solo punto
de composicion ata puertos a implementaciones (R22).

Que NO implementa (frontera declarada, no deuda):

- Leer/cerrar la sesion en cada peticion, proteger rutas (`middleware.ts`), autorizar: el
  interceptor y el catalogo de permisos son features propias del board. Este modulo **emite**
  la sesion y nada mas. El formato de sesion se elige Edge-ready para que el interceptor futuro
  lo verifique sin reescribirlo (ver `## Sesion`).
- Recuperacion/establecimiento de contrasena, alta de cuentas, desbloqueo manual: otros
  flujos. El bloqueo caduca solo y nunca es permanente precisamente porque no hay pantalla de
  administracion.
- La lectura autorizada del rastro de accesos (R24): el **escritura** del rastro vive aqui
  (tabla `login_attempts`, filas para todo intento resuelto); **quien puede leerlo** y con que
  UI se define en la feature de auditoria del board. «Consultable» se interpreta como registro
  estructurado persistido y consultable en base, no como endpoint de lectura en esta feature.
- La UI del login se limita a lo minimo para que el flujo y los tests E2E existan (pantalla de
  login, formulario con barrel `index.ts` segun `architecture.md > Componentes`). Estilos
vanilla de la pagina; no se añade shadcn/ui en esta feature salvo que el implementer lo
   necesite (ver `## Dependencias propuestas`).

Frontera **superada el 2026-09-16** (decision 7, ampliacion B): el esquema de identidad minima
(`companies`/`roles`/`users`, indice global, catalogo de dos roles, hasher compartido) deja de
ser prerrequisito externo y lo **crea esta feature** (R25-R30, `## Modelo de datos y
migracion`). Sigue siendo frontera todo lo demas que se lista arriba y lo que la seccion 15
marca como «dependiente con degradacion».

## 2. Decisiones cerradas que este diseño respeta

De `requirements.md > Decisiones acotadas con el humano (2026-09-16)` y del prompt §5:

1. Politica de bloqueo **configurable por entorno** (defaults: 5 fallos, 1/5/15/60, tope 60).
2. Tope del usuario: **misma constante compartida** que el alta administrada (un solo numero).
3. CAS agotado: **dejar rastro** (`annotation_failed`), sin propagar error.
4. Hashing **bcrypt coste 10** (~110 ms), sin rehash progresivo (alternativa descartada en
   `## Alternativas descartadas`).
5. Rastro de accesos **SI** (R24). Sesiones caen todas al cambiar el secreto: **un solo
   secreto, sin ventana de convivencia** (prompt §5).
6. **Solo DOS roles en toda la app: `admin_maestro` y `admin`** (ronda 2, decision 5). El
   catalogo de roles de la identidad se limita a esos dos; el ticket de sesion (`role`) y el
   calculo del aterrizaje los tratan como conjunto cerrado.
7. **Unicidad GLOBAL del identificador** (ronda 2, decision 6). Dos empresas no pueden tener el
   mismo usuario: indice **funcional y parcial global** `lower(username) WHERE deleted_at IS
   NULL` en la identidad (como el original del port); el lector devuelve la fila unica o
   ninguna, sin desambiguacion.

## 3. Stack y dependencias propuestas

Stack del repo (`architecture.md`): Next.js App Router + TypeScript strict, Tailwind v4,
Supabase/Postgres, Prisma como unico camino de datos (con `DATABASE_URL` + `DIRECT_URL`),
zod en el borde, Server Actions para mutaciones internas.

Dependencias que esta feature necesita y el repo **aun no tiene** (todas **REQUIERE
APROBACION**; los 4 checks de `docs/architecture.md` se verificaron con red el 2026-09-16, con
dos correcciones: `@types/bcryptjs` **descartado** —stub deprecado, bcryptjs 3.x trae sus
propios tipos— y `prisma` **pineado a `^7.10.0`** —`npm view prisma version` devuelve
`8.0.0-rc.15`, un RC que no se instala—):

| Paquete | Para que | Que codigo nos ahorra | 4 checks (`docs/architecture.md`) | Estado |
| --- | --- | --- | --- | --- |
| `bcryptjs` | Hasher (decision 4: bcrypt coste 10) | implementar bcrypt o el señuelo a mano; alogrítmo probado con sal interna | VERIFICADO 2026-09-16 | REQUIERE APROBACION |
| `zod` | Borde tipado (ya prescrito por el stack) | validacion declarativa con errores por campo | VERIFICADO 2026-09-16 | REQUIERE APROBACION |
| `@prisma/client@7.10.0` + `prisma@^7.10.0` (dev) | ORM (prescrito por el stack); `prisma` pineado a `^7.10.0` para casar con el cliente — `@latest` es `8.0.0-rc.15`, un release candidate | capa de datos, migraciones, cliente con `updateMany` que informa filas afectadas | VERIFICADO 2026-09-16 | REQUIERE APROBACION |
| `@playwright/test` (dev) | E2E con navegador real (R8: cookie inaccesible a scripts) | runner de navegador; es la unica forma honesta de afirmar R8 | VERIFICADO 2026-09-16 | REQUIERE APROBACION |
| `vitest` (dev) | Tests unit/integration (R23) | runner de tests | VERIFICADO 2026-09-16 (sin `@types/bcryptjs`: stub deprecado, bcryptjs 3.x trae sus propios tipos) | REQUIERE APROBACION |

Notas:

- `bcrypt` nativo **no** se propone: compilacion nativa (node-gyp) en el build de Vercel. `bcryptjs`
  es JS puro con la misma API y respeta el tope de 72 bytes. El coste 10 manda sobre la velocidad
  del runtime: la uniformidad de tiempos que promete R4/R5 es entre caminos del login, no contra
  otro hasher.
- `@types/bcryptjs` **no** se instala: es un stub deprecado («This is a stub types definition.
  bcryptjs provides its own type definitions»); bcryptjs 3.x incluye sus propios tipos.
- `prisma` (dev) se pinea a `^7.10.0`: `npm view prisma version` devuelve `8.0.0-rc.15` (un
  release candidate), que no se instala como `@latest`; el CLI debe casar con
  `@prisma/client@7.10.0`.
- `crypto.randomUUID` (identificador de sesion) y WebCrypto `crypto.subtle` (HMAC-SHA-256) son
  runtime, no dependencias.
- No se usa ninguna libreria de JWT: ver `## Alternativas descartadas`.

### Stack base (ampliacion A, decision 7 — todo REQUIERE APROBACION)

El stack del repo **no esta montado** en esta rama (T0 dejaba de correr antes de empezar). La
ampliacion A lo construye dentro de esta feature como **infraestructura previa** (Bloque 0 de
`tasks.md`, TS1-TS6): sin requisito de producto propio. Los 4 checks de
`docs/architecture.md > Dependencias de terceros` se corren **con red al aprobar** (las
versiones se fijan en T1 con la version estable de cada paquete; unica excepcion: `prisma`
pineado a `^7.10.0`, fila de arriba):

| Paquete | Para que | Que codigo nos ahorra | 4 checks | Estado |
| --- | --- | --- | --- | --- |
| `next` + `react` + `react-dom` | Runtime de la app (App Router) | servidor + cliente, router | PENDIENTE (red al aprobar) | REQUIERE APROBACION |
| `typescript` + `@types/node` (dev) | tsconfig **strict** (convencion del repo) | typecheck del repo entero | PENDIENTE | REQUIERE APROBACION |
| `@types/react` + `@types/react-dom` (dev) | Tipos de React SSR | tipos JSX | PENDIENTE | REQUIERE APROBACION |
| `tailwindcss` + `@tailwindcss/postcss` (dev) | Tailwind v4 (prescrito por `architecture.md`) | estilos de la UI del login y de las features futuras | PENDIENTE | REQUIERE APROBACION |
| `tsx` (dev) | Runner para `scripts/db-rollback.ts` (ya existe y usa `pg`) | correr TS de scripts sin build | PENDIENTE | REQUIERE APROBACION |
| `pg` | Driver de respaldo de `db-rollback.ts` | cliente Postgres plain | PENDIENTE | REQUIERE APROBACION |

`prisma`/`@prisma/client`/`vitest`/`@playwright/test`/`bcryptjs`/`zod` ya estan en la tabla de
arriba (esta feature los necesita para su codigo, no solo como stack). El `down.sql` de las
migraciones (Bloque C) exige que Migrate corra antes (TS3) y que la base exista (TI1/TI2).

## 4. Arquitectura: el caso de uso en el dominio, cinco puertos, un punto de composicion (R22)

El caso de uso `verifyCredentials` vive en el dominio: no importa Prisma, ni `next/headers`, ni
`next/cache`, ni el reloj del sistema, ni fuentes de azar. Todo lo que necesita del mundo entra
por **cinco puertos** (prompt §4; firmas conservadas):

| Puerto | Firma (del port) | Interfaz en este repo | Adaptador (solo el punto de composicion los elige) |
| --- | --- | --- | --- |
| Lector de credenciales | `findActiveByUsername(username) -> AuthenticatableUser \| null` | `IUserCredentialsReader` (lib/interfaces/repositories/) | `UserCredentialsRepo` (Prisma `$queryRaw`) |
| Hasher | `hash(texto) -> string` · `verify(texto, hashGuardado) -> boolean` | `IPasswordHasher` (lib/interfaces/services/) | `PasswordHasher` (bcryptjs cost 10, fail-closed, señuelo cacheado) |
| Registrador de intentos | `compareAndSet(id, esperado, siguiente, ahora, estadoEsperado, estadoNuevo) -> boolean` · `set(id, estado, estadoNuevo) -> void` · **`recordAttempt(registro) -> void`** (añadido por R24) | `ILoginAttemptRecorder` (lib/interfaces/repositories/) | `LoginAttemptRepo` (Prisma `updateMany`/`create`) |
| Escritor de sesion | `startSession(ticket) -> void` (puede lanzar si el transporte no esta configurado) | `ISessionStarter` (lib/interfaces/services/) | `SessionStarter` (token WebCrypto + cookie via `cookies()`) |
| Fabrica de id de sesion | `newSessionId() -> string` (sin parametros: no hay de donde derivar) | `ISessionIdFactory` (lib/interfaces/services/) | `SessionIdFactory` (crypto.randomUUID) |

Reglas del port (prompt §4, invariante 13):

- **Devuelven crudo**: `AuthenticatableUser` trae `id`, `passwordHash`, `failedLoginAttempts`,
  `lockLevel`, `lockedUntil`, `accountStatus` (crudo), `roleName`, `companyId` y
  `companyDeleted`. Nada mas (ni correo, ni documento, ni nombre): lo que no sale de la base no
  se puede filtrar por error en un registro. «Activa» es regla de dominio, nunca del puerto.
- **El filtro «no borrado» es del puerto**: `users.deleted_at IS NULL` en la consulta del
  lector. Una cuenta borrada no se encuentra y el camino toma el del usuario inexistente.
- **`null` en `estadoNuevo` significa «no toques esa columna»**, no «escribe null» (invariante
  12): la marca de cambio de estado no se pisa con el intento de login.
- **Falla cerrado** (hasher): hash vacio, mal formado o corrupto → `verify` devuelve `false`,
  no lanza (decision 4 y prompt §4).

### Punto unico de composicion

`lib/composition/login.ts` es el **unico archivo** que importa adaptadores concretos y los ata
a las interfaces. Tambien parsea el entorno (fail-fast, ver `## Bloqueo`). La Server Action
recibe el servicio ya compuesto. R22 se verifica con un test estructural (grep/import-graph):
ningun otro archivo del repo puede importar los adaptadores directamente.

### Layout de archivos

```
lib/
  interfaces/
    repositories/
      i-user-credentials-reader.ts      # IUserCredentialsReader
      i-login-attempt-recorder.ts       # ILoginAttemptRecorder
    services/
      i-password-hasher.ts              # IPasswordHasher
      i-session-starter.ts              # ISessionStarter
      i-session-id-factory.ts           # ISessionIdFactory
  repositories/
    user-credentials-repo.ts            # lector (Prisma $queryRaw)
    login-attempt-repo.ts               # CAS + set + recordAttempt (Prisma)
  services/
    login/
      verify-credentials-service.ts     # caso de uso (dominio puro)
      account-lock-policy.ts            # politica de bloqueo pura (reloj inyectado)
      account-status.ts                 # traduccion crudo -> efectivo (invariante 13)
      session-token.ts                  # token v1 (WebCrypto, tiempo constante)
      password-hasher.ts                # bcryptjs + señuelo cacheado/calentado
      session-starter.ts                # cookie (next/headers)
      session-id-factory.ts             # crypto.randomUUID
  composition/
    login.ts                            # punto unico de composicion (R22) + parse env
  actions/
    login.ts                            # Server Action ('use server') — Controller
  types/
    login.ts                            # schemas zod, LoginFormState, constantes
    login-copy.ts                       # copys provisionales (constantes exportadas)
```

Convenciones aplicadas (para el reviewer): `kebab-case.ts` manda (`conventions.md > Nombres`);
los ejemplos `RecursoService.ts` de `architecture.md` son ilustrativos del patron, no del
nombre de archivo. Las interfaces de puerto se centralizan en `lib/interfaces/{repositories,
services}/` por categoria, como pide `architecture.md > Interfaces`; `account-lock-policy.ts` y
`account-status.ts` son funciones puras de dominio que el caso de uso importa (no son
adaptadores, no pasan por composicion). La UI en `app/(public)/login/` sigue la regla del
barrel (`components/index.ts`).

## 5. Flujo del caso de uso

`verifyCredentials(loginInput, ctx)` donde `ctx = { reader, hasher, recorder, sessionStarter,
sessionIdFactory, clock, lockPolicy }` y `loginInput` ya valido en el borde (zod).

1. `attemptId = sessionIdFactory()` (por invocacion — LoginFormState).
2. Normalizar `username`: `trim` + `toLowerCase()` (compartido con el indice funcional; R3).
3. `reader.findActiveByUsername(usernameNormalizado)`.
   - `null` (no existe o borrado): `hasher.verify(password, decoyHash)` (una verificacion; R4)
     → desenlace `bad_credentials` → `recorder.recordAttempt(...)` (R24) → **rechazo unico
     congelado**. No se toca ninguna fila de cuenta (R7).
4. Con cuenta: `hasher.verify(password, user.passwordHash)` — **exactamente una vez** por
   intento (invariante 2); el camino bloqueado tambien verifica y descarta (R17, promesa de
   tiempos).
5. Estado efectivo (`account-status.ts`, orden de ramas **fijado** — invariante 13):
   1. `accountStatus` crudo fuera de {active, blocked} (pending, inactive) → `account_not_active`
      → **sin escrituras de cuenta** (R21) → rastro → rechazo.
   2. `companyDeleted` → `org_inactive` → **sin escrituras de cuenta** (R21) → rastro → rechazo.
   3. `lockedUntil > clock()` → `account_blocked` → sin sumar contador ni nivel ni plazo (R18)
      → rastro → rechazo (incluso contrasena correcta, R17).
   4. resto (incluido `blocked` con `lockedUntil` ya vencido) → **activo** (R19: el bloqueo
      caduca solo, sin intervencion manual).
6. Activo:
   - Contrasena correcta: `recorder.set` con reset a cero (contador, nivel, bloqueo; R20) →
     `sessionStarter.startSession(ticket)` donde ticket = { sub: userId, roleName, companyId,
     sid: sessionIdFactory() } (`roleName` sale del puerto y solo puede valer `admin_maestro` o
     `admin` — conjunto cerrado, decision 5; R10, R14, invariante 9-11) — si la emision lanza,
     **la excepcion se propaga** (invariante 9) → rastro `success` → `{ ok: true }`.
   - Contrasena incorrecta: calcular `nuevoContador / nivel / lockedUntil` con `lockPolicy` y
     `clock()` → `recorder.compareAndSet(id, esperado=contadorLeido, siguiente, ahora,
     estadoEsperado=statusLeido, estadoNuevo)` (invariantes 5-6: predicado por **rango** del
     plazo y exigiendo el estado de cuenta leido).
     - `true` → bloqueo aplicado → rastro `bad_credentials` → rechazo.
     - `false` (perdio la carrera): **releer** (reader), **recalcular la politica** sobre el
       estado fresco (invariante 7) y reintentar el CAS **sin volver al hasher** (invariante 8),
       tope ~10; si se agota → `recorder.recordAttempt(..., annotation_failed: true)` (decision
       3) → rastro → rechazo. **Nunca** se propaga ese fallo hacia quien consume (reabriria el
       oraculo).

El rechazo es **siempre la misma instancia congelada** `{ ok: false }` (invariante 1): el caso
de uso no devuelve motivo ni campo de diagnostico. Los desenlaces granular es solo para la fila
de rastro, que no es observable por quien consume.

## 6. Sesion

- **Token sin estado, firmado**: `v1.<payloadBase64Url>.<hmacBase64Url>`. Version **fija sin
  compatibilidad hacia atras**: un valor que no empiece por `v1.` se rechaza sin verificar
  firma ni interpretar (prompt §5). Consecuencia aceptada: al cambiar el contenido o rotar el
  secreto, todas las sesiones vivas caen.
- **Firma**: HMAC-SHA-256 via WebCrypto (`crypto.subtle`), disponible en servidor y en
  runtimes de borde (Edge-ready: el interceptor futuro verifica el mismo formato). **Una sola
  implementacion en todo el repositorio**. Comparacion de firmas en **tiempo constante**
  (`crypto.timingSafeEqual`).
- **Claims** (solo identificadores, R10): `{ sub, iat, exp, role, cid, sid }` — id de usuario,
  emision, caducidad, nombre del rol, id de organizacion, id de **esta** sesion. `role` solo
  puede valer `admin_maestro` o `admin` (conjunto cerrado, decision 5). Ni nombre, ni correo,
  ni username, ni nombre de organizacion.
- **Caducidad absoluta de 8 h** desde la emision, sin renovacion deslizante ni «recordarme»
  (prompt §5; decision de producto: **no** va por variable de entorno). `exp` viaja **dentro
  del valor firmado** (R9), no solo en el atributo de la cookie.
- **Cookie**: nombre provisional `qcl_session` (ver tabla de parametros), `httpOnly` (R8),
  `sameSite=lax`, `path=/`, `secure` **solo en produccion** (en desarrollo local sobre http el
  navegador no guardaria la cookie), sin atributo `domain` (declararlo ampliaria la sesion a
  subdominios). Escritura via `cookies()` de `next/headers` dentro del adaptador
  `SessionStarter`.
- **Secreto**: `SESSION_SECRET`, minimo 32 caracteres, leido **en la llamada** (no al cargar el
  modulo: romperia la compilacion en despliegue sin variables y haria intestable el fallo
  cerrado). Sin secreto valido no se emite cookie y nadie queda autenticado (R11). Un solo
  secreto, sin ventana de convivencia (decision cerrada).
- La **verificacion** de la sesion (exp, firma, roles) es del interceptor/futuro modulo de
  proteccion de rutas: el adaptador expone el mismo codec (`createToken`/`verifyToken`) para que
  el interceptor lo reutilice; esta feature solo lo usa para crear y verificar en tests.

## 7. Bloqueo

- **Variables de entorno** (UPPER_SNAKE, `conventions.md`): `LOGIN_MAX_FAILED_ATTEMPTS`
  (default `"5"`) y `LOGIN_LOCK_MINUTES` (default `"1,5,15,60"`). Se parsean **en la
  composicion** en un value object `LockPolicy { maxFailedAttempts; lockDurationsMinutes[] }`
  (decision 1): entorno invalido → **throw al arrancar**, nunca al recibir un login. El dominio
  recibe la politica ya resuelta.
- **Semantica** (R15-R20): el quinto fallo consecutivo bloquea y **reinicia el contador**; la
  duracion sube por nivel (1/5/15/60) y **se mantiene el ultimo como tope** (nunca permanente);
  el nivel **no decae** con el tiempo (prompt §6); un exito reinicia contador **y** nivel;
  un fallo durante el bloqueo no alarga ni sube (R18).
- **CAS** (`compareAndSet`, invariantes 5-6): un solo `UPDATE` condicional sobre `users` cuyo
  predicado exige: contador == esperado **y** `account_status` == estadoEsperado **y**
  (`locked_until IS NULL OR locked_until <= ahora`) — el plazo se compara **por rango**, nunca
  por igualdad con el leido (ABA y precision microsegundos/milisegundos). `Prisma
  updateMany` informa cuantas filas afecto; 0 filas = perdio la carrera → relectura + recalculo
  + reintento (sin rehash), tope ~10; agotado → `recordAttempt(annotation_failed: true)` sin
  propagar (decision 3).
- El `set` del exito es **incondicional** y resetea las tres columnas y el estado a `active`
  (R20). `null` en columnas no implicadas (invariante 12).

## 8. Senuelo (R4, R5)

Un texto fijo (no una contrasena real) hasheado **con el mismo hasher del sistema** (heredando
coste y algoritmo), calculado **una sola vez por proceso**, cacheando la **promesa** (dos
intentos concurrentes reutilizan el mismo calculo) y **calentado en la composicion** para que
ningun intento pague el hash del señuelo ademas de su verificacion. Coste asumido: +~110 ms al
primer arranque del proceso (aceptado; es el mismo coste que un intento real).

## 9. Rastro (R24): modelo, interpretacion y fronteras

**Modelo** (tabla `login_attempts`, detalle en `## Modelo de datos`): una fila por intento
**resuelto** con `username` (quien), `attempted_at` (cuando), `ip_address` + `user_agent`
(desde donde), `outcome` (`success | bad_credentials | unknown_user | account_blocked |
account_not_active | org_inactive`), `annotation_failed` (decision 3) y los vinculos
`company_id`/`user_id` cuando el intento resolvio a una cuenta.

**Interpretacion de «consultable»**: el rastro es una tabla estructurada, persistida y
consultable en base, escrita desde el dominio via puerto (un solo camino de datos, uniforme y
testeable con objetos planos). La **lectura autorizada** (quien puede verla, con que UI) es de
la feature de auditoria del board; esta feature no crea endpoint de lectura (frontera).

**Best-effort**: si el INSERT del rastro falla, se traga (jamas rompe el login). El caso
`annotation_failed` cubre el CAS agotado (decision 3); un fallo de infraestructura del INSERT
no tiene representacion — es un riesgo residual declarado.

**Fronteras del rastro** (escritas en R24):

1. **Empieza donde termina la forma**: la entrada que no cumple el esquema (R6) se rechaza sin
   consultar la base y **no** deja rastro.
2. **Tambien se escribe con identificador inexistente**: fila con el `username` recibido y sin
   vinculo a cuenta, desenlace «credenciales no validas» (el de R2). R7 prohibe **registros de
   cuenta**; la fila de auditoria no lo es: no la crea quien consume el login (la crea el
   sistema, fuera del camino observable) y su contenido es identico para inexistente y
   contrasena mala.
3. **R21 se refiere a los contadores y el estado de la cuenta, no a la fila de auditoria**: una
   cuenta no efectivamente activa deja su fila (desenlace `account_not_active`/`org_inactive`)
   sin que ninguna columna de la cuenta se toque. Esto **reinterpreta** la linea del prompt §11
   («una cuenta no activa ... no deja rastro»): esa linea describe al **original**, que no
   tenia rastro; E24/R24 (decisión humana 2026-09-13) la supera: todo intento resuelto deja
   fila. Lo que sigue siendo cierto es lo que la linea protege: la cuenta no se modifica.

**R13** (ningun registro de salida): el rastro guarda identificadores y contexto, **jamas** la
contrasena, el hash ni el valor de sesion — garantizado por el tipo de `recordAttempt`
(no recibe esos campos) y cubierto por test estructural.

## 10. Modelo de datos y migracion

Con la ampliacion B (decision 7) esta feature **crea la identidad minima** (R25-R30) ademas de
su tabla propia `login_attempts` (R24). El esquema es **esquema y catalogo, no alta
administrada**: las tablas de identidad nacen con la **forma** que el login consume (R25) y el
catalogo de roles sembrado (R26); quien cree cuentas de persona llega despues y reusa lo que
aqui queda montado (R29: el hasher ya es compartido).

Orden de migraciones: **TI1** `init_identity` (modelos Company/Role/User) → **TI2**
`seed_roles` (data migration del catalogo, R26) → **T14** `add_login_attempts` (model
LoginAttempt). El schema completo (un solo `db/schema.prisma`):

```prisma
// db/schema.prisma — schema completo: modelos de identidad (TI1) + LoginAttempt (T14)
// RLS de las cuatro tablas y el indice global se escriben A MANO en las migraciones (notas abajo).
model Company {
  id        String   @id @default(uuid()) @map("id") @db.Uuid
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  users    User[]
  attempts LoginAttempt[]
  @@map("companies")
}

model Role {
  id    String @id @default(uuid()) @map("id") @db.Uuid
  name  String @unique @map("name") @db.VarChar(32)

  users User[]
  @@map("roles")
}

model User {
  id                  String    @id @default(uuid()) @map("id") @db.Uuid
  companyId           String    @map("company_id") @db.Uuid
  roleId              String    @map("role_id") @db.Uuid
  username            String    @map("username") @db.VarChar(255)
  passwordHash        String    @map("password_hash") @db.Text
  failedLoginAttempts Int       @default(0) @map("failed_login_attempts")
  lockLevel           Int       @default(0) @map("lock_level")
  lockedUntil         DateTime? @map("locked_until") @db.Timestamptz(6)
  accountStatus       String    @default("pending") @map("account_status") @db.VarChar(16)
  deletedAt           DateTime? @map("deleted_at") @db.Timestamptz(6)

  company  Company       @relation(fields: [companyId], references: [id])
  role     Role          @relation(fields: [roleId], references: [id])
  attempts LoginAttempt[]

  @@index([companyId])
  @@index([roleId])
  @@map("users")
}

model LoginAttempt {
  id               String   @id @default(uuid()) @map("id") @db.Uuid
  companyId        String?  @map("company_id") @db.Uuid
  userId           String?  @map("user_id") @db.Uuid
  username         String   @map("username") @db.VarChar(255)
  outcome          String   @map("outcome") @db.VarChar(24)
  annotationFailed Boolean  @default(false) @map("annotation_failed")
  attemptedAt      DateTime @default(now()) @map("attempted_at") @db.Timestamptz(6)
  ipAddress        String?  @map("ip_address") @db.Inet
  userAgent        String?  @map("user_agent") @db.VarChar(512)

  company Company? @relation(fields: [companyId], references: [id])
  user    User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, attemptedAt(sort: Desc)])
  @@index([companyId, attemptedAt(sort: Desc)])
  @@index([username, attemptedAt(sort: Desc)])
  @@map("login_attempts")
}
```

Notas de esquema:

- **Identidad minima (R25)**: `users` exige `company_id` y `role_id` **obligatorias** (FK
  restrictivas, `ON DELETE RESTRICT`; en la practica manda el borrado logico: las bajas son
  `deleted_at`, nunca DELETE fisico — R1/R21). `users` y `companies` llevan `deleted_at`; `roles`
  no: es tabla del sistema — un catalogo unico y global (decision 5), sin `deleted_at` ni
  `company_id`.
- **Estados (R28)**: CHECK `account_status IN ('active','pending','inactive','blocked')` en la
  migracion — una sola grafia en base, en los validadores y en el codigo. `roles.name` con CHECK
  `IN ('admin_maestro','admin')` + UNIQUE (R26).
- **`password_hash` NOT NULL (R30)**: una cuenta sin credencial (`pending`) guarda un **hash
  real** (mismo hasher, coste 10) de un valor aleatorio — su login corre el coste completo y
  fracasa siempre con el desenlace uniforme de R2. Nada de NULL con fast-fail (alternativa 7 de
  la seccion 14).
- **Unicidad global (R27)**: indice funcional y parcial escrito **a mano** en la migracion —
  `CREATE UNIQUE INDEX users_username_unique_active ON users (lower(username)) WHERE
  deleted_at IS NULL;` — Prisma no lo modela, y por eso el schema **no** declara `@unique` sobre
  `username` (bloquearia el reuso post-borrado). `roles.name` si lleva `@unique` (catalogo
  cerrado).
- **RLS**: en **cada** tabla de esta feature — `companies`, `roles`, `users` (TI1) y
  `login_attempts` (T14) — `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` +
  `CREATE POLICY "app_owner_full_access" ON <tabla> FOR ALL TO CURRENT_USER USING (true) WITH
  CHECK (true)`. **Correccion de la ronda 1** (alternativa 9): RLS-FORCE somete al **propio
  dueno**, asi que «sin policies» dejaria la tabla cerrada incluso para Prisma; la policy del
  owner es **obligatoria**. Se conserva el anti-patron del reviewer (tabla nueva sin RLS-FORCE
  es BLOQUEANTE) y la defensa en profundidad: sesiones sin policy (PostgREST/anon) quedan
  denegadas (`architecture.md > Acceso a datos`).
- **Seed de roles (TI2) = data migration** (alternativa 8): en su `migration.sql` —
  `INSERT INTO roles (id, name) VALUES (gen_random_uuid(), 'admin_maestro'),
  (gen_random_uuid(), 'admin') ON CONFLICT (name) DO NOTHING;` — y en su `down.sql` —
  `DELETE FROM roles WHERE name IN ('admin_maestro','admin');` (R26, idempotente).
- **down.sql OBLIGATORIO** en TI1, TI2 y T14 (convencion del repo): revierte exactamente su
  `migration.sql` (DROP TABLE con sus objetos RLS, el indice global, el DELETE del seed).
  `scripts/db:rollback` corre primero el `down.sql` y luego `prisma migrate resolve
  --rolled-back`.
- `account_status_changed_at` / `account_status_changed_by` **no** se declaran (fuera del
  minimo; si el alta futura los necesita, es su migracion).
- `DATABASE_URL` (pooler) + `DIRECT_URL` (directa, para Migrate) declaradas en el datasource:
  sin `directUrl`, Migrate falla a traves del pooler (`architecture.md > Variables de entorno
  de la base`).

## 11. Borde (zod, formulario, aterrizaje)

- **Esquema** (`lib/types/login.ts`; §3 del prompt, decision 2):
  `username: z.string().trim().min(1).max(USERNAME_MAX_LENGTH)` (constante compartida con el
  alta: `lib/types/identity-constants.ts`, un solo numero — provisional hasta que la feature de
  identidad fije el valor definitivo; aqui se propone 255 para casar con la columna) ·
  `password: z.string().min(1).max(64)` (64 = `CREDENTIAL_MAX_LENGTH`, estructural del prompt
  §3: margen bajo los 72 bytes de bcrypt; la contrasena **no** se recorta ni normaliza).
- **LoginFormState** (estructura del prompt §3, invariante 15): union discriminada
  `{status:'idle'} | {status:'invalid', attemptId, username, fieldErrors} |
  {status:'error', attemptId, username, message}`. Sin estado de exito (el exito redirige); sin
  campo de contrasena (el tipo lo garantiza); `attemptId` solo en los dos estados de fallo
  (distingue resultado nuevo de re-render de `useActionState`).
- **Errores**: los de **forma** (vacio / demasiado largo) son especificos y por campo (R6,
  prompt §6); los de **autenticacion** son el mismo mensaje congelado indistinguible (R2).
  Copys en `lib/types/login-copy.ts`, **constantes exportadas y provisionales** (prompt §10):
  los tests afirman sobre la constante, nunca sobre el literal. Mensajes propuestos (en español,
  idioma del producto): «Usuario o contrasena incorrectos.» · «Este campo es obligatorio.» ·
  «La contrasena no puede superar los N caracteres.»
- **Aterrizaje** (orden del prompt §10): destino pedido (`next`) **validado en servidor** >
  primera pantalla permitida por permisos > respaldo `DASHBOARD_ROUTE`. `next` es entrada
  externa: se rechaza cualquier valor que no sea una ruta interna (empieza por `/` simple y sin
  autoridad/host/esquema; nada de `//host` ni `javascript:`), y si es invalido se ignora y se
  cae al fallback. **Degradacion declarada**: el catalogo de permisos (prerrequisito 6) no
  existe aun, asi que el segundo escalon se implementa como «respaldo directo a
  `DASHBOARD_ROUTE`» (constante provisional en `lib/types/login.ts`), hasta que la feature de
  permisos lo sustituya — y esa feature queda acotada a lo que los dos roles (`admin_maestro`,
  `admin`) pueden ver (decision 5). Nunca se redirige a un destino externo.
- **Server Action** (`lib/actions/login.ts`, 'use server'): recibe `(prevState, formData)`,
  valida zod, compone el servicio desde `lib/composition/login.ts`, ejecuta; el exito sale por
  `redirect()` (fuera de todo try/catch: atrapar la excepcion de control rompe la redireccion
  en silencio — prompt §9), el fallo devuelve el estado de formulario. Conserva el `username`
  escrito tras un rechazo.

## 12. Parametros a reemplazar (prompt §10 — resueltos para este repo)

| Marcador | Origen | Este repo (provisional hasta aprobacion del spec) |
| --- | --- | --- |
| Nombre de cookie | `qc_session` | `qcl_session` (prefijo de producto, sin decir «auth»/«token») |
| Variable del secreto | `SESSION_SECRET` (min 32) | `SESSION_SECRET` (se conserva el nombre y el minimo) |
| Duracion | 8 h | 8 h absolutas, sin renovacion (decision de producto, no va por env) |
| Tope de credencial | 64 | `CREDENTIAL_MAX_LENGTH = 64` |
| Destino por defecto | `/dashboard` | `DASHBOARD_ROUTE = '/dashboard'` (provisional; ruta del producto pendiente) |
| Parametro de retorno | `next` | `next` (campo oculto del formulario, revalidado en servidor) |
| Copys | «Usuario o contraseña incorrectos.» etc | Constantes provisionales en `lib/types/login-copy.ts` |
| Tablas/columnas | `users/roles/companies`, ... `snake_case` ingles | **Creadas por esta feature** (R25-R30, `## Modelo de datos y migracion` — ampliacion B); identificadores en ingles `snake_case`; copys en español (idioma separado, como pide §10) |
| Estados de cuenta | `active, pending, inactive, blocked` | Los mismos, una sola grafia minuscula |
| Unicidad del identificador | `lower(username) WHERE deleted_at IS NULL` | **GLOBAL** (decision 6): indice funcional y parcial `lower(username) WHERE deleted_at IS NULL` — dos empresas no pueden tener el mismo usuario. El lector consulta con `lower(username) = lower($1)` y devuelve la fila unica o ninguna; **sin stopgap** (la ambiguedad por empresa ya no existe) |
| Borrado | logico `deleted_at` | logico (consistente con el filtro del puerto) |

## 13. Invariantes del prompt §7 — donde viven en este repo

| # | Invariante | Se garantiza en |
| --- | --- | --- |
| 1 | Una sola instancia congelada de rechazo | `verify-credentials-service.ts` (constante `REJECTED`) + test unit |
| 2 | Exactamente una verificacion de hash por intento | flujo del caso de uso + test unit con hasher espia |
| 3 | Un solo reloj por invocacion | `clock` inyectado en `ctx`, pasado a politica y CAS |
| 4 | El dominio no tiene fuentes de azar: id de sesion por puerto | `ISessionIdFactory` + test unit |
| 5 | Registro del fallo es CAS con relectura y recalculo | `ILoginAttemptRecorder.compareAndSet` + bucle del caso de uso + test de integracion (5 fallos paralelos) |
| 6 | Predicado por RANGO del plazo + exige estado leido | SQL del `LoginAttemptRepo` + test ABA de integracion |
| 7 | La escalada la decide siempre el dominio (tambien tras perder la carrera) | recalculo en `account-lock-policy.ts`, llamado desde el caso de uso |
| 8 | El bucle de reintento no vuelve al hasher | caso de uso: el reintento no llama a `hasher` |
| 9 | Verificar y LUEGO emitir; si la emision lanza, se propaga | orden del caso de uso; `startSession` puede lanzar |
| 10 | Rol y organizacion salen de la BASE, jamas de la entrada | `AuthenticatableUser` (roleName/companyId) + el ticket se construye con eso; test unit |
| 11 | Id de sesion nuevo y no derivado | `ISessionIdFactory` + test unit (dos emisiones, ids distintos) |
| 12 | «No hay cambio de estado» = no incluir la columna | `null` en `estadoNuevo` (semantica del puerto) |
| 13 | Traduccion crudo->efectivo en UNA funcion con orden fijo | `account-status.ts` + test unit |
| 14 | Cortes de acceso en el dominio, no en la clausula SQL | el `$queryRaw` del lector solo filtra `deleted_at IS NULL`; los cortes viven en el caso de uso + test con base real |
| 15 | El estado del formulario no tiene campo de contrasena | tipo `LoginFormState` + test de borde |

## 14. Alternativas descartadas

1. **Rastro en logs estructurados en vez de tabla** (descartada). No responde «¿alguien entro a
   mi cuenta?» de forma consultable (retencion, corte, indices), no es uniforme entre
   ambientes y R13 (no escribir secretos en registros de salida) se vuelve mas fragil. La tabla
   tambien casa con «auditable (quien, cuando, sobre que)» de `architecture.md > Dominio`.
2. **Rastro escrito desde la capa HTTP (la Server Action) en vez del dominio via puerto**
   (descartada). Rompe R22 (la decision vive en el dominio), duplica el conocimiento de los
   desenlaces y deja el rastro sin prueba con objetos planos. Por eso `recordAttempt` es el
   tercer metodo del registrador y el dominio lo llama en cada desenlace.
3. **Politica de bloqueo por organizacion** (descartada). La decision 1 fijo «configurable por
   entorno»; una politica por organizacion añade superficie de config sin que el producto lo
   pida, y la identidad es un solo sistema (`architecture.md > Dominio`). El riesgo de
   «multiinquilino publico» del prompt §6 no aplica: este ERP es interno y multiempresa con
   usuarios conocidos.
4. **Libreria de JWT** (descartada, tambien en el prompt §9). Solo ahorraria el sobre y el
   campo `alg` — precisamente la parte con historial de vulnerabilidades. El formato aqui es
   fijo y de un solo algoritmo: `v1.<payload>.<hmac>` con HMAC-SHA-256 de WebCrypto,
   disponible en servidor y borde.
5. **bcrypt coste 12 / argon2id+scrypt con rehash progresivo** (descartada por la decision 4).
   Coste 10 (≈110 ms) es el del original y la latencia de un login; coste 12 lo duplicaria a
   cambio de un margen que aqui no se pide, y cambiar de algoritmo exigiria migrar hashes +
   rehash progresivo, que la decision 4 descarto explicitamente. Alternativa registrada para el
   dia en que la latencia no sea el criterio.
6. **Mantener T0 como STOP-and-report por la identidad faltante** (descartada por la ampliacion
   B, decision 7). Con la identidad dentro de esta feature, la base que T0 esperaba se
   construye en la misma rama (TI1/TI2); T0 pasa a ser un **preflight** que confirma
   scaffolding + entorno + estado de la base, y el unico bloqueo real es la config de entorno
   (items 3 y 9 del prerrequisito).
7. **`password_hash` NULL en cuentas sin credencial, con rechazo antes del hashing**
   (descartada; refuerza R30). NULL + fast-fail es **el mismo agujero de tiempos** que el
   centinela `'!'` que prohibe `## No implementar`: la respuesta seria mediblemente mas rapida
   que la de una cuenta real. Se guarda un hash real de valor aleatorio: mismo coste, siempre
   fracasa, indistinguible.
8. **Seed de roles con `prisma db seed`** (descartada). Añade un runner y un punto de entrada
   configurable (`package.json > prisma.seed`) para dos INSERT de idempotencia trivial. Como
   **data migration** los roles llegan con `migrate deploy` en cualquier ambiente — incluido el
   preview de un merge futuro — y se revierten con el mismo mecanismo que el esquema.
9. **RLS-FORCE sin policies (redaccion de la ronda 1)** (descartada en esta ronda). `FORCE ROW
   LEVEL SECURITY` somete **al propio dueno**: sin ninguna policy, Prisma/owner no podria leer
   ni escribir su esquema. La policy `app_owner_full_access TO CURRENT_USER` es **obligatoria**
   en cada tabla; la defensa contra otras vias (PostgREST/anon, que quedan denegadas) se
   conserva tal cual.

## 15. Prerrequisitos dependientes (prompt §12, tras la decision 7)

Tras la ampliacion B (decision 7), los prerrequisitos de identidad **los crea esta feature**
(R25-R30) y el stack se monta en el Bloque 0; quedan con **GATE T0** los del entorno (que el
preflight de `tasks.md` verifica, sin bloquear el resto del trabajo) y con **degradacion
declarada** los de permisos y rutas:

| # | Prerrequisito | Quien lo provee | Estado en este repo |
| --- | --- | --- | --- |
| 1 | Esquema personas/roles/organizaciones (ficha con `company_id` obligatoria y `role_id`; catalogo de roles = **conjunto cerrado {`admin_maestro`, `admin`}** — decision 5) | **ESTA FEATURE** (R25, R26) | **Creado aqui** — TI1 + TI2 |
| 2 | Indice de unicidad **GLOBAL** del identificador, funcional y parcial (`lower(username) WHERE deleted_at IS NULL`) — decision 6 | **ESTA FEATURE** (R27) | **Creado aqui** — TI1 |
| 3 | Cliente de datos con `$queryRaw` y CAS que informe filas afectadas | Esta feature (Prisma `updateMany`, Bloque 0) | A resolver aqui |
| 4 | Hasher compartido con alta/cambio de credencial | **ESTA FEATURE** (R29): `lib/services/login/password-hasher.ts` se declara el **unico** hasher del repo; el alta futura lo importa | **Creado aqui** |
| 5 | Fuente de UUIDs | `crypto.randomUUID` (runtime) | Resuelto en esta feature |
| 6 | Catalogo de permisos y menu filtrable (aterrizaje; acotado a los dos roles — decision 5) | Feature de permisos del board | NO existe — degradacion declarada (respaldo a `DASHBOARD_ROUTE`) |
| 7 | Validacion del destino de vuelta (ruta interna) | Esta feature (borde, seccion «Aterrizaje») | A resolver aqui (provisional) |
| 8 | Constantes de ruta del producto | Feature de rutas del board | NO existe — `DASHBOARD_ROUTE` provisional |
| 9 | Secreto de firma en el entorno (`SESSION_SECRET`) + credenciales de base (`DATABASE_URL`/`DIRECT_URL`) | Configuracion del entorno | Pendiente de configurar — **preflight T0** (verifica; no bloquea el resto de la rama) |
| 10 | Tooling de tests (unit, integracion real, E2E) | Esta feature (Bloque 0: TS4 vitest, TS5 Playwright) | A resolver aqui |

## 16. Pruebas y trazabilidad

Niveles (los comandos exactos los marca el leader; la regla del gate de `AGENTS.md > Regla del
gate` reparte quien corre que):

- **Unit (dominio)**: caso de uso con puertos falsos, 30+ casos (§11 del prompt: activo +
  correcta; rol/org del ticket salen del puerto, no de la entrada; inexistente/incorrecta/
  bloqueada devuelven el mismo objeto; entrada invalida no toca ningun puerto; ningun fallo
  emite sesion; señuelo calculado una sola vez; bloqueada verifica hash una vez; perdida de la
  carrera se reintenta sobre estado fresco sin rehash; usuario que desaparece entre intento y
  reintento no provoca escritura). Politica de bloqueo aislada **con reloj inyectado** (R19 sin
  esperas reales). Borde del formulario (vacios, mensaje uniforme, `attemptId` por invocacion,
  estado sin contrasena, `next` interno manda / externo se descarta).
- **Structural / de capas**: solo `lib/composition/login.ts` elige implementaciones (R22);
  un solo hasher en el repo; `recordAttempt`/`startSession`/`LoginFormState` no llevan campos
  de contrasena (R10, R13, invariante 15); version `v1.` rechazada sin verificar firma.
- **Integration (base real)**: concurrencia de verdad (cinco fallos en paralelo bloquean; fallos
  en paralelo sobre bloqueada no la desbloquean; el ABA de la invariante 6; el CAS no aplica si
  el estado de cuenta cambio; pendiente/inactiva no entra ni con contrasena correcta); rastro
  (R24): fila por cada desenlace incluyendo inexistente, `annotation_failed` en CAS agotado.
  **R23**: la verificacion crea y limpia sus propios datos, sin sembrados.
- **Integration — identidad (TI3, R25-R30)**: contra base real — el indice global rechaza el
  mismo `username` en dos empresas (R27) y lo **libera** tras borrado logico; el catalogo tiene
  exactamente dos roles y rechaza otros y duplicados (R26); grafias de estado fuera del
  conjunto cerrado se rechazan (R28); una cuenta `pending` se verifica al coste completo y
  fracasa pese a hash valido (R30, R4/R5); borrado logico sin DELETE fisico (R25); flags de RLS
  y policy `app_owner_full_access` presentes en las cuatro tablas.
- **E2E (navegador real)**: correctas → redireccion y cookie **inaccesible a scripts**;  incorrectas → se queda y no recibe cookie; mensaje uniforme; organizacion dada de baja no entra (los fixtures del Bloque D la crean) — R1, R2, R8, R9, R12, R21.

Mapa completo `R<n> -> test` en `tasks.md` (T19), que el `reviewer` verifica contra
`CHECKPOINTS.md > Trazabilidad`.