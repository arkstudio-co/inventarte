// Caso de uso verifyCredentials (design.md §5): dominio PURO. No importa Prisma, ni
// next/*, ni adaptadores, ni el reloj del sistema, ni fuentes de azar. Todo lo que
// necesita del mundo entra por los cinco puertos del ctx + clock + lockPolicy.
import { normalizeUsername } from "../../types/login";
import type { LoginInput } from "../../types/login";
import type { IUserCredentialsReader } from "../../interfaces/repositories/i-user-credentials-reader";
import type {
  ILoginAttemptRecorder,
  LoginAttemptOutcome,
} from "../../interfaces/repositories/i-login-attempt-recorder";
import type { IPasswordHasher } from "../../interfaces/services/i-password-hasher";
import type { ISessionStarter } from "../../interfaces/services/i-session-starter";
import type { ISessionIdFactory } from "../../interfaces/services/i-session-id-factory";
import { effectiveAccountStatus } from "./account-status";
import { nextFailureState, successResetState } from "./account-lock-policy";
import type { LockPolicy } from "./account-lock-policy";

export const MAX_CAS_RETRIES = 10;

export interface VerifyCredentialsContext {
  reader: IUserCredentialsReader;
  hasher: IPasswordHasher;
  recorder: ILoginAttemptRecorder;
  sessionStarter: ISessionStarter;
  sessionIdFactory: ISessionIdFactory;
  clock: () => Date; // invariante 3: un solo reloj (el inyectado), nunca Date.now()
  lockPolicy: LockPolicy;
}

// Invariante 1: UNA sola instancia congelada de rechazo, compartida por todos los caminos
// de fallo (R2). El caso de uso no devuelve motivo ni campo de diagnostico.
export const REJECTED = Object.freeze({ ok: false as const });

export async function verifyCredentials(
  input: LoginInput,
  ctx: VerifyCredentialsContext,
): Promise<{ ok: boolean }> {
  // R3: el identificador se consulta normalizado (trim + minusculas, igual que el indice
  // funcional de R27). La contrasena viene exacta desde el borde (sin tocarla).
  const username = normalizeUsername(input.username);

  // El filtro "no borrada" es del puerto (deleted_at IS NULL): una cuenta borrada no se
  // encuentra y cae al camino del usuario inexistente (R1, R7).
  const user = await ctx.reader.findActiveByUsername(username);

  if (user === null) {
    // R4/R5: una verificacion del señuelo con el MISMO hasher y coste; el señuelo lo crea
    // el hasher una sola vez por proceso (design.md §8). Ninguna escritura de cuenta (R7).
    const decoyHash = await ctx.hasher.getDecoyHash();
    await ctx.hasher.verify(input.password, decoyHash);
    await registrar(ctx, {
      username,
      outcome: "bad_credentials",
      companyId: null,
      userId: null,
    });
    return REJECTED;
  }

  // Invariante 2: EXACTAMENTE una verificacion de hash por intento, y los cortes de
  // estado/org van DESPUES de ella — incluido el camino bloqueado (R17: la promesa de
  // tiempos se sostiene aun con contrasena correcta).
  const passwordOk = await ctx.hasher.verify(input.password, user.passwordHash);
  const ahora = ctx.clock();
  const efectivo = effectiveAccountStatus(user.accountStatus, {
    companyDeleted: user.companyDeleted,
    lockedUntil: user.lockedUntil,
    now: ahora,
  });

  // 5.1/5.2/5.3 del design: cortes por estado/org/bloqueo — cuenta NO efectivamente
  // activa: sin escrituras de cuenta (R21), solo su fila de rastro (R24 frontera 3).
  if (efectivo !== "active") {
    await registrar(ctx, {
      username,
      outcome: efectivo,
      companyId: user.companyId,
      userId: user.id,
    });
    return REJECTED;
  }

  if (passwordOk) {
    // R20: reset incondicional de contador, nivel y bloqueo (el `set` del puerto).
    await ctx.recorder.set(user.id, user.accountStatus, successResetState().estadoNuevo);
    // Invariantes 9-11: verificar y LUEGO emitir; el ticket se arma SOLO con datos del
    // puerto (sub/roleName/companyId) + un id de sesion nuevo del puerto fabrica.
    // Si la emision LANZA, la excepcion se propaga: no hay try/catch aqui.
    await ctx.sessionStarter.startSession({
      sub: user.id,
      roleName: user.roleName,
      companyId: user.companyId,
      sid: ctx.sessionIdFactory.newSessionId(),
    });
    await registrar(ctx, {
      username,
      outcome: "success",
      companyId: user.companyId,
      userId: user.id,
    });
    return { ok: true };
  }

  // Contrasena incorrecta + cuenta efectivamente activa: escalada con CAS (invariantes
  // 5-8). El predicado exige contador y estado leidos + plazo por rango; si se pierde la
  // carrera, se relee, se recalcula la politica sobre el estado fresco y se reintenta SIN
  // volver al hasher (invariante 8). Tope ~10; agotado: rastro annotation_failed sin
  // propagar nada (decision 3; propagar reabriria el oraculo).
  let estado = {
    failedLoginAttempts: user.failedLoginAttempts,
    lockLevel: user.lockLevel,
    lockedUntil: user.lockedUntil,
    accountStatus: user.accountStatus,
  };

  for (let intento = 0; intento < MAX_CAS_RETRIES; intento++) {
    const reloj = ctx.clock();
    const escalada = nextFailureState(estado, reloj, ctx.lockPolicy);
    const aplicado = await ctx.recorder.compareAndSet(
      user.id,
      estado.failedLoginAttempts,
      escalada.siguiente,
      reloj,
      estado.accountStatus,
      escalada.estadoNuevo,
    );

    if (aplicado) {
      await registrar(ctx, {
        username,
        outcome: "bad_credentials",
        companyId: user.companyId,
        userId: user.id,
      });
      return REJECTED;
    }

    // Perdio la carrera: releer. Si el usuario desaparecio entre el intento y el
    // reintento, el reintento NO escribe nada (R7): solo su fila de rastro.
    const fresco = await ctx.reader.findActiveByUsername(username);
    if (fresco === null) {
      await registrar(ctx, {
        username,
        outcome: "bad_credentials",
        companyId: null,
        userId: null,
      });
      return REJECTED;
    }
    estado = {
      failedLoginAttempts: fresco.failedLoginAttempts,
      lockLevel: fresco.lockLevel,
      lockedUntil: fresco.lockedUntil,
      accountStatus: fresco.accountStatus,
    };
  }

  // CAS agotado tras MAX_CAS_RETRIES: constancia del intento fallido de anotacion
  // (decision 3). El resultado sigue siendo el rechazo congelado.
  await ctx.recorder.recordAttempt({
    username,
    outcome: "bad_credentials",
    annotationFailed: true,
    companyId: user.companyId,
    userId: user.id,
  });
  return REJECTED;
}

// Rastro (R24): quien (+username normalizado), when (la base), que desenlace, y los
// vinculos a cuenta/organizacion cuando el intento resolvio a una. R13 por tipo: este
// registro no tiene campo para contrasena, hash ni valor de sesion.
async function registrar(
  ctx: VerifyCredentialsContext,
  registro: {
    username: string;
    outcome: LoginAttemptOutcome;
    companyId: string | null;
    userId: string | null;
  },
): Promise<void> {
  await ctx.recorder.recordAttempt({
    username: registro.username,
    outcome: registro.outcome,
    annotationFailed: false,
    companyId: registro.companyId,
    userId: registro.userId,
  });
}