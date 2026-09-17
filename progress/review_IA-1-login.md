# Review IA-1 — Login (port) — **OK (aprobado con menores)**

- Fecha: 2026-09-17. Reviewer verifica la feature `IA-1-login` en `.worktrees/IA-1-login`,
  rama `feature/IA-1-login` (commits de cierre `02074f7`, `a86efdc`). Solo lectura de codigo;
  la unica escritura es este archivo.
- Fuentes: `specs/IA-1-login/{requirements,design,tasks}.md`, `progress/impl_IA-1-login.md`
  (Tandas 1-8), `CHECKPOINTS.md`, `docs/{architecture,conventions,dependencias}.md`,
  `imports/login/{prompt,decisiones}.md`, migraciones TI1/TI2/T14, `db/schema.prisma`,
  `lib/`, `app/(public)/login/`, `e2e/`, `tests/`.

---

## 1. Verificacion ejecutable (corridas del reviewer, no de la bitacora)

| Corrida | Comando | Resultado |
| --- | --- | --- |
| Gate completo | `./init.sh` (sin flags) | **== init OK ==** (verde) |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | OK |
| Lint | `pnpm run lint` (`tsc --noEmit` — provisional, ver M5) | OK |
| Suite completa | `pnpm run test:json` via gate | **84/84 passed, 0 failed, 0 skipped** (11 archivos) |
| Unit | verify-credentials 13 · session-token 13 · login-border 11 · password-hasher 6 · account-lock-policy 5 · session-starter 5 · architecture-login 5 · session-id-factory 3 | 61/61 |
| Integracion (base REAL) | identity.integration 7 · login.integration 11 | 18/18 |
| Guardias | guard-dependencias-aprobadas | 5/5 |
| E2E real (re-corrido por el reviewer) | seed fixtures + `LOGIN_E2E=1` + `pnpm exec playwright test e2e/login.spec.ts` | **3/3 (7.1s)** — luego cleanup ok, base limpia: `users=0 companies=0 login_attempts=0 roles=2` |

La base real aplicada (TI1/TI2/T14) y el `.env` local permitieron correr integracion y E2E de
verdad; no hubo que confiar en la bitacora. El rastro real del E2E (test 2, username
`usuario-inexistente`, `outcome=bad_credentials`) confirma la desviacion 1 de Tanda 7 (nunca
`unknown_user`).

---

## 2. Trazabilidad `R<n> -> test -> resultado` (verificada por el reviewer)

Cada test citado existe, corre y paso en la corrida de la seccion 1. Fuera del mapa no queda
ningun `R<n>` huerfano y ningun test citado es vacio.

