# Implementación — Feature 1: filtro de registros por categoría y subcategoría

> EJEMPLO DE FORMATO. Feature ficticia: así se ve la bitácora que el implementer escribe
> en `progress/impl_<feature>.md`. Lo que importa del formato son tres cosas —archivos
> tocados, mapa `R<n> → test` y **salida real** de la verificación—, no la prosa.

## Archivos tocados

Nuevos:
- `lib/utils/filtro-categoria.ts` — lógica PURA (sin React): `derivarCategorias` (dedup
  normalizado, orden `es`), `derivarSubcategorias` (de la categoría elegida, sin nulos),
  `filtrarRegistros({categoria, subcategoria})` (R6/R7). Reusa `normalizeName`.
- `app/(app)/registros/_components/useFiltroCategoria.ts` — hook de estado:
  `categoria`/`subcategoria` (`""`=todas), `setCategoriaYReset` (R5), opciones memoizadas
  (R2/R4/R12), `hayFiltro` (R9), `limpiar` (R8), `aplicar(lista)` (R6/R7).
- `app/(app)/registros/_components/FiltroCategoria.tsx` — presentación: dos `Select` con
  `aria-label`; subcategoría `disabled` sin categoría (R3); centinela `__todas__` → `""`
  (R8); botón "Limpiar filtros" solo si `hayFiltro` (R9).
- `tests/unit/filtro-categoria.test.ts` — unit de la lógica pura (R2/R4/R6/R7/R12).

Editados:
- `app/(app)/registros/_components/RegistrosModule.tsx` — monta `<FiltroCategoria>`,
  deriva `registrosVisibles` y añade el mensaje "sin coincidencias" (R10).
- `tests/components/RegistrosModule.test.tsx` — 9 tests nuevos.
- `specs/1-ejemplo-filtro-categoria-subcategoria/tasks.md` — tareas marcadas `[x]`.

## Decisiones tomadas durante la implementación

Van aquí, no en el chat: si no queda escrito, en la siguiente sesión no existe.

- **`filtrarRegistros` devuelve la MISMA referencia cuando no hay filtro** (R7), en vez de
  una copia. Con una copia, el `useMemo` del módulo invalidaba en cada render y la lista
  se re-renderizaba entera sin que nada hubiera cambiado.
- **Las opciones se derivan de la lista completa, nunca de `registrosVisibles`** (R12). Al
  cablearlo por error sobre la lista filtrada, elegir una categoría vaciaba el dropdown y
  dejaba al usuario sin forma de cambiar de opción. Lo detectó el test de R12.

## Mapa requisito → prueba

| Req | Prueba |
| --- | --- |
| R1  | comp "R1: renderiza los selects de Categoría y Subcategoría" |
| R2  | unit "derivarCategorias (R2)" (orden + dedup insensible a acentos) |
| R3  | comp "R3: sin categoría elegida, Subcategoría está deshabilitado" |
| R4  | unit "derivarSubcategorias (R4)"; comp "R4: solo las subcategorías de esa categoría" |
| R5  | comp "R5: cambiar de categoría resetea la subcategoría a todas" |
| R6  | unit "filtrarRegistros (R6)" (incl. excluye subcategoría nula) |
| R7  | unit "R7: sin categoría devuelve la MISMA referencia de lista" |
| R8  | comp "R8: 'Limpiar filtros' restaura" + "R8: elegir 'Todas las categorías'" |
| R9  | comp "R9: 'Limpiar filtros' solo aparece con un filtro activo" |
| R10 | comp "R10: filtro sin coincidencias muestra su propio mensaje" |
| R11 | unit (funciones puras, sin red ni Server Actions) |
| R12 | unit "estabilidad de opciones (R12)" |

## Verificación

Se pega la **salida real**, no un resumen. "Pasa todo" no es evidencia (`docs/verification.md`).

- `./init.sh`: **verde** (`== init OK ==`).
  - typecheck (`tsc --noEmit`): sin errores.
  - lint: 0 errores.
  - test (`vitest run`): **412 archivos, 3987 tests, 3987 passed**.
- Suite acotada de la feature (unit + módulo): **31 passed**.

Nota: el warning `no hay .env` es pre-existente del entorno local y ajeno a esta feature.
