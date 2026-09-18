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
| `bcryptjs` | Hasher del login (decision 4: bcrypt coste 10): implementa bcrypt o el señuelo a mano; algoritmo probado con sal interna | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 10.1M semanales · BSD-3-Clause. Instalada 3.0.3. bcryptjs 3.x trae sus propios tipos; `@types/bcryptjs` descartado (stub deprecado). |
| `zod` | Borde tipado de toda entrada externa (prescrito por el stack) | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 209.2M semanales · MIT. Instalada 4.6.5. |
| `@prisma/client@7.10.0` | ORM: capa de datos, cliente con `updateMany` que informa filas afectadas (caso del CAS) | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 12.2M semanales · Apache-2.0. Instalada 7.10.0 PIN (exacta, sin caret). |
| `prisma@^7.10.0` (dev) | CLI de Prisma: migraciones versionadas con `down.sql` de convencion propia | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 12.7M semanales · Apache-2.0. Instalada `^7.10.0` (resuelve la 7.x estable; el `@latest` sigue siendo `8.0.0-rc.15`, release candidate que no se instala). |
| `@playwright/test` (dev) | E2E con navegador real: la unica forma honesta de afirmar R8 (cookie inaccesible a scripts) | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 45.8M semanales · Apache-2.0. Instalada 1.63.0. |
| `vitest` (dev) | Runner de tests unitarios/integración | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 77.1M semanales · MIT. Instalada 5.0.1. |
| `next` + `react` + `react-dom` | Runtime de la app (App Router): servidor, cliente y router | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3, ampliacion A). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 43.4M/128.1M/120.7M semanales · MIT. Instaladas 16.3.5 / 19.3.0 / 19.3.0. |
| `typescript` + `@types/node` (dev) | tsconfig **strict** (convencion del repo) | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3, ampliacion A). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 203.4M/316.5M semanales · Apache-2.0/MIT. Instaladas 7.0.2 / 22.20.3. |
| `@types/react` + `@types/react-dom` (dev) | Tipos de React SSR para JSX | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3, ampliacion A). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 117.8M/98.6M semanales · MIT. Instaladas 19.3.0 / 19.3.0. |
| `tailwindcss` + `@tailwindcss/postcss` (dev) | Tailwind v4 (prescrito por `architecture.md`) | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3, ampliacion A). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 92.7M/27.9M semanales · MIT. Instaladas 4.3.3 / 4.3.3. |
| `tsx` (dev) | Runner de TS para `scripts/db-rollback.ts` | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3, ampliacion A). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 64.5M semanales · MIT. Instalada 4.23.13. |
| `pg` | Driver Postgres de respaldo de `scripts/db-rollback.ts` | aprobada | 2026-09-16 | Aprobada con el spec (F1.4, ronda 3, ampliacion A). 4 checks VERIFICADOS 2026-09-16: no deprecado · release < 12m · 39.3M semanales · MIT. Instalada 8.23.0. |
| `@prisma/adapter-pg` | Driver adapter de Prisma 7 (exige `{ adapter }` o `{ accelerateUrl }` en el constructor) | aprobada | 2026-09-16 | v7.10.0, Apache-2.0, ~4.1M desc/sem, no deprecado. Casa exacto con `@prisma/client` 7.10.0. Aprobada por el humano para desbloquear T17 y el runtime de los repositorios. |
| `@types/pg` (dev) | Tipos de `pg` | aprobada | 2026-09-16 | v8.23.1, MIT, ~42.4M desc/sem, no deprecado. Sustituye la declaracion ambiental provisional `scripts/pg.d.ts`, que se borra al instalarla. |
