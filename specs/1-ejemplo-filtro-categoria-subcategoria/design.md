# Feature 1 — Diseño técnico

> EJEMPLO DE FORMATO. Feature ficticia; enseña cómo se escribe un `design.md`.
>
> Frontend puro, sin backend. Todo el filtrado y la derivación de opciones ocurre en
> cliente sobre los `RegistroDTO[]` que el Server Component padre ya entrega a
> `RegistrosModule` (datos por props; sin fetch de cliente).

## 1. Modelo de datos y migraciones

**Ninguna.** No hay tablas, columnas, RLS ni migraciones. Los campos necesarios ya existen
en `RegistroDTO`:

- `categoriaNombre: string` — siempre presente.
- `subcategoriaNombre: string | null` — puede faltar.

Fuente: `lib/interfaces/services/IRegistrosService.ts:30-31`. No se toca el service, el
repositorio ni el contrato del DTO.

## 2. Endpoints / rutas

**Ninguno.** No hay Server Actions nuevas ni route handlers. R11 exige filtrado 100% en
cliente. La página `app/(app)/registros/page.tsx` no cambia: sigue haciendo el pre-fetch
server-side y pasando la lista por props.

## 3. Lógica pura de derivación y filtrado (unit-testable sin React)

Nuevo módulo `lib/utils/filtro-categoria.ts` con funciones puras (sin estado, sin side
effects), testeables en `tests/unit/` sin montar React:

```ts
import type { RegistroDTO } from "@/lib/interfaces/services/IRegistrosService";
import { normalizeName } from "@/lib/utils/normalize";

export interface OpcionFiltro { value: string; label: string } // value = nombre original

/** R2/R12: categorías únicas, deduplicadas y ordenadas alfabéticamente. */
export function derivarCategorias(registros: RegistroDTO[]): OpcionFiltro[];

/** R4: subcategorías únicas (no nulas) de la categoría dada, dedup + ordenadas. */
export function derivarSubcategorias(
  registros: RegistroDTO[],
  categoriaNombre: string,
): OpcionFiltro[];

/** R6/R7: filtro combinado. categoria==="" y subcategoria==="" = sin filtro. */
export function filtrarRegistros(
  registros: RegistroDTO[],
  filtro: { categoria: string; subcategoria: string },
): RegistroDTO[];
```

Reglas de las funciones:

- **Dedup.** Se agrupa por `normalizeName(nombre)`, conservando el primer nombre original
  visto. El `value` es siempre el **nombre original** (no normalizado); toda comparación
  re-normaliza. Guardar el normalizado en el estado obligaría a mapear de vuelta para
  mostrarlo, que es una fuente clásica de bugs de acentos.
- **Orden.** `localeCompare("es", { sensitivity: "base" })`.
- **`derivarSubcategorias`** omite `subcategoriaNombre === null` y compara la categoría con
  `normalizeName` para tolerar diferencias de acento o caso.
- **`filtrarRegistros`**: si `categoria === ""` devuelve **la misma referencia** de lista
  (R7) — no una copia; así el `useMemo` de arriba no invalida render sin necesidad. Con
  subcategoría, exige además `subcategoriaNombre !== null` (R6).

## 4. Estado, encadenamiento y memoización (React)

La orquestación de estado vive en un hook colocado
`app/(app)/registros/_components/useFiltroCategoria.ts`:

- Estado: `categoria` y `subcategoria`, ambos `useState("")` (`""` = "todas", R7).
- `setCategoriaYReset(v)`: fija categoría y **resetea subcategoría a `""`** (R5).
- Opciones memoizadas con `useMemo`:
  - `categorias = useMemo(() => derivarCategorias(registros), [registros])` (R2/R12) —
    derivadas de la lista **completa**, no de la filtrada.
  - `subcategorias = useMemo(() => categoria ? derivarSubcategorias(registros, categoria) : [], [registros, categoria])` (R3/R4).
- `hayFiltro = categoria !== "" || subcategoria !== ""` (R9).
- `limpiar()`: resetea ambos (R8).
- `aplicar(lista)` = `filtrarRegistros(lista, { categoria, subcategoria })`.

Presentación en `app/(app)/registros/_components/FiltroCategoria.tsx`:

- Dos `Select` (`components/ui/select.tsx`) con `aria-label` "Filtrar por categoría" y
  "Filtrar por subcategoría" (rol `combobox`, resoluble por nombre accesible en tests).
- Botón "Limpiar filtros" visible solo si `hayFiltro` (R9).
- **Opción "todas".** La primitiva trata `value === ""` como placeholder, así que el estado
  "sin filtro" se representa con `""`. Para poder volver a "todas" **desde el dropdown** se
  antepone una opción con valor centinela `TODAS = "__todas__"` que el handler traduce a
  `""` (R8). La subcategoría va `disabled` cuando `categoria === ""` (R3).

## 5. Integración en `RegistrosModule.tsx` (EDIT)

Cambios mínimos y localizados:

1. Instanciar el hook con `registros`.
2. Renderizar `<FiltroCategoria ... />` cerca del tope, dentro de
   `<section aria-label="Filtros">`.
3. Calcular `registrosVisibles = aplicar(registros)` (memoizado).
4. Sustituir la fuente de render de la lista por `registrosVisibles`.
5. Mensaje "sin coincidencias" (R10): cuando `registrosVisibles.length === 0` **y**
   `hayFiltro`, mostrar "No hay registros que coincidan con el filtro." en lugar de "No hay
   registros." Son dos estados distintos y el usuario necesita distinguirlos: uno se
   arregla limpiando el filtro, el otro no.

No se toca ninguna Server Action ni el contrato de props del módulo.

## 6. Accesibilidad y UX

- Selects con `aria-label`; el de subcategoría con `disabled` real cuando no hay categoría
  (R3) — `disabled` real, no solo estilo, para que el lector de pantalla lo anuncie.
- Orden alfabético estable e insensible a acentos, para que las opciones no "salten".
- "Limpiar filtros" como `Button variant="ghost"`; aparece/desaparece según `hayFiltro`.

## 7. Alternativas descartadas

`docs/specs.md` exige **al menos una** alternativa descartada con su porqué. No es
burocracia: obliga a que la decisión sea deliberada y deja escrito para el que venga
después por qué el camino obvio no se tomó.

**A. Filtrado server-side vía query params.** Descartada: los DTOs ya están cargados en el
cliente, así que añadiría un round-trip de red y complejidad (revalidación, `searchParams`,
re-fetch) sin beneficio. El volumen es pequeño y el filtrado en memoria es instantáneo. Si
el volumen creciera hasta necesitar paginación server-side, esta decisión se revisa.

**B. Derivar las opciones del subconjunto ya filtrado.** Descartada: sería más simple de
escribir, pero al elegir una categoría desaparecerían las demás del dropdown y el usuario
quedaría atrapado sin poder cambiar de opción sin limpiar antes. De ahí R12.

**C. Representar "todas" con una opción de valor vacío dentro del `Select`.** Descartada:
la primitiva mapea `value === ""` a placeholder y sus `Item` requieren valor no vacío, así
que la opción no sería seleccionable de forma fiable. Se usa el centinela `"__todas__"`
traducido a `""` en el handler.
