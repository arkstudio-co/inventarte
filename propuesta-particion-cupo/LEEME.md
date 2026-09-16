# Propuesta: partición de fichas + cupo por conflicto de archivos

**Estado: NO aplicado.** Esto es una propuesta completa y ejecutable, no el arnés vivo.
`arbol/` refleja la estructura del repo: aplicarla es copiar sus archivos encima de los de
la raíz. Nada de esto está en `dev`.

Generado el 2026-09-06 con `/afinar-regla`, a partir de la pregunta «¿`/afinar-feature` sabe
detectar que una feature es demasiado grande y partirla?». La respuesta era no.

> **Aviso:** `harnessConfig/` está en `.gitignore` (línea 12). Esta carpeta **no se versiona**.
> Si la quieres en git, muévela fuera o quita la regla.

---

## Los dos problemas que resuelve

**1. Nadie mide el tamaño de una ficha.** Entre el board (F0) y el spec (F1.2) no hay ningún
punto donde se pregunte «¿esto es una feature o son tres?». La única partición escrita —
`fullstack` → backend + frontend — llevaba meses sin verificador y era letra muerta: **QC-15 y
QC-52 llegaron a `done` siendo `fullstack` sin que nadie las partiera**, y QC-52 incluso pasó
por `/afinar-feature`.

**2. El cupo de paralelismo usa la llave equivocada.** «Máximo 2 `in_progress` por zona» es un
proxy grueso del conflicto real, que son los archivos. Frenó trabajo que no chocaba con nada:

- `progress/current.md:547` — *«la zona `backend` está en 2 de 2 (QC-25 y QC-42), así que F1.0
  espera a que una pase a `done`»*
- `progress/current.md:1066` — *«La zona `backend` tiene 2 `in_progress` (QC-6 y QC-7), o sea
  el cupo lleno: la selección automática habría salteado QC-14»*

Y la validación de conflicto de archivos, que sí era la llave buena, **era manual y ciega**: el
paso 2 de `AGENTS.md > Validacion de conflicto` manda leer `specs/<feature>/tasks.md`, pero ese
archivo lo escribe `spec_author` en F1.2 y la selección ocurre en F1.0. Para una ficha nueva no
existía todavía.

---

## Decisiones cerradas

| Eje | Decisión |
|---|---|
| Fuerza de la detección | **Bloqueante con salida escrita.** Dos o más señales y no se siembra hasta que el humano decida; dejarla entera exige motivo en «Decisiones cerradas» |
| Qué se detecta | No «¿es un módulo entero?» sino **cuántos trabajos distintos hay dentro** — incluye una feature pequeña sobre un módulo que ya existe |
| Ejes de corte | **Frontera externa → capa → operación**, en orden de disyunción de archivos. Capa es el defecto |
| Suelo de granularidad | Por operación **solo si el flujo difiere de verdad** (validaciones, reglas o permisos propios). QC-43 seguiría siendo una sola ficha |
| Regla `fullstack` | **Absorbida** por el corte por capa, y por fin verificada (bloque 7) |
| Llave del paralelismo | **Los archivos**, no la zona ni la épica |
| Archivos de alto tráfico | Lista corta y explícita que **no bloquea**: `db/schema.prisma`, `feature_list.json`, `progress/**` |
| Tope numérico | **5 `in_progress` globales**, como red de seguridad para lo que un cruce de archivos no ve |
| Retroactividad | Solo hacia adelante. Ninguna ficha existente se toca |

### Por qué no por épica

Se evaluó «1 por zona **y** por épica», que es lo que se propuso en la conversación. Se descartó
por tres razones:

1. **Ya se intentó y se revirtió.** `progress/current.md:1810-1815`, verificado el 2026-09-03:
   *«Se llegó a redactar con `/afinar-regla` y el humano pidió revertirla; se revirtió entera»*.
   El registro no dice por qué.
2. **`docs/jira.md` la contradice explícitamente**: *«la épica agrupa, no bloquea […] no altera
   el orden ni el cupo de paralelismo»*.
3. **El propio backlog la rompe.** QC-48, QC-49, QC-50, QC-51, QC-59, QC-60 y QC-61 están en
   cinco épicas distintas y hacen el mismo cambio estructural (multi-empresa). Por épica
   entrarían las siete en paralelo, y colisionarían en `db/schema.prisma` y en el orden de
   migraciones.

La épica es mal proxy justo en el backend, que es donde se quería el paralelismo ancho.

---

## Qué cambia, por archivo

