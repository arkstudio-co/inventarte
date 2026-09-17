# Sesion activa

> Estado vivo de lo que se esta trabajando **ahora**. El leader lo mantiene al dia.
> Al cerrar una feature se limpia de aqui y se resume en `history.md`.

## Features en curso

| id | feature | zone | status | branch | quien la tiene |
|---|---|---|---|---|---|
| IA-1 | login | backend | in_progress | feature/IA-1-login | implementacion casi cerrada; **bloqueada en `.env`** (T0) para TI1/TI3/T17 |

Port `imports/login/` + identidad minima + stack base, todo dentro de IA-1. Board IA-1 en
**En curso**; ramas `dev` y `feature/IA-1-login` pusheadas a `origin` (ultimo commit de la rama:
`7da9aa5`).

**Avance de `tasks.md` (2026-09-16)**

| Hecho `[x]` | Pendiente `[ ]` |
| --- | --- |
| Bloque 0 (TS1-TS6, T1): stack base, Prisma 7, vitest + guardia, Playwright, `.env.example` | **T0** preflight: `.env` (lo escribe el humano) |
| Bloque A (T2-T7): dominio puro, 5 puertos, politica de bloqueo, unit tests | **TI1/TI2/T14**: migraciones **escritas** — falta **aplicarlas** (`prisma migrate deploy`) |
| Bloque B (T8-T13, T15): hasher, token HMAC, cookie, repos, composicion unica, Server Action | **TI3**: integration de identidad (necesita base) |
| T16 (pantalla de login) y T18 (E2E escritos; corrida real con `LOGIN_E2E=1`) | **T17**: integration contra base real |
| Adapter `@prisma/adapter-pg` cableado (`PrismaPg` en `crearClientePrisma()`) | **T19**: mapa `R<n> -> test` completo y cierre del checklist |

Gate del leader al cerrar la tanda: `./init.sh --rapido` **verde** (typecheck, lint, 66 tests +
5 guardias, todas las migraciones con `down.sql`); unico aviso: no hay `.env`.

## Evaluaciones

### IA-1 — login (2026-09-16, /importar-modulo)

- **zone: backend** — flujo de autenticacion completo tras la pantalla (verificacion, hashing,
  bloqueo con escalada, emision de sesion firmada, rastro). El propio `prompt.md` abre con «No
  es la pantalla de login: es todo lo que pasa detras de ella».
- **complexity: high** — 30 requisitos EARS (R1-R30 tras la ampliacion), 5 puertos, 15
  invariantes, concurrencia (CAS con ABA), criptografia (HMAC, señuelo), E2E con navegador.
- Labels `zone:backend`, `complexity:high` escritas en el issue.

**Rondas de decision (todas anexadas al spec con fecha 2026-09-16):**

- **Ronda 1** (de `decisiones.md`): (1) politica de bloqueo **configurable por entorno** —
  se aparta de la recomendacion de numeros fijos; (2) tope del username **en el borde**; (3) CAS
  agotado → **dejar rastro** (R24); (4) hashing **bcrypt coste 10**.
- **Ronda 2** (al aprobar el spec): (5) **solo dos roles: `admin_maestro` y `admin`**; (6)
  **unicidad GLOBAL del identificador** (dos empresas NO comparten usuario; revierte para el
  login la lectura per-empresa de `architecture.md` QC-46/47; sin stopgap de desambiguacion).
- **Ronda 3** (al resolver el bloqueo T0): (7) el **stack base se monta como infraestructura
  dentro de IA-1** (no se crea ficha aparte) — Bloque 0 del spec (TS1-TS6); (8) **IA-1 crea la
  identidad minima** (R25-R30, Bloque I: `companies`/`roles`/`users`, indice global, los 2 roles,
  hasher compartido) — supera la frontera «el login no crea identidad» del design; (9) remoto git
  configurado y pusheado.

El spec ampliado (R25-R30 + stack base) fue **re-aprobado por el humano** el 2026-09-16.

**Dependencias aprobadas y registradas en `docs/dependencias.md`** (4 checks corridos con red):
ronda 1/2 — `bcryptjs` 3.0.3, `zod` 4.6.5, `@prisma/client` 7.10.0, `prisma` ^7.10.0,
`@playwright/test` 1.63.0, `vitest` 5.0.1; **sin `@types/bcryptjs`** (stub deprecado). Ronda 3
(stack base) — `next` 16.3.5, `react`/`react-dom` 19.3.0, `typescript` 7.0.2, `@types/node`,
`@types/react`, `@types/react-dom`, `tailwindcss`/`@tailwindcss/postcss` 4.3.3, `tsx`, `pg`.
Criterio de versiones: **latest con fallback reportado**.

## Conflictos pendientes

_(ninguno)_

## Deudas y cosas abiertas

1. **`.env` pendiente — el humano lo escribe (unico bloqueo).** La base es **Supabase cloud**.
   El humano crea `.worktrees/IA-1-login/.env` a partir de `.env.example` con:
   `DATABASE_URL` (pooler, puerto 6543), `DIRECT_URL` (directo, 5432) y `SESSION_SECRET`
   (>= 32 caracteres). El implementer **no** lo crea, no migra contra placeholders y no inventa
   credenciales. Bloquea **TI1/TI2/T14** (aplicar migraciones), **TI3** y **T17**. Ya no bloquea
   nada mas: el driver adapter `@prisma/adapter-pg` 7.10.0 esta **aprobado y cableado**
   (`PrismaPg` + `pg`, `scripts/pg.d.ts` borrado con `@types/pg` 8.23.1 aprobado).
   Al escribirlo: aplicar migraciones, correr TI3/T17 y pasar a F2.2 (reviewer).
2. **E2E real diferido**: `e2e/login.spec.ts` esta escrito y revisado, pero la corrida con
   navegador real se levanta con `LOGIN_E2E=1` cuando exista base.
3. **`docs/jira.md` dice proyecto `QC`, feature_list.json dice `IA`.** El JSON manda y la ficha
   IA-1 vive en el proyecto IA (Invent_Arte). Verificar que el cambio QC -> IA fue deliberado.
4. **Warnings LF/CRLF** en los commits (sin `.gitattributes`). Cosmetico; si molesta, anadir
   normalizacion de fin de linea en una tarea de infra.
5. **TypeScript 7.0.2 / Next 16.3.5 son filo.** Si typecheck/build/tests rompen por
   incompatibilidad, el implementer aplica el fallback aprobado (fijar la anterior estable del
   paquete y reportar al leader).
6. **`lint` es `tsc --noEmit` provisional**: `eslint` no esta en el registro de dependencias
   aprobadas y el implementer no lo instalo «por si acaso». Cuando una feature lo apruebe, se
   sustituye el script.
7. **Remoto resuelto**: `origin` = `https://github.com/arkstudio-co/inventarte.git` (estaba
   vacio al conectar). Pusheados `dev` (`f81e383`) y `feature/IA-1-login` (`7da9aa5`).