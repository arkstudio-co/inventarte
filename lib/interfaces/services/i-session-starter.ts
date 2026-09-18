// Puerto 4: escritor de sesion (design.md §4, §5, invariantes 9-11). El ticket se
// construye en el dominio con datos que salen del puerto LECTOR (roleName/companyId —
// invariante 10) y un id de sesion nuevo del puerto FACTORIA (invariante 11: jamas de la
// entrada, jamas derivado). Puede lanzar: si el transporte no esta configurado, la
// excepcion se PROPAGA (invariante 9) — el caso de uso no la atrapa.
import type { RoleName } from "../repositories/i-user-credentials-reader";

export interface SessionTicket {
  sub: string; // id de usuario
  roleName: RoleName; // conjunto cerrado (decision 5, R26)
  companyId: string;
  sid: string; // id de ESTA sesion (R14)
}

export interface ISessionStarter {
  startSession(ticket: SessionTicket): Promise<void>;
}