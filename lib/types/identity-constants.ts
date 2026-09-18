// Constantes compartidas de identidad para el login Y para la futura feature de alta (R3):
// un solo numero por tope, para que el login no pueda divergir del alta (design.md §11 y §12).
//
// USERNAME_MAX_LENGTH: provisional hasta que la feature de identidad fije el valor
// definitivo; 255 casa con la columna `username varchar(255)` del esquema (TI1).
export const USERNAME_MAX_LENGTH = 255;

// CREDENTIAL_MAX_LENGTH: estructural del prompt §3 — margen bajo los 72 bytes de bcrypt.
// La contrasena no se recorta ni se normaliza (R3): este tope es del formulario, y el
// servicio la verifica exactamente como llega.
export const CREDENTIAL_MAX_LENGTH = 64;