| R | Test(es) (archivo; caso) | Resultado |
| --- | --- | --- |
| R1 | `verify-credentials.test.ts` (activo+correcta) · `login.integration.test.ts` (`R1/R3` fila unica/ninguna; `R1` sin desambiguar) · `e2e/login.spec.ts` (redirige a /dashboard) | verde |
| R2 | `verify-credentials.test.ts` (mismo objeto REJECTED) · `login-border.test.ts` (mensaje = constante) · `e2e` (mensaje uniforme en fallo e inexistente) | verde |
| R3 | `login-border.test.ts` (normalizacion sin tocar password) · `login.integration.test.ts` (`lower()=lower()`) | verde |
| R4 | `verify-credentials.test.ts` (senuelo 1 verif por intento) · `password-hasher.test.ts` (promesa compartida) · `identity.integration.test.ts` (`R30` pending al coste completo) | verde |
| R5 | `verify-credentials.test.ts` (1 computacion) · `password-hasher.test.ts` (mismo hasher/coste) | verde |
| R6 | `login-border.test.ts` (invalida no toca puertos ni sesion) | verde |
| R7 | `verify-credentials.test.ts` (desaparecido sin escrituras) · `login.integration.test.ts` (inexistente: rastro sin vinculos) | verde |
| R8 | `session-starter.test.ts` (httpOnly/lax/path/secure por entorno) · `e2e` (httpOnly real: `document.cookie` nunca la ve) | verde |
| R9 | `session-token.test.ts` (exp dentro del valor firmado, 8h absolutas) | verde |
| R10 | `session-token.test.ts` (claims solo identificadores) · `verify-credentials.test.ts` (rol/org salen del puerto) | verde |
| R11 | `session-token.test.ts` + `session-starter.test.ts` (sin secreto/corto → lanza, cero cookies) | verde |
| R12 | `verify-credentials.test.ts` (ningun fallo emite sesion) · `e2e` (sin cookie en fallo) | verde |
| R13 | `login-border.test.ts` (estado sin contrasena) · `login.integration.test.ts` (columnas del rastro) · `architecture-login.test.ts` (estructural) | verde |
| R14 | `verify-credentials.test.ts` + `session-id-factory.test.ts` (UUIDs no derivados) | verde |
| R15 | `account-lock-policy.test.ts` (quinto fallo bloquea y reinicia) · `login.integration.test.ts` (5 paralelos bloquean) | verde |
| R16 | `account-lock-policy.test.ts` (1/5/15/60, tope 60, nunca permanente) | verde |
| R17 | `verify-credentials.test.ts` (bloqueada verifica 1 vez) · `login.integration.test.ts` (paralelos sobre bloqueada) | verde |
| R18 | `account-lock-policy.test.ts` (estado intacto) · `login-attempt-repo.ts` (CAS por RANGO) · `login.integration.test.ts` (ABA + contador cambiado) | verde |
| R19 | `account-lock-policy.test.ts` (reloj inyectado: caducado acepta) · `account-status.ts` (orden de ramas) · `login.integration.test.ts` (caducado no frena exito) | verde |
| R20 | `account-lock-policy.test.ts` (exito resetea los tres) · `login.integration.test.ts` (reset + rastro success) | verde |
| R21 | `verify-credentials.test.ts` (cortes sin escrituras) · `login.integration.test.ts` (pending/inactive) · `e2e` (pending, mismo mensaje, sin sesion) | verde |
| R22 | `architecture-login.test.ts` (grep) — **verificado ademas con grep propio** (solo `lib/composition/login.ts` importa los repos) | verde |
| R23 | `identity.integration.test.ts` + `login.integration.test.ts` (fixtures auto, assert sin filas) · `scripts/seed-e2e-login-fixtures.mts` + `cleanup-...mts` | verde |
| R24 | `verify-credentials.test.ts` (recordAttempt por desenlace + CAS agotado annotation_failed) · `login.integration.test.ts` (fila por desenlace; annotation_failed con 8 writers) | verde |
| R25 | `20260916090000_init_identity/migration.sql` (FKs restrictivas, company_id/role_id NOT NULL) · `identity.integration.test.ts` (baja = UPDATE deleted_at; FKs impiden DELETE) · `user-credentials-repo.ts` (filtro `deleted_at IS NULL`) | verde |
| R26 | `20260916090001_seed_roles/migration.sql` (2 INSERT + CHECK + UNIQUE, idempotente) · `identity.integration.test.ts` (catalogo = 2, otros/duplicados rechazados) | verde |
| R27 | `init_identity/migration.sql` (indice funcional y parcial `lower(username) WHERE deleted_at IS NULL`) · `identity.integration.test.ts` (duplicado entre empresas; reuso post-borrado) | verde |
| R28 | `init_identity/migration.sql` (CHECK `account_status`) · `identity.integration.test.ts` (grafias rechazadas) | verde |
| R29 | `password-hasher.ts` (unico hasher, coste 10) · `architecture-login.test.ts` (grep bcrypt solo en password-hasher) | verde |
| R30 | `init_identity/migration.sql` (`password_hash TEXT NOT NULL`) · `architecture-login.test.ts` (sin centinela) · `password-hasher.test.ts` (fail-closed) · `identity.integration.test.ts` (pending al coste completo) | verde |

---

## 3. CHECKPOINTS.md punto por punto

- [x] `tasks.md` toda `[x]` — TS1-TS6, TI1-TI3, T0-T19; grep propio: **0 casillas `[ ]`**.
- [x] `typecheck` strict pasa (`tsc --noEmit`).
- [x] `lint` verde — **provisional** (`lint = tsc --noEmit`; ver M5).
- [x] Tests: suite completa **84/84** (incluidas las dos integraciones contra base real).
- [x] E2E flujo critico (autenticacion): re-corrido por el reviewer **3/3** con navegador real.
- [x] Dependencias: todas con fila `aprobada` en `docs/dependencias.md` (14 filas, 4 checks
      verificados); guardia 5/5.
