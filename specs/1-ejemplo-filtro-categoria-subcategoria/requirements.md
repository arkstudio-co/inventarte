# Feature 1 — Filtro de registros por categoría y subcategoría

> EJEMPLO DE FORMATO. Es una feature ficticia: sirve para enseñar cómo se escribe un
> `requirements.md`, no para implementarla. Reemplázala por la primera feature real.
>
> Requisitos en notación EARS. Sin detalles de implementación (esos van en `design.md`).
> Cada `R<n>` debe poder verificarse con un test.

## Contexto (hechos verificados en el código, no supuestos)

Esta sección es la que separa un spec útil de uno inventado: cada afirmación lleva su
`archivo:línea`. Si un dato no está en el código, en `docs/` o en `specs/`, **no se
rellena con supuestos**: se baja a "Preguntas abiertas".

- La lista se renderiza en `RegistrosModule`
  (`app/(app)/registros/_components/RegistrosModule.tsx:62`), que recibe por props los
  registros ya resueltos server-side: `registros: RegistroDTO[]`
  (`RegistrosModule.tsx:41`).
- `RegistroDTO` ya incluye `categoriaNombre: string` y `subcategoriaNombre: string | null`
  (`lib/interfaces/services/IRegistrosService.ts:30-31`). Por tanto **no se requiere
  backend**: opciones y filtrado se derivan en cliente de los DTOs ya cargados.
- Existe una primitiva `Select` reutilizable (`components/ui/select.tsx`): rol accesible
  `combobox`, `value` string (`""` = sin selección), `onValueChange`, `options`.
- Existe `normalizeName` (`lib/utils/normalize.ts:7`) para comparar nombres de forma
  insensible a mayúsculas, acentos y espacios sobrantes. Se reutiliza para deduplicar.

## Requisitos

**R1 (Ubicuo).** El sistema DEBE mostrar, dentro de `RegistrosModule` y **solo ahí**, un
control de filtro compuesto por dos selects: uno de **Categoría** y otro de
**Subcategoría**. Ninguna otra lista de la aplicación se ve afectada.

**R2 (Ubicuo).** El sistema DEBE derivar las opciones del select de **Categoría** a partir
de los registros ya cargados, con **una opción por categoría distinta** (deduplicado
insensible a mayúsculas y acentos) y ordenadas alfabéticamente.

**R3 (De estado).** MIENTRAS no haya una categoría seleccionada, el sistema DEBE mantener
el select de **Subcategoría deshabilitado** y sin filtro de subcategoría aplicado.

**R4 (Por evento).** CUANDO se selecciona una categoría, el sistema DEBE habilitar el
select de **Subcategoría** y poblarlo **exclusivamente** con las `subcategoriaNombre`
distintas (no nulas) de los registros cuya `categoriaNombre` es igual a la seleccionada,
deduplicadas y ordenadas alfabéticamente.

**R5 (Por evento).** CUANDO cambia la categoría seleccionada, el sistema DEBE **resetear**
la selección de subcategoría a "todas".

**R6 (Condicional).** SI hay una categoría seleccionada, ENTONCES el sistema DEBE mostrar
únicamente los registros cuya `categoriaNombre` coincide; y SI además hay una subcategoría
seleccionada, ENTONCES DEBE exigir que coincidan ambas. Los registros con
`subcategoriaNombre === null` DEBEN quedar excluidos cuando hay una subcategoría concreta
seleccionada.

**R7 (De estado).** MIENTRAS no haya categoría seleccionada ("todas"), el sistema DEBE
mostrar todos los registros cargados, sin ningún estrechamiento.

**R8 (Por evento).** CUANDO el usuario elige "Todas las categorías" / "Todas las
subcategorías", o activa "Limpiar filtros", el sistema DEBE limpiar el/los filtro(s) y
restaurar la lista completa. "Limpiar filtros" DEBE limpiar **ambos** selects a la vez.

**R9 (Opcional).** DONDE haya al menos un filtro activo, el sistema DEBE ofrecer un control
"Limpiar filtros"; MIENTRAS no haya ningún filtro activo, ese control NO DEBE estar
disponible.

**R10 (Condicional).** SI el filtro activo no produce ninguna coincidencia, ENTONCES el
sistema DEBE mostrar un mensaje de "sin coincidencias con el filtro", **distinguible** del
mensaje base de "no hay registros" (lista realmente vacía).

**R11 (Ubicuo).** El sistema DEBE derivar opciones y aplicar el filtro **100% en cliente**
a partir de los DTOs ya cargados; NO DEBE realizar ninguna petición de red ni invocar
Server Actions para filtrar u obtener opciones.

**R12 (Ubicuo — estabilidad de opciones).** El conjunto de opciones de Categoría DEBE
derivarse del conjunto completo cargado (no del subconjunto ya filtrado), de modo que la
selección actual no elimine otras opciones disponibles.

## Trazabilidad (requisito → prueba prevista)

Esta tabla no es decorativa: el reviewer **rechaza** la feature si algún `R<n>` termina
sin un test concreto que lo cubra (`CHECKPOINTS.md > Trazabilidad`).

| Req | Prueba prevista (nombre descriptivo del test) |
| --- | --- |
| R1  | "renderiza los selects de Categoría y Subcategoría en el módulo" |
| R2  | "las opciones de Categoría son las únicas, deduplicadas y ordenadas" |
| R3  | "sin categoría elegida, el select de Subcategoría está deshabilitado" |
| R4  | "al elegir una categoría, Subcategoría ofrece solo las suyas" |
| R5  | "cambiar de categoría resetea la subcategoría a todas" |
| R6  | "filtrar por categoría+subcategoría muestra solo lo coincidente; excluye nulos" |
| R7  | "sin filtro, se muestran todos los registros" |
| R8  | "elegir 'Todas' / 'Limpiar filtros' restaura la lista completa" |
| R9  | "'Limpiar filtros' solo aparece cuando hay un filtro activo" |
| R10 | "filtro sin coincidencias muestra el mensaje 'sin coincidencias'" |
| R11 | "el filtrado no invoca Server Actions ni red (funciones puras)" |
| R12 | "elegir una subcategoría no elimina otras opciones de categoría" |

## Preguntas abiertas

Se dejan explícitas en vez de resolverse por supuesto (regla 6 de `CLAUDE.md`). El gate
F1.4 —la aprobación humana del spec— es donde se cierran.

1. **Registros sin subcategoría.** ¿Se desea una opción explícita "Sin subcategoría" para
   filtrar los que tienen `subcategoriaNombre === null`? Por defecto NO se incluye: esos
   registros solo aparecen bajo "Todas las subcategorías".
2. **Persistencia del filtro.** ¿El filtro debe sobrevivir a una recarga de la página
   (query params) o es estado efímero de la sesión? Por defecto, efímero.
3. **Composición con un futuro buscador de texto.** Si más adelante entra un buscador,
   ambos filtros de cliente deberían componerse en AND sobre la misma lista. No bloquea
   esta feature, pero conviene confirmar el orden de integración.
