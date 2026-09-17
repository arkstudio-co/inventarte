// Fabrica de id de sesion (design.md §4, invariantes 4 y 11; R14): el id es nuevo,
// aleatorio y no derivado de la persona ni del instante. Sin parametros: no hay de donde
// derivar. WebCrypto global (disponible en Node y en runtime de borde: nada de node:crypto).
import type { ISessionIdFactory } from "../../interfaces/services/i-session-id-factory";

export function crearSessionIdFactory(): ISessionIdFactory {
  return {
    newSessionId: () => crypto.randomUUID(),
  };
}