- [x] RLS: **4/4 tablas** (`companies`, `roles`, `users`, `login_attempts`) con
      `ENABLE` + `FORCE ROW LEVEL SECURITY` + policy `app_owner_full_access TO CURRENT_USER`
      (alternativa 9: FORCE somete al owner; la policy es obligatoria). Verificado en el SQL de
      TI1/T14 y en vivo por TI3 (flags reales contra la base).
- [x] Migraciones versionadas y reversibles: las 3 tienen `down.sql` real (revierten RLS +
      indice global + seed); el gate valida `down.sql` presente.
- [x] Sin secretos hardcodeados: `.env.example` con placeholders; `SESSION_SECRET` leido en la
      llamada, minimo 32, fail-closed (R11).
- [ ] Webhooks — **N/A**: esta feature no introduce webhooks.
- [x] Capas: Controller (`lib/actions/login.ts`) sin queries ni logica de negocio; servicio de
      dominio sin HTTP; repos solo Prisma; interfaces en `lib/interfaces/` por categoria.
- [ ] Permisos en paginas protegidas — **N/A en esta feature**: el login es publico; la
      proteccion de rutas es la feature futura del interceptor (deuda declarada, no se cuelo).
- [x] Configuracion: `LOGIN_MAX_FAILED_ATTEMPTS`, `LOGIN_LOCK_MINUTES`, `SESSION_SECRET` por
      env, parse fail-fast en composicion; `DASHBOARD_ROUTE` provisional constante declarada
      como degradacion (design §15).
- [x] Aislamiento por empresa (arquitectura > Dominio 1): todas las tablas nuevas llevan son
      la columna de empresa (`users.company_id` NOT NULL, `login_attempts.company_id` nullable,
      `companies` es la tabla inquilino; `roles` es tabla del sistema, R26). Sin consulta que
      tome «empresa de quien pide»: el login es pre-contexto (identificador GLOBAL, R27) — el
      aislamiento lo dan unicidad global + RLS-FORCE + FK obligatoria. Ver O2.
- [x] `./init.sh` completo en verde (corrido por el reviewer en esta revision).
- [x] `progress/review_IA-1-login.md` existe — este archivo (veredicto OK).
- [ ] Entrada en `progress/history.md` + desmontar worktree — pasos F2.6/F2.5 del **leader**
      (fuera del alcance del reviewer).

---

## 4. Focos del humano — dictamen

1. **lint = `tsc --noEmit` provisional** → **observacion** (M5). El gate es honesto: la salida
   muestra exactamente el comando que corre; no hay eslint en el repo. Deuda a la feature de
   calidad; no bloquea.
2. **Prisma 7 + `@prisma/adapter-pg` en composicion; grep R22 burlable?** → **verificado**.
   Grep propio del reviewer: los dos repos solo los importa `lib/composition/login.ts`;
   `session-starter -> session-token` es intra-modulo y esta en la lista de importadores
   permitidos del test. Blind spots: el scan cubre `lib/` + `app/` (scripts/ y e2e/ fuera) y
   `lib/services/login/*` figura en ambas listas — menor M2, hoy el arbol esta limpio.
3. **Desviaciones del port** → **verificadas y todas documentadas**. `crearToken` async
   (WebCrypto es asincrono); `process.env` campo a campo con fail-fast (design §7);
   `recordAttempt` best-effort traga errores = decision 3/ronda 2 del spec; reloj explicito en
   tests de token = mejora. La desviacion «rechaza version distinta SIN verificar firma» se
   confirmo estructuralmente en `session-token.ts` (`token.startsWith("v1.")` antes de tocar
   firma/payload).
4. **RLS 4/4 FORCE + policy** → **verificado** (SQL + TI3 en vivo). `prisma migrate` usa
   `DIRECT_URL` (5432, IPv6 documentado como workaround) y la integracion corre por
   `DATABASE_URL` (pooler 6543); sin impacto en RLS.
5. **TI3 (GROUP BY en `pg_policies`, RLS al leer `pg_policies`)** → **no aflojo tests**: primera
   corrida 26/28, los 2 fallos eran del test (SQL propio), corregidos; corrida completa del
   reviewer 18/18 de integracion, y los casos reales (indice global, catalogo, CHECKs, RLS
   flags) pasan contra la base.
