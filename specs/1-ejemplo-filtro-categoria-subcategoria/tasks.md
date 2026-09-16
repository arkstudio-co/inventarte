# Feature 1 — Tasks

> EJEMPLO DE FORMATO. Feature ficticia; enseña cómo se escribe un `tasks.md`.
>
> Checklist verificable. `[P]` = paralelizable con las tareas hermanas del mismo bloque.
> Cada task cierra con su criterio de "hecho". Nada se da por hecho sin que pase el gate
> (`docs/verification.md`).

## Bloque 0 — Preparación

- [x] **T0.** Montar el worktree de la feature: `./scripts/wt.sh new 1 ejemplo-filtro-categoria-subcategoria`.
  - Hecho: existe `.worktrees/1-ejemplo-filtro-categoria-subcategoria/` con la rama
    `feature/1-ejemplo-filtro-categoria-subcategoria` y el árbol limpio.

## Bloque 1 — Lógica pura (sin React) `[P]` con T2

- [x] **T1.** Crear `lib/utils/filtro-categoria.ts` con `derivarCategorias`,
  `derivarSubcategorias` y `filtrarRegistros` (firmas en `design.md §3`). Reutiliza
  `normalizeName` (`lib/utils/normalize.ts`).
  - Hecho: `tsc` sin errores; funciones puras exportadas, sin imports de React ni de
    Server Actions.

- [x] **T2 [P].** Crear `tests/unit/filtro-categoria.test.ts` cubriendo R2, R4, R6, R7 y
  R12 (dedup insensible a acentos y caso, orden alfabético, exclusión de
  `subcategoriaNombre === null` bajo subcategoría concreta, estabilidad de opciones).
  - Hecho: los tests pasan **y fallan si se rompe cualquiera de esas reglas** — un test
    que pasa con la implementación rota no prueba nada.

## Bloque 2 — Presentación y estado (depende de T1)

- [x] **T3.** Crear `app/(app)/registros/_components/useFiltroCategoria.ts`: estado
  `categoria`/`subcategoria` (`""`=todas), `setCategoriaYReset` (R5), opciones memoizadas
  (R2/R4/R12), `hayFiltro` (R9), `limpiar` (R8), `aplicar(lista)` (R6/R7).
  - Hecho: `tsc` sin errores; el hook devuelve el contrato descrito en `design.md §4`.

- [x] **T4.** Crear `app/(app)/registros/_components/FiltroCategoria.tsx`: dos `Select`
  con `aria-label` "Filtrar por categoría" / "Filtrar por subcategoría"; subcategoría
  `disabled` sin categoría (R3); opción centinela "Todas…" (R8); botón "Limpiar filtros"
  condicionado a `hayFiltro` (R9).
  - Hecho: `tsc` sin errores; el componente aislado renderiza los dos combobox y el botón.

## Bloque 3 — Integración en el módulo (depende de T3, T4)

- [x] **T5.** Editar `app/(app)/registros/_components/RegistrosModule.tsx`: montar
  `<FiltroCategoria>`, calcular `registrosVisibles` y alimentar la lista desde ahí. Añadir
  el mensaje "sin coincidencias" (R10).
  - Hecho: `tsc` sin errores; la lista visible reemplaza a la cruda en el render.

## Bloque 4 — Tests de componente (depende de T5)

- [x] **T6.** Extender `tests/components/RegistrosModule.test.tsx` con casos para R1, R3,
  R5, R6, R8, R9 y R10.
  - Hecho: todos los tests nuevos pasan; cada `R<n>` de la tabla de trazabilidad de
    `requirements.md` queda cubierto por al menos un test.

## Bloque 5 — Cierre

- [x] **T7.** Correr `./init.sh` completo y consolidar la traza requisito→test en
  `progress/impl_1-ejemplo-filtro-categoria-subcategoria.md`.
  - Hecho: `./init.sh` en verde; mapa R→test completo, sin huecos.

## Dependencias

```
T0 ─┬─ T1 ─┬─ T3 ─┐
    │      └─ T2  ├─ T5 ─ T6 ─ T7
    └─ T4 ────────┘
```
T1 y T4 avanzan en paralelo tras T0 (T4 no importa la lógica pura, solo el hook para el
cableado real en T5). T2 en paralelo con T3/T4.

## Archivos esperados (para validar conflictos de paralelismo)

El leader usa esta lista en F1.0 para decidir si la feature puede correr en paralelo con
otra de su misma zona (`AGENTS.md > Paralelismo`). Sin ella no se puede validar el
conflicto de archivos y la feature se bloquea.

Archivos **nuevos** (sin conflicto posible):

- `lib/utils/filtro-categoria.ts`
- `tests/unit/filtro-categoria.test.ts`
- `app/(app)/registros/_components/useFiltroCategoria.ts`
- `app/(app)/registros/_components/FiltroCategoria.tsx`

Archivos **editados** (RIESGO DE CONFLICTO — hay que declararlos siempre):

- `app/(app)/registros/_components/RegistrosModule.tsx`
- `tests/components/RegistrosModule.test.tsx`

Archivos que **NO** se tocan (verificación de alcance, R1/R11): `page.tsx`, el service,
su interfaz, los repositorios y cualquier Server Action.
