// Copys provisionales del login (design.md §10 y §11): CONSTANTES exportadas, mensajes en
// espanol (idioma del producto). Los tests afirman sobre la constante, nunca sobre el literal.
//
// Errores de FORMA (R6): especificos y por campo.
// Errores de AUTENTICACION (R2): el mismo mensaje congelado e indistinguible para todo
// rechazo — quien consume no puede diferenciar inexistente de contrasena mala.
export const LOGIN_COPY_CREDENTIALS_INVALID = "Usuario o contrasena incorrectos.";
export const LOGIN_COPY_FIELD_REQUIRED = "Este campo es obligatorio.";

// «La contrasena no puede superar los N caracteres.» — parametrizado por el tope real.
export function loginCopyPasswordTooLong(max: number): string {
  return `La contrasena no puede superar los ${max} caracteres.`;
}

// Variante generica por campo (p. ej. el tope de username, sin copy propio en §11).
export function loginCopyFieldTooLong(max: number, campo = "Este campo"): string {
  return `${campo} no puede superar los ${max} caracteres.`;
}