import type { Metadata } from 'next'
import { LoginForm } from './components'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
}

/**
 * T16: pantalla de login (UI minima). Pagina NO autenticada de la zona publica:
 * Server Component, sin estado y sin fetch de datos. Lee `next` de los searchParams
 * (entrada externa) y se lo pasa al formulario como default del campo oculto; la
 * action T15 lo REVALIDA en servidor con resolveNextDestination (sin open redirect).
 * Los textos de UI viajan por props (`labels`) para i18n futuro — convencion de
 * docs/architecture.md > Componentes.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] | undefined }>
}) {
  const { next } = await searchParams

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8">
      <LoginForm
        defaultNext={typeof next === 'string' ? next : undefined}
        labels={{
          title: 'Acceso a Inventarte',
          username: 'Usuario',
          password: 'Contraseña',
          submit: 'Entrar',
        }}
      />
    </main>
  )
}