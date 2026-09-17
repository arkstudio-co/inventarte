"use server";

// Controller de login (design.md §11, T15): borde + composicion + redirect. SIN logica
// de negocio y SIN imports de adaptadores — compone el servicio SOLO desde
// lib/composition/login.ts (R22). La verificacion real (base) se completa en T17.
import { redirect } from "next/navigation";
import { verifyCredentials } from "../composition/login";
import {
  loginFormRejected,
  parseLoginInput,
  resolveNextDestination,
} from "../types/login";
import type { LoginFormState } from "../types/login";

export async function loginAction(
  prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  // R14/invariante 11 (design.md §11): id de intento NUEVO por invocacion — distingue el
  // re-render de useActionState de un resultado nuevo. Es del ESTADO del formulario, no
  // de la sesion: el sid lo fabrica el puerto dentro del caso de uso. Sin parametros: no
  // se deriva de nada.
  const attemptId = crypto.randomUUID();

  // Borde (R6): la entrada cruda se valida con zod ANTES de tocar el servicio; fallo de
  // forma -> estado `invalid` con fieldErrors, conservando el username escrito.
  const parsed = parseLoginInput(
    {
      username: formData.get("username"),
      password: formData.get("password"),
    },
    attemptId,
  );
  if (!parsed.ok) return parsed.state;

  // `next` es entrada externa y se REVALIDA en servidor (R6, design.md §11): solo rutas
  // internas seguras; cualquier otra cosa cae al respaldo DASHBOARD_ROUTE. Nunca un
  // redirect a destino externo.
  const nextRaw = formData.get("next");
  const destino = resolveNextDestination(typeof nextRaw === "string" ? nextRaw : null);

  const resultado = await verifyCredentials(parsed.data);
  if (resultado.ok) {
    // Exito: redirect FUERA de todo try/catch — lanza para cortar el stream de la
    // accion; cualquier catch lo tragaria y romperia la navegacion (design.md §11).
    redirect(destino);
  }

  // R2 (design.md §11): el rechazo de autenticacion es la constante congelada
  // (LOGIN_COPY_CREDENTIALS_INVALID), sin motivo ni campo de diagnostico.
  return loginFormRejected(attemptId, parsed.data.username);
}