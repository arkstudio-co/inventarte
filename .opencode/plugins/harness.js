// hooks del arnes para opencode — reemplazan .claude/settings.json
//
// En Claude Code eran dos hooks: PostToolUse (Edit|Write) recordaba correr la
// verificacion, y Stop recordaba actualizar progress/. Aqui son dos eventos de
// plugin: "tool.execute.after" y "session.idle".
//
// opencode no mete estos recordatorios en el chat del usuario; los deja en la
// bitacora estructurada (client.app.log). Si algun dia hace falta que sean
// visibles, se reemplaza el log por un toast de la TUI.
export const HarnessHooks = async ({ client }) => {
  const record = (message) => {
    try {
      return client.app.log({
        body: { service: "arnes", level: "info", message }
      })
    } catch {
      return undefined
    }
  }

  return {
    "tool.execute.after": async (input) => {
      if (["edit", "write", "apply_patch"].includes(input.tool)) {
        await record(
          "[arnes] Editaste codigo. Antes de dar una task por hecha: pnpm run typecheck && pnpm run lint && pnpm test"
        )
      }
    },
    "session.idle": async () => {
      await record(
        "[arnes] Fin de turno. Verifica: feature_list.json actualizado, progress/current.md al dia, ./init.sh en verde."
      )
    }
  }
}