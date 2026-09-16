# harnessConfig — el arnés SDD, extraído

Copia autocontenida de **toda la configuración del arnés** de este repo. Sirve para
llevar el arnés a otro proyecto, o para leerlo entero sin el ruido de las specs y las
bitácoras que se vayan acumulando.

**Nada de lo que hay aquí modifica el arnés vivo.** Los archivos del repo (`CLAUDE.md`,
`AGENTS.md`, `.claude/`, `docs/`, `scripts/`, `init.sh`, `feature_list.json`,
`progress/`, `specs/`) quedan intactos; esto es una copia paralela.

> **Rama `opencode-port`.** El arnés corre aquí sobre **opencode** (config en `opencode.json`,
> agentes y comandos en `.opencode/`, hooks en `.opencode/plugins/`). El bloque `.claude/` se
> mantiene como espejo para quien quiera correr el mismo arnés con Claude Code; los dos runtimes
> comparten `docs/`, `scripts/` y `init.sh`.

## Qué hay

| Ruta | Origen | Estado |
|---|---|---|
| `CLAUDE.md` | raíz | copia literal (espejo Claude) |
| `AGENTS.md` | raíz | copia literal (cargado por opencode y por Claude) |
| `CHECKPOINTS.md` | raíz | copia literal |
| `init.sh` | raíz | copia literal (el gate: `./init.sh` y `./init.sh --rapido`) |
| `scripts/wt.sh` | `scripts/` | copia literal (ciclo de vida de los worktrees) |
| `scripts/validate-features.mjs` | `scripts/` | copia literal (valida `feature_list.json` en el gate) |
| `.mcp.json` | raíz | copia literal (MCP para Claude; opencode usa el bloque `mcp` de `opencode.json`) |
| `docs/architecture.md` · `conventions.md` · `specs.md` · `verification.md` · `worktrees.md` · `jira.md` | `docs/` | copia literal — los que los subagentes leen |
| `opencode.json` | raíz | configuración de **opencode** (MCP + `default_agent: leader` + `subagent_depth: 2`) |
| `.claude/agents/*.md` | `.claude/agents/` | copia literal, los 6 subagentes (espejo Claude) |
| `.opencode/agents/*.md` | `.opencode/agents/` | los 6 subagentes + `leader`, en formato opencode |
| `.opencode/commands/*.md` | `.opencode/commands/` | los 5 comandos (`afinar-*`, `extraer-modulo`, `importar-modulo`, `jira-connect`) en formato opencode |
| `.opencode/plugins/harness.js` | `.opencode/plugins/` | hooks del arnés (recuerda typecheck/lint/test y el cierre de turno) |
| `.claude/settings.json` | `.claude/` | copia literal (hooks del arnés, espejo Claude) |
| `.claude/settings.local.json` | `.claude/` | copia literal (permisos + MCP habilitado, espejo Claude) |
| `feature_list.json` | — | una única ficha de ejemplo |
| `progress/current.md` | — | solo los encabezados que el leader espera |
| `progress/history.md` | — | solo el encabezado y el formato de entrada |
| `progress/impl_1-ejemplo-*.md` · `review_1-ejemplo-*.md` | — | ejemplo del formato de bitácora |
| `specs/1-ejemplo-*/` | — | ejemplo de los 3 archivos SDD (requirements EARS / design / tasks) |
| `hexagonal/` | — | **aditivo y opcional**: convierte el arnés a arquitectura hexagonal por módulos. Ver `hexagonal/README.md` |

## Qué se omite a propósito

- **Los historiales reales**: `progress/history.md`, `progress/current.md` y los
  `impl_*.md` / `review_*.md` de features cerradas. Crecen sin techo y no son
  configuración.
- **Las specs reales**: queda una sola como ejemplo de formato.
- **El `feature_list.json` real**, con su narrativa de decisiones por ficha.
- **`.claude/skills/`**: son skills de terceros instaladas, no parte del arnés.
- Todo lo que es la app en sí: `app/`, `lib/`, `tests/`, `db/`, `package.json`, configs
  de build.

## Si lo trasplantas a otro proyecto, revisa esto

1. **`init.sh`** asume `pnpm` y los scripts `typecheck` / `lint` / `test` / `test:rapido`
   en `package.json`, más `db/migrations/*/down.sql`. Sin esos scripts el gate **avisa y sigue**
   (`warn`), no falla: verifica que existan o el gate no mide nada.
2. **`.claude/settings.local.json`** trae permisos de esta máquina; revísalos allá.
3. **`scripts/wt.sh` monta los worktrees en `.worktrees/` dentro del repo**, y esta copia
   NO incluye `.gitignore`, `tsconfig.json` ni `eslint.config.mjs`. En el repo destino
   hay que excluir esa carpeta en los tres, o `lint` y `typecheck` recorrerán una copia
   completa del árbol por cada worktree abierto:
   `/.worktrees/` en `.gitignore`, `".worktrees/**"` en `globalIgnores` de eslint, y
   `.worktrees` en el `exclude` de `tsconfig.json`. Ver `docs/worktrees.md`.
4. **La configuración MCP la lee Claude de `.mcp.json` y opencode del bloque `mcp` de
   `opencode.json`** (mismos tres servidores, mismo formato de variables: `supabase` por
   `${SUPABASE_PROJECT_REF}/CONTEXT7` por `{CONTEXT7_API_KEY}`, y la autenticación de Jira por
   `ATLASSIAN_MCP_AUTH` que es `base64(email:api_token)`): las tres salen del entorno,
   no del repo. Defínelas allá o los servidores MCP no levantan. En opencode la variable se
   interpola como `{env:VAR}`.
   El arnés espera además un **board de Jira** con las cinco columnas del ciclo; sin él, el
   paso F0 no tiene de dónde importar. Montaje completo en `docs/jira.md` y la conexión de
   una cuenta en `/jira-connect`.
5. **`docs/architecture.md`** describe el dominio, el stack y los principios de este
   proyecto (un ERP mono-tenant). Es el documento a reescribir en destino; los otros de
   `docs/` son genéricos.
6. **`CLAUDE.md` regla 1** y el paso 3 de `init.sh` fijan el máximo de 2 features
   `in_progress` por zona: si lo cambias, cámbialo en los dos sitios (y en
   `AGENTS.md > Paralelismo`).

## Arranque en limpio

```
./init.sh                      # debe terminar en verde
```
Luego: `AGENTS.md` → `CLAUDE.md` (si el runtime es Claude) o `opencode.json` + `.opencode/`
(si es opencode, como en esta rama) → primera ficha `pending` de `feature_list.json`.
En opencode el rol de leader es el agente primario `leader` (por defecto) y los comandos
se invocan igual: `/jira-connect`, `/afinar-feature`, `/afinar-regla`, `/extraer-modulo`, `/importar-modulo`.
