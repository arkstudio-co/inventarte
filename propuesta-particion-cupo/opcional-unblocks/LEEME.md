# Opcional: `unblocks:spec_ready` — el front arranca sin esperar a que el back esté `done`

**No aplicado, y no incluido en `arbol/`.** Esto se monta *encima* de la propuesta principal;
por sí solo no tiene sentido.

## Qué resuelve

Hoy `depends_on` tiene una sola fuerza, la más dura:
*«Feature con `depends_on` no arranca hasta que su dependencia este `done`»*. Eso serializa una
cadena de partición: el front de una pantalla espera a que el back esté implementado, revisado y
mergeado.

Con este añadido, `depends_on` tiene dos:

| Fuerza | Se desbloquea cuando | Para qué |
|---|---|---|
| **hasta `done`** (por defecto) | la dependencia está mergeada | dependencia de datos real |
| **hasta `spec_ready`** (label) | el contrato está escrito y aprobado | el front arranca en cuanto el back declaró entradas y respuesta |

Escenario: back de `crear` llega a `spec_ready`, su `design.md` congela el contrato I/O, y el
front arranca en paralelo en otra sesión contra un stub tipado.

## Por qué se difirió

1. **El cupo por archivos ya da el paralelismo que se buscaba.** Varias fichas independientes en
   vuelo a la vez. Esto solo añade solapar fichas *dependientes entre sí*, que es más raro.
2. **Trae riesgo propio.** Si el contrato cambia durante la implementación del back, el front ya
   construyó encima. La mitigación —«es una revisión de spec con su puerta»— es proceso, no
   verificación: nadie lo hace cumplir.
3. **La verificación no paraleliza.** El front pasa typecheck, lint y unit contra el stub, pero
   su integración y su E2E no son reales hasta que el back aterrice. `CHECKPOINTS.md` exige E2E
   para flujos críticos: o se difiere con motivo escrito, o lo cierra una tercera ficha.
4. **Es ampliable sin deshacer nada.** El label ya significaría lo correcto el día que se adopte.

## Por qué un label y no granularidad por link

`unblocks:spec_ready` es un label en la ficha dependiente, siguiendo el patrón que el repo ya usa
(`sdd`, `slug:`, `zone:`, `complexity:`). Tiene un techo conocido: **es por ficha, no por link**,
así que una ficha con tres dependencias no puede declarar que solo una es blanda.

Se acepta el techo a propósito. La alternativa —volver `depends_on` estructurado
(`[{key, hasta}]`)— rompería el polimorfismo que `docs/jira.md` defiende explícitamente
(«escalar o array, key o id, las cuatro combinaciones a propósito»), y obligaría a revisar las
dependencias de las 53 fichas existentes. No añade nada al escenario que motivó esto.

**Y tiene que vivir en Jira, no solo en disco:** F0 regenera `depends_on` desde los issue links
en cada importación, y la fuerza no está en la lista corta de cosas que no se degradan. Si no
fuera un label, la siguiente F0 se la llevaría.

---

## Los cuatro parches

### 1. `.claude/commands/afinar-feature.md` — Paso 5

Se añade al bullet «Una ficha que nace de una partición»:

```markdown
  - **La fuerza de su dependencia.** Si la ficha solo espera a que la anterior *declare su
    contrato* —el front de una pantalla esperando las entradas y la respuesta que fija el
    back—, lleva además el label **`unblocks:spec_ready`**. Sin él, `depends_on` significa lo
    de siempre: no arranca hasta que la dependencia esté `done`.
  - **Y una línea en la ficha de la que depende**, en su Description:
    `Contrato esperado por: <key>`. Es lo que hace que `spec_author` sepa que su `design.md`
    tiene un consumidor y no solo un lector. Sin esa línea, el label de la otra ficha promete
    una firma que nadie se comprometió a escribir.
```

### 2. `AGENTS.md > Paralelismo` — la última línea gana su excepción

Sustituye `Feature con depends_on no arranca hasta que su dependencia este done.`:

```markdown
Feature con `depends_on` no arranca hasta que su dependencia este `done`. **Excepcion: si la
ficha lleva el label `unblocks:spec_ready`**, arranca en cuanto su dependencia llega a
`spec_ready`, porque lo unico que esperaba era el contrato — las entradas y la respuesta que
fija el `design.md` de la otra. Lo escribe `/afinar-feature` al partir, y solo el: un
`depends_on` que viene del board significa siempre "hasta `done`".

Lo que compra: el front de una pantalla y el back que la sirve corren en dos sesiones a la vez.
**Lo que no compra: la verificacion.** El front pasa typecheck, lint y unit contra un stub
tipado, pero su integracion y su E2E no son reales hasta que el back aterrice — o se difiere el
E2E con motivo escrito (`/afinar-feature`, paso 2, eje 13), o lo cierra una tercera ficha. Y si
el contrato cambia despues de `spec_ready`, es una revision de spec con su puerta de aprobacion,
no una edicion silenciosa.
```

### 3. `.claude/agents/spec_author.md` — punto 2 (`design.md`)

```markdown
   **Si la ficha trae `Contrato esperado por: <key>`, otra feature va a programar contra este
   archivo sin que exista todavía tu implementación.** Declara el contrato I/O de forma
   explícita y cerrada —entradas con su tipo y su obligatoriedad, forma de la respuesta, y los
   errores que puede devolver— en una sección propia del `design.md`. No lo dejes implícito en
   la prosa de las decisiones técnicas: alguien lo va a leer como una firma, porque lo es.
```

### 4. `.claude/agents/leader.md` — al bullet del paralelismo

```markdown
- **`depends_on` tiene dos fuerzas.** Por defecto bloquea hasta `done`; con el label
  `unblocks:spec_ready` bloquea solo hasta `spec_ready`. Al seleccionar en F1.0, respeta la que
  traiga la ficha. Antes de desbloquear una ficha con ese label, **abre el `design.md` de su
  dependencia y comprueba que el contrato I/O este declarado**. Si no esta, la ficha NO se
  desbloquea: el label promete una firma contra la que programar, y sin ella el front arrancaria
  contra nada. Anotalo en `progress/current.md > Deudas y cosas abiertas` y sigue.
```

### 5. `docs/jira.md` — contrato de campos

```markdown
| `unblocks_at` | label `unblocks:spec_ready` presente ⇒ `"spec_ready"`; ausente ⇒ `"done"`. **Solo lo escribe `/afinar-feature` al partir una ficha** |
```

### 6. `scripts/validate-features.mjs` — bloque 2, antes del `continue`

```javascript
  // La fuerza es por ficha (label `unblocks:spec_ready`), no por link: docs/jira.md.
  if (f.unblocks_at != null) {
    if (f.unblocks_at !== 'spec_ready') {
      errores.push(`${ref(f)} trae unblocks_at "${f.unblocks_at}": el unico valor valido es "spec_ready" (ausente = "done")`);
    }
    if (f.depends_on == null) {
      errores.push(`${ref(f)} trae unblocks_at pero no depends_on: una fuerza sin dependencia no significa nada`);
    }
  }
```
