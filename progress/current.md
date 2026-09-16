# Sesion activa

> Estado vivo de lo que se esta trabajando **ahora**. El leader lo mantiene al dia.
> Al cerrar una feature se limpia de aqui y se resume en `history.md`.

## Features en curso

| id | feature | zone | status | branch | quien la tiene |
|---|---|---|---|---|---|
| IA-1 | login | backend | in_progress | feature/IA-1-login | spec aprobado (F1.4); pendiente resolver prerrequisitos de stack/identidad antes de F2.1 |

Importada por `/importar-modulo` (port `imports/login/`). Ficha en el board (IA-1, tarjeta en
**En curso** = aprobacion canonica del spec), worktree montado, spec completo en
`specs/IA-1-login/{requirements,design,tasks}.md`, dependencias aprobadas y registradas en
`docs/dependencias.md`.

## Evaluaciones

### IA-1 — login (2026-09-16, /importar-modulo)

- **zone: backend.** El port es el flujo de autenticacion completo tras la pantalla:
  verificacion de credenciales, hashing, bloqueo con escalada, emision de sesion firmada,
  persistencia y rastro de accesos. El propio `prompt.md` abre con «No es la pantalla de
  login: es todo lo que pasa detras de ella»; el unico componente con cara a la UI (borde
  de formulario) lo maneja el controlador de entrada, no una pantalla.
- **complexity: high.** 24 requisitos EARS, 5 puertos, 15 invariantes —concurrencia real (CAS
  con ABA), criptografia (HMAC-SHA-256, hash señuelo), bloqueo con escalada y E2E con navegador.
- Escribidas como labels en el issue (`zone:backend`, `complexity:high`).

**Acotacion ronda 1 (2026-09-16)** — las 4 decisiones de `imports/login/decisiones.md`:
(1) politica de bloqueo **configurable por entorno** (5/1/5/15/60 como default; se aparta de
la recomendacion de numeros fijos); (2) tope del username **en el borde**, reusando la constante
del alta; (3) reintentos del CAS agotados → **dejar rastro** (R24); (4) hashing **bcrypt coste 10**.

**Acotacion ronda 2 (2026-09-16, al aprobar el spec)** — dos decisiones de alcance:
(5) **solo dos roles en la app: `admin_maestro` y `admin`** (catalogo cerrado; login y ticket de
sesion los tratan como conjunto cerrado); (6) **unicidad GLOBAL del identificador** — dos
empresas NO pueden tener el mismo usuario, lo que **revierte** para el identificador de login la
lectura per-empresa de `docs/architecture.md` (QC-46/47); el indice del prerrequisito pasa a
`lower(username) WHERE deleted_at IS NULL` **global** y se elimina el stopgap `LIMIT 2` del
lector. Cerro la pregunta abierta 1 del spec (ambiguedad multiempresa).

**Dependencias aprobadas (2026-09-16)** y registradas en `docs/dependencias.md` tras verificar
los 4 checks con red: `bcryptjs` 3.0.3, `zod` 4.6.5, `@prisma/client` 7.10.0, `prisma`
**pineado a `^7.10.0`** (`latest` es `8.0.0-rc.15`, un RC — no instalar), `@playwright/test`
1.63.0, `vitest` 5.0.1. **`@types/bcryptjs` NO se instala** (deprecado: es un stub; bcryptjs 3.x
trae sus tipos). Sin libreria de JWT (HMAC propio Edge-ready).

## Conflictos pendientes

_(ninguno)_

## Deudas y cosas abiertas

1. **BLOQUEO INMINENTE — el stack del repo no existe.** Sin `package.json`, sin `tsconfig`,
   sin Next.js/Prisma/Tailwind montados y sin `node_modules`: T0/T1 del spec no pueden pasar
   (no hay donde instalar las dependencias aprobadas ni con que correr typecheck/tests). El
   `design.md` marca 4 prerrequisitos GATE T0 que **tampoco existen**: esquema de identidad
   (`users`/`roles`/`companies`), indice de unicidad global, hasher compartido con el alta y
   `SESSION_SECRET`. **Decision humana pendiente**: como se monta el stack y quien crea el
   esquema de identidad base (¿ampliar IA-1?, ¿feature de identidad aparte en el board?).
2. **Remoto git sin configurar.** `wt.sh` aviso «no se pudo hacer fetch de origin/dev». Anadir
   `origin` y pushear la rama cuando el humano decida donde vive el repo (necesario para push y
   PR en F2.4).
3. **docs/jira.md dice proyecto `QC`, feature_list.json dice `IA`.** El JSON manda (bloque 0 del
   validador) y la ficha IA-1 vive en el proyecto IA (Invent_Arte). Verificar que el cambio
   QC -> IA fue deliberado; si no, revisar `jira.project` y la doc.
4. **Al aprobar el spec se reescribio el issue IA-1 con las decisiones ronda 2** (roles 2,
   unicidad global, dependencias aprobadas) antes de tocar disco, como manda `docs/jira.md`.