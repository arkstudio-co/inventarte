# Review — Feature 1: filtro de registros por categoría y subcategoría

> EJEMPLO DE FORMATO. Feature ficticia: así se ve el `progress/review_<feature>.md` que
> escribe el reviewer. Nota el detalle que lo hace útil: la tabla R→test cita
> **archivo:línea**, no "está cubierto". El reviewer no edita código.
>
> Rama `feature/1-ejemplo-filtro-categoria-subcategoria` (0 detrás / 4 adelante de
> `origin/dev`).

## Veredicto: APROBADO

No hay hallazgos bloqueantes. `./init.sh` en verde (`== init OK ==`), suite completa
412 archivos / 3987 tests / 3987 passed; suite acotada de la feature = 31 passed.

## Checklist del arnés

- [x] **Especificación completa.** `requirements.md` (R1–R12 EARS), `design.md` (con
  alternativas descartadas A/B/C y su porqué), `tasks.md` con T0–T7 todas `[x]`.
- [x] **Trazabilidad R→test.** Cada R1–R12 mapea a ≥1 test real con aserciones (tabla
  abajo). Se verificó abriendo cada test, no leyendo la tabla del implementer.
- [x] **Lógica pura.** `lib/utils/filtro-categoria.ts` sin React, DOM ni red; unit propio.
- [x] **Sin backend.** No hay migración, endpoint ni Server Action nueva (confirmado en el
  diff). `page.tsx`, service, repos y el contrato del DTO intactos.
- [x] **Selects encadenados.** Subcategoría `disabled` sin categoría (R3); cambiar
  categoría resetea (R5); centinela `__todas__ → ""` y "Limpiar filtros" (R8/R9).
- [x] **Verificación ejecutable.** `./init.sh` completo corrido **por el reviewer**, no
  solo reportado por el implementer.
- [x] **Calidad.** Sin `console.log` ni `any` en los archivos de la feature. Tasks `[x]`.
- [x] **Worktree.** Desmontado con `./scripts/wt.sh done` tras el merge del PR
  (`CHECKPOINTS.md > Verificación final`).

## Tabla R → test (verificada, archivo:línea)

| Req | Test que lo verifica |
| --- | --- |
| R1  | `tests/components/RegistrosModule.test.tsx:212` |
| R2  | `tests/unit/filtro-categoria.test.ts:39,53` (orden, dedup insensible) |
| R3  | comp `:238` (subcategoría deshabilitada sin categoría) |
| R4  | `tests/unit/filtro-categoria.test.ts:79` + comp `:255` |
| R5  | comp `:281` (cambiar categoría resetea subcategoría) |
| R6  | `tests/unit/filtro-categoria.test.ts:119,132` (incl. excluye subcategoría nula) |
| R7  | `tests/unit/filtro-categoria.test.ts:114` (misma referencia sin categoría) |
| R8  | comp `:310` (Limpiar filtros) + `:334` (opción "Todas las categorías") |
| R9  | comp `:359` (aparece/desaparece según filtro activo) |
| R10 | comp `:381` (mensaje propio, distinto del vacío base) |
| R11 | unit (funciones puras, sin red ni Server Actions) |
| R12 | `tests/unit/filtro-categoria.test.ts:149` (opciones del conjunto completo) |

## Hallazgos

### Bloqueantes
- Ninguno.

### Menores (no bloquean; informativos)

- **M1 — Doble etiquetado del combobox.** Cada `Select` tiene `<label htmlFor>` visible
  ("Categoría"/"Subcategoría") y además `aria-label` ("Filtrar por categoría/subcategoría");
  el nombre accesible lo gana el `aria-label`, que es por lo que resuelven los tests.
  Redundancia inocua. Sin acción requerida.
- **M2 — R11 se verifica por construcción, no por aserción.** Que no haya red se deduce de
  que las funciones son puras y no importan nada de `lib/actions/`. Es correcto, pero un
  test explícito que espíe `fetch` lo haría resistente a una regresión futura. No bloquea.

## Notas de entorno

- El worktree venía sin `node_modules`; se instaló antes de correr el gate. El fallo
  inicial de typecheck era ese, no un defecto de la feature.
- Warning pre-existente ajeno a la feature: "no hay .env".