| Archivo | Cambio |
|---|---|
| `.claude/commands/afinar-feature.md` | **Paso 1b** nuevo (señales, tres ejes, fuerza) + `Archivos previstos:` en el Paso 5 + `files` en el Paso 6 |
| `AGENTS.md` | `### Criterios de particion` (absorbe `fullstack`) · `## Paralelismo` reescrito · F1.0 selecciona por archivos · F1.3 copia `files` |
| `CLAUDE.md` | Regla 1 reescrita: archivos en vez de zona, tope global de 5 |
| `README.md` | El item 6 dejaba de ser cierto |
| `docs/jira.md` | `files` en el contrato de campos y en lo que F0 no degrada · tercera forma de desactualización |
| `.claude/agents/leader.md` | Paralelismo por archivos · partición · copia `files` en F1.3 |
| `.claude/agents/spec_author.md` | `tasks.md` debe traer `## Archivos esperados` |
| `scripts/validate-features.mjs` | Bloque 3 reescrito (solape + tope) · **bloque 7** (`fullstack` de tránsito) |

Se numera **Paso 1b** y no se renumeran los pasos: es la convención que ya usa
`validate-features.mjs` (`// --- 1b.`) y evita tocar `docs/jira.md:260`, la única referencia
externa a los números de paso del comando.

---

## Verificación hecha

- `node --check` sobre el validador: **OK**.
- Ejecutado contra el `feature_list.json` real: **bloque 7 no dispara** (QC-15 y QC-52 están
  `done` y el check no mira `done`). El gate no se pone rojo por el histórico.
- La lógica de solape probada con 5 casos, todos correctos:

| Caso | Choca | Correcto |
|---|---|---|
| Módulos distintos compartiendo `db/schema.prisma` | no | ✔ *(es lo que habilita 5 de backend)* |
| Mismo módulo, glob vs archivo dentro | sí | ✔ |
| Front y back del mismo módulo | no | ✔ |
| Solo comparten `progress/` | no | ✔ |

---

## Deuda de adopción

Al aplicarlo, `./init.sh` dará **rojo** con dos errores, y son legítimos:

```
QC-47 esta in_progress sin declarar files
QC-57 esta in_progress sin declarar files
```

Las dos features en vuelo no tienen `files`. Antes de adoptar hay que rellenárselo a mano
desde sus `specs/<key>/tasks.md`. Es la única migración que pide el parche.

---

## Qué queda fuera a propósito

**`unblocks:spec_ready`** — la dependencia blanda que permitiría arrancar el front en cuanto el
back llega a `spec_ready`, sin esperar a que esté `done`. Está redactada entera en
`opcional-unblocks/`, sin aplicar. Razón para diferirla: el cupo por archivos ya entrega el
paralelismo que se buscaba (varias fichas independientes a la vez); `unblocks` sirve para
solapar fichas *dependientes entre sí*, que es un caso más raro, trae riesgo de retrabajo si el
contrato cambia, y añade un concepto nuevo al contrato de Jira. Es ampliable después sin
deshacer nada.

**El drift de base entre worktrees** — dos sesiones aplicando migraciones a la misma base
colisionan aunque sus archivos sean disjuntos. Pasó cuatro veces, la última entre QC-34 y QC-52
(`progress/current.md:1735`). **Ensanchar el paralelismo aumenta esa exposición.** Necesita
ficha propia en el board (aislamiento de base por worktree). Hasta entonces es el riesgo
conocido y asumido de esta regla, y queda dicho en `AGENTS.md > Paralelismo`.

---

## Fichas `pending` que dispararían el Paso 1b

Ninguna se toca. Es solo para saber qué esperar cuando les toque su corrida:

| Ficha | Señales | Corte probable |
|---|---|---|
| **QC-64** | `high` + integra un editor de terceros mezclado con la pantalla | **frontera externa** |
| **QC-63** | `fullstack` sin evaluar | capa |
| **QC-36** | `fullstack` sin evaluar | capa |
| **QC-35** | `high` + lista, alta, edición, cancelación y borrado en una | operación, **solo si los flujos difieren** |
| **QC-39**, **QC-45** | lista + alta + edición + borrado | probablemente **no se parten**: comparten formulario, como QC-43 |
| **QC-38** | alta, consulta, edición y borrado, sin pantalla | **no se parte** — es QC-43 otra vez |

---

## Cómo aplicarlo

```sh
cp -r harnessConfig/propuesta-particion-cupo/arbol/. .
# rellenar `files` en QC-47 y QC-57 en feature_list.json
./init.sh
# y replicar en los espejos de harnessConfig/
```

Los espejos de `harnessConfig/` (`AGENTS.md`, `CLAUDE.md`, `docs/`, `scripts/`, `.claude/`)
deben quedar idénticos a la raíz: es la plantilla del arnés.