6. **`app/(public)/page.tsx` andamiaje «IA-1 WIP»** → **menor** (M3): placeholder desechable
   del root publico; no afecta flujo ni E2E. Decidir antes del PR (mantener/quitar).
7. **`tasks.md` sin casillas mentidas** → **verificado**: 0 `[ ]`, T19 con mapa completo R1-R30
   (nombres de archivo, casos citados); el reviewer lo re-verifico test por test (seccion 2).

---

## 5. Hallazgos

### Mayores (bloqueantes): **ninguno**

### Menores

- **M1 — Reloj de pared por defecto en `session-starter.ts`** (invar 3, matiz): el adaptador usa
  `env.reloj ? env.reloj() : new Date()` y `lib/composition/login.ts` no pasa `reloj`, asi que
  en produccion la cookie sale con hora del sistema. No afecta politica ni CAS (ahi el reloj si
  se inyecta) ni la firma (el token recibe clock en tests); es una inconsistencia con la letra
  de «un solo reloj por invocacion». Arreglo de una linea en composicion o quitar el fallback.
- **M2 — Blind spots del grep R22**: el test estructural escanea `lib/` + `app/` (scripts/ y
  e2e/ fuera) y pone a `lib/services/login/*` en ambas listas (adaptadores e importadores
  permitidos). Hoy limpio (verificado); ampliar el scan (o import-graph) en la feature de
  calidad.
- **M3 — Andamiaje `app/(public)/page.tsx`**: el root publico muestra «IA-1 WIP» (placeholder
  desechable). Decidir antes del PR.
- **M4 — `tsconfig.json` sin `**/*.mts`**: los scripts `.mts` (seed/cleanup E2E, db-rollback)
  quedan fuera del `tsc --noEmit` (se verifican con `tsx` real). Añadir el include o un
  typecheck de scripts.
- **M5 — `lint` provisional = `tsc --noEmit`**: no hay eslint instalado; el gate lo asume como
  lint. Honesto en la salida, pero no lintea. Deuda a la feature de calidad del board.

### Observaciones

- **O1 — `unknown_user` solo en el CHECK**: el servicio emite `bad_credentials` para inexistente
  (uniforme, R2/R24) y el CHECK de T14 admite `unknown_user` que el codigo jamas emite
  (confirmado por rastro real del E2E). Eliminar el valor del CHECK o documentar por que se
  reserva.
- **O2 — Aislamiento por empresa (foco del reviewer)**: el login es pre-contexto y el
  identificador es GLOBAL (R27): no existe consulta con «empresa de quien pide» que filtrar ni
  test de acceso cruzado posible en este flujo; el aislamiento lo dan unicidad global + RLS +
  FK obligatoria (R25). Vigilar en la feature de auditoria, donde si habra lecturas
  multi-empresa.
- **O3 — `DIRECT_URL`**: el trabajo quedo con el direct connection apuntando al puerto 5432
  (IPv6-only); el leader decide antes del PR si `.env` debe apuntar al session pooler
  (pendiente del leader anotado en la bitacora).
- **O4 — Estado F1.4**: `design.md` quedo en «pendiente re-aprobacion» tras la ampliacion A/B
  (ronda 3). Formalidad del proceso del leader (mover tarjeta a En curso), no deuda de codigo;
  la implementacion respeta el design tal cual esta escrito.

---

## 6. Deuda abierta

1. E2E no corre en el gate por defecto (requiere `LOGIN_E2E=1` + fixtures + `.env`): considerar
   un job CI que lo monte (hoy lo corre el humano/leader localmente).
2. ESLint real (M5) y ampliacion del scan R22 (M2) — feature de calidad del board.
3. `**/*.mts` en tsconfig (M4).
4. `reloj` en composicion (M1) y decision sobre `unknown_user` (O1).
5. `DIRECT_URL` session pooler en `.env` (O3) — decision del leader antes del PR.
6. Proteccion de rutas / permisos / constantes de ruta definitivas: features futuras del board
   (degradaciones declaradas en design §15).

---

## 7. Veredicto final

**OK — aprobado con menores.** Sin bloqueantes: trazabilidad R1-R30 completa y verificada
test por test (incluida la corrida propia del reviewer: `./init.sh` verde, 84/84, E2E 3/3,
base limpia al cierre). Los 5 menores (M1-M5) y las observaciones no impiden el merge; se
anotan para el implementer/leader y las features de calidad/auditoria.