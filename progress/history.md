# Bitácora (append-only)

> Una entrada por feature completada. No se edita lo ya escrito; solo se añade.

<!-- Formato:
## AAAA-MM-DD — <feature>
- Qué se construyó (1-2 líneas).
- Requisitos cubiertos: R1..Rn.
- Decisiones relevantes o deuda dejada.
-->

## 2026-09-17 — IA-1 · login (port `imports/login/`) + identidad minima + stack base

- **Que se construyo**: el modulo de login completo detras de la pantalla — verificacion uniforme con
  señuelo, politica de bloqueo escalada configurable por entorno, CAS real con reintentos, sesion
  `v1.<payload>.<hmac>` HMAC-SHA-256 Edge-ready en cookie httpOnly, rastro de intentos, Server Action
  y pantalla. Con la identidad minima (migraciones `init_identity`, `seed_roles`,
  `add_login_attempts`, cada una con `down.sql`) y el stack base del repo (Next 16.3.5 App Router,
  React 19.3, TS 7.0.2 strict, Tailwind v4, Prisma 7 + `@prisma/adapter-pg`, vitest con guardia de
  dependencias, Playwright).
- **Requisitos cubiertos**: **R1..R30** (R1-R24 login, R25-R30 identidad minima). Trazabilidad
  verificada test por test por el `reviewer` — sin huerfanos.
- **Verificacion**: `./init.sh` **completo en verde**; integracion contra base real **TI3 7/7** y
  **T17 11/11** (CAS agotado con 8 writers, 5 intentos paralelos bloquean); **E2E con navegador 3/3**
  (`LOGIN_E2E=1`).
- **PR**: #1 -> `dev`, merge commit `63b3a9a`. Review **OK sin bloqueantes** (`progress/review_IA-1-login.md`);
  los menores M1/M3/M4 se cerraron antes del PR (reloj inyectado, pagina publica neutra, `tsconfig` con `*.mts`).
- **Decisiones**: bloqueo configurable por entorno (defaults 5 fallos, 1/5/15/60); tope del username en el
  borde; CAS agotado deja rastro (R24); bcrypt coste 10; **solo dos roles** (`admin_maestro`, `admin`);
  **unicidad GLOBAL del identificador** (revierte para el login la lectura per-empresa de QC-46/47);
  identidad minima y stack base montados **dentro** de IA-1 en vez de fichas aparte.
- **Deuda dejada**: `lint` = `tsc --noEmit` provisional (eslint sin aprobar); M2/M5/O1 del review sin
  cerrar; O2 aislamiento por empresa; O3 `DIRECT_URL` (el humano lo apunta al session pooler);
  `docs/jira.md` dice QC mientras el board es IA; avisos LF/CRLF sin `.gitattributes`;
  TypeScript 7 / Next 16 en filo (fallback reportado ya aprobado).
- **Nota de entorno (candidata a `/afinar-regla`)**: `wt.sh done` desregistro el worktree pero **no pudo
  borrar la carpeta** — `MAX_PATH` de Windows en `node_modules/.pnpm/next@...`; se completo a mano con
  `rd /s /q \\?\<ruta>`. Un worktree por feature deja ~500 MB de `node_modules` detras si esto falla.
