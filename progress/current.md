# Sesion activa

> Estado vivo de lo que se esta trabajando **ahora**. El leader lo mantiene al dia.
> Al cerrar una feature se limpia de aqui y se resume en `history.md`.

## Features en curso

| id | feature | zone | status | branch | quien la tiene |
|---|---|---|---|---|---|
| IA-1 | login | backend | pending | feature/IA-1-login | — |

Registrada por `/importar-modulo` (import de `imports/login/`). Sembrada la ficha en
`feature_list.json`, **pendiente de worktree** (ver `Deudas y cosas abiertas`).

## Evaluaciones

### IA-1 — login (2026-09-16, /importar-modulo)

- **zone: backend.** El port es el flujo de autenticacion completo tras la pantalla:
  verificacion de credenciales, hashing, bloqueo con escalada, emision de sesion firmada,
  persistencia y rastro de accesos. El propio `prompt.md` abre con «No es la pantalla de
  login: es todo lo que pasa detras de ella»; el unico componente con cara a la UI (borde
  de formulario) lo maneja el controlador de entrada, no una pantalla.
- **complexity: high.** 24 requisitos EARS renumerados (E1..E24), 5 puertos, 15 invariantes
  —varias de concurrencia real (compare-and-set con ABA), criptografia (HMAC-SHA-256, hash
  señuelo), bloqueo con escalada 1/5/15/60 y E2E con navegador real. Excede con holgura el
  perfil `medium` (2-3 capas, condiciones).
- Escribida como labels en el issue (`zone:backend`, `complexity:high`) antes de registrar
  la ficha.

## Conflictos pendientes

_(ninguno)_

## Deudas y cosas abiertas

1. **IA-1 sin worktree: este arbol no es un repo git.** `/importar-modulo` creo la ficha en
   el board (IA-1) y la registro en `feature_list.json` (gate en verde), pero el directorio
   de trabajo es la plantilla extraida del arnes (`harnessConfig` — README de la raiz): no
   hay `.git`, ni rama `dev`, ni worktrees, y `./scripts/wt.sh new IA-1 login` falla con
   `'.' no es un repo git`. El Paso 2 (montar worktree + sembrar `specs/IA-1-login/`) queda
   bloqueado. Decidir con el humano: inicializar git aqui (¿cual es el origin/rama base?),
   apuntar a otra ruta donde viva el proyecto destino, o detener la importacion.
2. **docs/jira.md dice proyecto `QC`, feature_list.json dice `IA`.** El JSON manda (bloque 0
   del validador) y la ficha IA-1 se creo en el proyecto IA, que existe y acepto la ficha.
   Verificar que el cambio QC -> IA fue deliberado; si no, revisar `jira.project` y la doc.