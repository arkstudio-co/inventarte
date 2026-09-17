# Sesion activa

> Estado vivo de lo que se esta trabajando **ahora**. El leader lo mantiene al dia.
> Al cerrar una feature se limpia de aqui y se resume en `history.md`.

## Features en curso

| id | feature | zone | status | branch | quien la tiene |
|---|---|---|---|---|---|
| IA-1 | login | backend | in_progress | feature/IA-1-login | spec aprobado y ampliado (F1.4, ronda 3); listo para F2.1 (implementer) |

Port `imports/login/` + identidad minima + stack base, todo dentro de IA-1. Board IA-1 en
**En curso**; ramas `dev` y `feature/IA-1-login` pusheadas a `origin`.

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

1. **Base de datos sin definir.** El spec ampliado crea las migraciones de identidad (Bloque I,
   TI1) y el rastro `login_attempts` (T14), y T17 corre integracion contra base real. Falta
   decidir **de donde sale Postgres**: Supabase cloud (credenciales de proyecto),
   Supabase CLI local, o Postgres en Docker. `DATABASE_URL` + `DIRECT_URL` + `SESSION_SECRET`
   van en `.env` (el `.env.example` se crea en Bloque 0). **Bloquea migraciones e integracion**;
   no bloquea scaffolding, dominio puro ni tests unitarios con puertos falsos.
2. **`docs/jira.md` dice proyecto `QC`, feature_list.json dice `IA`.** El JSON manda y la ficha
   IA-1 vive en el proyecto IA (Invent_Arte). Verificar que el cambio QC -> IA fue deliberado.
3. **Warnings LF/CRLF** en los commits (sin `.gitattributes`). Cosmetico; si molesta, anadir
   normalizacion de fin de linea en una tarea de infra.
4. **TypeScript 7.0.2 / Next 16.3.5 son filo.** Si typecheck/build/tests rompen por
   incompatibilidad, el implementer aplica el fallback aprobado (fijar la anterior estable del
   paquete y reportar al leader).
5. **Remoto resuelto**: `origin` = `https://github.com/arkstudio-co/inventarte.git` (repo vacio
   al conectar). Pusheados `dev` (3bc2bc3) y `feature/IA-1-login` (373cea3).