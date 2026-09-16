---
description: Toma un port de imports/<slug>/ (salida de una extraccion hecha en otro proyecto) y lo convierte en una feature de este repo: crea la ficha en el board, siembra el spec desde el prompt y corre el ciclo SDD normal. Uso: /importar-modulo <el import: un slug (login) o una ruta (imports/login)>
agent: leader
---

Vas a convertir un **port** —material extraído en otro proyecto y traído a
`imports/<slug>/`— en una feature de este repo, siguiendo el ciclo SDD normal. Es la
dirección contraria de `/extraer-modulo`: aquel toma código construido y produce un prompt
portable; este toma el prompt portable y lo implementa aquí.

Import: **$ARGUMENTS**

Alcance: **solo ports en `imports/<slug>/`**. Si te piden implementar una feature sin port,
eso es el ciclo normal desde el board (F0 → `spec_author`). Si te piden tocar el arnés, eso es
`/afinar-regla`. El port **no se pega**: se reimplementa a partir de la siembra, y la deuda
que el prompt marca «no la heredes» no entra al spec.

## Paso 0 — Guardas

Para, di por qué y no escribas nada si:

- El argumento **no resuelve a ninguna carpeta** bajo `imports/`. Un port se cita por su slug
  (`login`) o su ruta (`imports/login`), no por un archivo suelto.
- El paquete **no es válido**: falta `prompt.md` o `decisiones.md`. `inventario.md` es
  opcional: si viene se conserva y se cita como evidencia del origen, pero sin él el port
  sigue siendo válido (`prompt.md` es autocontenido por diseño).
- La feature del port **ya existe**: una ficha en `feature_list.json` o un spec en `specs/`
  declara `imports/<slug>/` como origen. **No se importa dos veces.**
- Las tools de Jira **no responden** (prefijo `atlassian_*`). Este comando crea la ficha en el
  board en el Paso 1; sin board no hay feature. No inventes el estado (`docs/jira.md`).

## Paso 1 — Crear la ficha en el board

Lee `jira.project` de `feature_list.json` — el proyecto no se deduce, se lee (regla 6 de
`CLAUDE.md`). Con las herramientas MCP de `atlassian`:

- Crea el issue (tipo **Story**, salvo que el board use otro para features) con:
  - **Summary:** `Port <slug> desde imports/<slug>/` (el humano puede ajustarlo después).
  - **Description:** el propósito y actor de `prompt.md > 1`, la lista de `E<n>` de la §8 y
    la referencia a las decisiones abiertas de `decisiones.md`. **Nada se inventa**: todo sale
    del port.
  - **Labels** `zone:<…>` y `complexity:<…>` con los criterios de `AGENTS.md > Evaluacion
    automatica`, evaluados sobre los `E<n>` y los criterios de aceptación de la §11 del prompt.
    El import **no hereda** los valores del origen: los evalúa este repo.
- **El board se escribe ANTES de sembrar** (`docs/jira.md > Cuando el disco descubre que el
  board esta desactualizado`): la descripción que creaste es la acotación. Si la acotación del
  Paso 3 cambia el alcance, se reescribe el issue antes de delegar en `spec_author`.

## Paso 2 — Registrar en disco, montar el worktree y sembrar

- Añade la ficha a `feature_list.json`: `key` (el del issue creado), `description` (la del
  board), `sdd: true`, `epic` null, `zone`/`complexity` evaluados, `depends_on` null,
  `branch` `feature/<key>-<slug>` y `spec_path` `specs/<key>-<slug>/`. Debe pasar el
  validador de `./init.sh` (key con prefijo del proyecto, campos completos).
- Monta el worktree: `./scripts/wt.sh new <key> <slug>`. El worktree principal se queda en
  `dev`; todo el trabajo ocurre en `.worktrees/<key>-<slug>/`.
- Siembra `specs/<key>-<slug>/requirements.md`:
  - Los `E<n>` de `prompt.md > 8` renumerados `R1..Rn` — **renumeración mecánica, sin
    reescribir contenido** — con una sección `## Origen` que declare
    `imports/<slug>/prompt.md > 8` y el mapa `E<n> → R<n>` completo.
  - La deuda de `prompt.md > 2` («No la heredes») entra como **NO implementar**, no como
    requisito: el port no arrastra los fallos del original.
  - Los prerrequisitos de la §12 y las librerías de la §15 entran como **material para el
    `design.md`**; toda dependencia nueva pasa por la aprobación humana (regla 7 de
    `CLAUDE.md`, `docs/dependencias.md`).
- Documenta la evaluación en `progress/current.md > Evaluaciones` y registra la feature en
  `> Features en curso`.
- Corre `./init.sh --rapido`: el gate valida la ficha que acabas de crear y sembrar.

## Paso 3 — Acotar con el humano

Las decisiones de `decisiones.md` **no se heredan**: el port las presenta y ESTE proyecto
decide. Pregunta con la tool `question` de opencode, en tandas de hasta 4, en lenguaje de
negocio, tu recomendación como primera opción etiquetada `(Recomendado)`. Anexa cada respuesta
a la siembra con su fecha.

**Si alguna respuesta cambia el alcance** (`zone`, `complexity`, `depends_on` o
`description`), reescribe el issue en Jira **antes** de delegar.

## Paso 4 — Delegar en spec_author

La feature sigue `AGENTS.md` desde F1.2 con el requisito ya sembrado: `spec_author` adapta a
este repo (stack, convenciones, la alternativa descartada de `design.md`), luego F1.3
(`spec_ready` + tarjeta a *Spec en revision* con comentario apuntando a `specs/<feature>/`) y
**F1.4 — DETENTE**: pide aprobación humana antes de implementar. En la revisión se aplica la
línea de port de `.opencode/agents/reviewer.md`.

Sin agente nuevo: `spec_author`, `implementer` y `reviewer` ya cubren todo; el port no inventa
un rol.

## Lo que este comando no hace

No copia código del origen: reimplementa según el spec. No implementa sin ficha de board: la
crea en el Paso 1, y sin board para. No arrastra la **deuda** del original. No toca
`imports/<slug>/`: el port es entrada, no salida. No evalúa la calidad del origen: lo que trae
es un prompt, y los criterios de la §11 son los que mandan.