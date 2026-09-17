// Traduccion crudo -> efectivo en UNA funcion con orden de ramas FIJADO (invariante 13;
// design.md §5 paso 5). El `now` entra por parametro: el reloj es del caso de uso
// (invariante 3), nunca `Date.now()` aqui.
import type { AccountStatusRaw } from "../../interfaces/repositories/i-user-credentials-reader";

// Los tres desenlaces de rechazo coinciden 1:1 con outcome del rastro (CHECK de
// add_login_attempts), por eso el caso de uso los usa directo como outcome.
export type EffectiveAccountStatus =
  | "active"
  | "account_not_active"
  | "org_inactive"
  | "account_blocked";

export interface EffectiveAccountStatusContext {
  companyDeleted: boolean;
  lockedUntil: Date | null;
  now: Date;
}

export function effectiveAccountStatus(
  raw: AccountStatusRaw,
  context: EffectiveAccountStatusContext,
): EffectiveAccountStatus {
  // 1. crudo fuera de {active, blocked} (pending, inactive) -> account_not_active (R21).
  if (raw !== "active" && raw !== "blocked") return "account_not_active";
  // 2. organizacion borrada -> org_inactive (R21).
  if (context.companyDeleted) return "org_inactive";
  // 3. bloqueo VIGENTE (plazo estrictamente mayor que el reloj) -> account_blocked (R17);
  //    el plazo vencido NO bloquea.
  if (context.lockedUntil !== null && context.lockedUntil > context.now) {
    return "account_blocked";
  }
  // 4. resto -> activo. Incluye 'blocked' con lockedUntil ya vencido (R19: el bloqueo
  //    caduca solo, sin intervencion manual).
  return "active";
}