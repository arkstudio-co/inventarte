# Sesion activa

> Estado vivo de lo que se esta trabajando **ahora**. El leader lo mantiene al dia.
> Al cerrar una feature se limpia de aqui y se resume en `history.md`.

## Features en curso

| id | feature | zone | status | branch | quien la tiene |
|---|---|---|---|---|---|
| _(ninguna)_ | | | | | |

**IA-1 (login) cerrada el 2026-09-17**: PR #1 mergeado en `dev` (`63b3a9a`), ficha en `done`, tarjeta
en *Finalizado*, worktree desmontado. Resumen completo en `progress/history.md`. El spec vive en
`specs/IA-1-login/` (ya en `dev`).

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

_(Las deudas 1, 2 y 7 de la sesion de IA-1 quedaron resueltas al cerrar la feature: `.env` escrito por
el humano, E2E real corrido 3/3 y remoto pusheado.)_

1. **`docs/jira.md` dice proyecto `QC`, `feature_list.json` dice `IA`.** El JSON manda y la ficha
   IA-1 vive en el proyecto IA (Invent_Arte). Verificar que el cambio QC -> IA fue deliberado y, si lo
   fue, corregir el doc.
2. **`lint` es `tsc --noEmit` provisional**: `eslint` no esta en el registro de dependencias
   aprobadas y el implementer no lo instalo «por si acaso». Cuando una feature lo apruebe, se
   sustituye el script.
3. **Menores del review de IA-1 sin cerrar**: M2 (blind spots del grep de R22: `scripts/` y `e2e/`
   fuera del scan; `lib/services/login/*` aparece en ambas listas), M5 (el `lint` provisional de
   arriba), O1 (`unknown_user` esta en el CHECK de T14 pero el codigo nunca lo emite) y O2 (aislamiento
   por empresa). Los menores M1/M3/M4 si se cerraron antes del PR.
4. **Unicidad global vs `architecture.md`**: la ronda 2 decidio unicidad **global** del identificador,
   que revierte para el login la lectura per-empresa de QC-46/47. Confirmar que
   `docs/architecture.md` refleja la decision (hoy puede seguir describiendo el criterio anterior).
5. **Warnings LF/CRLF** en los commits (sin `.gitattributes`). Cosmetico; si molesta, anadir
   normalizacion de fin de linea en una tarea de infra.
6. **TypeScript 7.0.2 / Next 16.3.5 son filo.** Si typecheck/build/tests rompen por
   incompatibilidad, el implementer aplica el fallback aprobado (fijar la anterior estable del
   paquete y reportar al leader).
7. **Rama remota `origin/feature/IA-1-login` sigue en GitHub** (local ya borrada tras el merge). El
   arnes no borra ramas remotas: la quita el humano cuando quiera.
8. **`wt.sh done` no borra la carpeta del worktree en Windows** cuando `node_modules` pasa de
   `MAX_PATH` (fallo con `node_modules/.pnpm/next@...`); deja ~500 MB. Se completo a mano con
   `rd /s /q \\?\<ruta>`. Candidato a `/afinar-regla` (o a un `--assume-merged` + limpieza larga).