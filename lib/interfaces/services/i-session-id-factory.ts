// Puerto 5: fabrica de id de sesion (design.md §4, invariante 4 y 11). Sin parametros:
// no hay de donde derivar — el id es nuevo, aleatorio y no derivado de la persona ni del
// instante (R14). El dominio no tiene fuentes de azar: todo id sale por este puerto.
export interface ISessionIdFactory {
  newSessionId(): string;
}