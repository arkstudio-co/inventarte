// Barrel de la ruta /login (tasks.md T16): TODO componente de la ruta se reexporta
// desde aqui; nadie importa por ruta profunda. SIN 'use client': el barrel no es
// frontera cliente/servidor (docs/architecture.md > Componentes).
export { LoginForm } from './login-form'
export { SubmitButton } from './submit-button'