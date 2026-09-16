# docs/dependencias.md — Registro de dependencias aprobadas

Toda entrada de `dependencies` y `devDependencies` de `package.json` tiene que estar
listada aquí. La guardia `tests/guards/guard-dependencias-aprobadas.test.ts` compara las
dos listas y falla si sobra algo en `package.json`. El gate corre sin red: la guardia no
consulta npm, solo compara nombres contra esta tabla. Los cuatro checks los verifica una
persona (o el agente con red disponible) **antes** de añadir la fila, y la fila es el acta.

La regla y su porqué viven en `docs/architecture.md > Dependencias de terceros`.

## Cómo se añade una fila

1. El agente propone: qué hace la librería, qué código nos ahorra, y el resultado de los
   cuatro checks (`npm view <pkg> deprecated time.modified license`, descargas semanales).
2. **El humano aprueba.** Sin aprobación no se instala; el agente para y devuelve.
3. Se añade la fila con la fecha y quién aprobó, y se instala.

## Estados

- `aprobada` — pasó los cuatro checks y un humano la aprobó. La fila dice cuándo.
- `excepcion` — falla algún check y el humano la aceptó igual. La fila dice **qué check
  falló y por qué se aceptó**. Sin ese porqué la fila no vale.
- `heredada` — estaba en el repo antes de esta regla (2026-09-01) y aún no pasó los cuatro
  checks. No bloquea el gate; se resuelve en la feature de auditoría del board.

## Registro

En un repo nuevo la tabla arranca vacia y se llena a partir del primer `package.json`:
siembra una fila por dependencia ya instalada con estado `heredada` y audítalas despues.

| Paquete | Para qué | Estado | Fecha | Notas |
| --- | --- | --- | --- | --- |
| `bcryptjs` | Hasher de contrasenas (feature IA-1 login; bcrypt coste 10) | aprobada | 2026-09-16 | v3.0.3, BSD-3-Clause, ~10.1M desc/sem, no deprecado. JS puro (evita node-gyp de `bcrypt` nativo). **Trae sus propios tipos**: no instalar `@types/bcryptjs`. Aprobada por el humano junto al spec IA-1. |
| `zod` | Validacion declarativa del borde (feature IA-1 login) | aprobada | 2026-09-16 | v4.6.5, MIT, ~209M desc/sem, no deprecado. Aprobada por el humano junto al spec IA-1. |
| `@prisma/client` | Cliente ORM: `$queryRaw` del lector y `updateMany` del compare-and-set (feature IA-1 login) | aprobada | 2026-09-16 | v7.10.0, Apache-2.0, ~12.2M desc/sem, no deprecado. Aprobada por el humano junto al spec IA-1. |
| `prisma` (dev) | CLI de migraciones/schema (feature IA-1 login) | aprobada | 2026-09-16 | **Pinear `^7.10.0`**: `npm view prisma version` devuelve `8.0.0-rc.15` (release candidate) — no instalar `@latest`. Apache-2.0, ~12.7M desc/sem. Aprobada por el humano junto al spec IA-1. |
| `@playwright/test` (dev) | E2E con navegador real (feature IA-1 login; R8 cookie inaccesible a scripts) | aprobada | 2026-09-16 | v1.63.0, Apache-2.0, ~45.8M desc/sem, no deprecado. Aprobada por el humano junto al spec IA-1. |
| `vitest` (dev) | Runner de tests unit/integration (feature IA-1 login) | aprobada | 2026-09-16 | v5.0.1, MIT, ~77M desc/sem, no deprecado. Aprobada por el humano junto al spec IA-1. |
| `next` | Runtime de la app, App Router (stack base, IA-1 decision 7) | aprobada | 2026-09-16 | v16.3.5, MIT, ~43.4M desc/sem, no deprecado. **Aviso**: este Next tiene breaking changes — leer `node_modules/next/dist/docs/` antes de escribir codigo. |
| `react` | Runtime UI (stack base) | aprobada | 2026-09-16 | v19.3.0, MIT, ~128.1M desc/sem, no deprecado. Debe casar con `next` 16. |
| `react-dom` | Runtime UI DOM (stack base) | aprobada | 2026-09-16 | v19.3.0, MIT, ~120.6M desc/sem, no deprecado. |
| `typescript` (dev) | Typecheck strict del repo (stack base) | aprobada | 2026-09-16 | v7.0.2, Apache-2.0, ~203M desc/sem, no deprecado. **Filo**: TS 7 es el compilador nativo; si rompe typecheck/build, el implementer fija la anterior estable y lo reporta antes de seguir. |
| `@types/node` (dev) | Tipos de Node (stack base) | aprobada | 2026-09-16 | v22.20.3, MIT, ~316.5M desc/sem, no deprecado. |
| `@types/react` (dev) | Tipos de React SSR (stack base) | aprobada | 2026-09-16 | v19.3.0, MIT, ~117.8M desc/sem, no deprecado. |
| `@types/react-dom` (dev) | Tipos de React DOM (stack base) | aprobada | 2026-09-16 | v19.3.0, MIT, ~98.6M desc/sem, no deprecado. |
| `tailwindcss` (dev) | Tailwind v4 (stack base, prescrito por architecture.md) | aprobada | 2026-09-16 | v4.3.3, MIT, ~92.7M desc/sem, no deprecado. |
| `@tailwindcss/postcss` (dev) | Plugin PostCSS de Tailwind v4 (stack base) | aprobada | 2026-09-16 | v4.3.3, MIT, ~27.9M desc/sem, no deprecado. |
| `tsx` (dev) | Runner TS de `scripts/db-rollback.ts` (stack base) | aprobada | 2026-09-16 | v4.23.13, MIT, ~64.5M desc/sem, no deprecado. |
| `pg` | Driver Postgres de respaldo de `db-rollback.ts` (stack base) | aprobada | 2026-09-16 | v8.23.0, MIT, ~39.3M desc/sem, no deprecado. |

**Criterio de versiones aprobado por el humano el 2026-09-16 (stack base IA-1)**: ultima estable
de cada paquete, con **fallback reportado** — si una version rompe typecheck/build/tests, el
implementer fija la anterior estable del paquete problematico y lo reporta al leader antes de
seguir. Excepcion ya fijada: `prisma` en `^7.10.0` (su `latest` es un release candidate).
