'use client'

import { useActionState } from 'react'
import { loginAction } from '@/lib/actions/login'
import { LOGIN_INITIAL_STATE } from '@/lib/types/login'
import { SubmitButton } from './submit-button'

export interface LoginFormLabels {
  title: string
  username: string
  password: string
  submit: string
}

interface LoginFormProps {
  defaultNext?: string
  labels: LoginFormLabels
}

/**
 * Formulario de login (T16). `useActionState(loginAction, LOGIN_INITIAL_STATE)` de
 * React 19 (los docs de Next 16 confirman que el hook se importa de `react`; el
 * `useFormState` de Next esta deprecado): la accion devuelve el estado -> el form
 * re-renderiza con los errores por campo (`fieldErrors`) o el mensaje global
 * congelado (`error`), conservando el username escrito. El campo oculto `next`
 * entra como `defaultValue` y se revalida EN SERVIDOR (T15).
 *
 * Invariante 15 (design.md §11): en ningun estado del formulario viaja la
 * contrasena; el input de password no tiene `defaultValue`.
 */
export function LoginForm({ defaultNext, labels }: LoginFormProps) {
  const [state, action, pending] = useActionState(loginAction, LOGIN_INITIAL_STATE)

  const usernameError = state.status === 'invalid' ? state.fieldErrors.username : undefined
  const passwordError = state.status === 'invalid' ? state.fieldErrors.password : undefined
  const formError = state.status === 'error' ? state.message : undefined
  const preservedUsername =
    state.status === 'invalid' || state.status === 'error' ? state.username : ''

  return (
    <form
      action={action}
      noValidate
      className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h1 className="text-xl font-semibold text-slate-900">{labels.title}</h1>

      <input type="hidden" name="next" defaultValue={defaultNext ?? ''} />

      <div className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="login-username"
            className="block text-base font-medium text-slate-700"
          >
            {labels.username}
          </label>
          <input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            required
            defaultValue={preservedUsername}
            aria-invalid={usernameError ? true : undefined}
            aria-describedby={usernameError ? 'login-username-error' : undefined}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 aria-invalid:border-red-500"
          />
          {usernameError ? (
            <p id="login-username-error" role="alert" className="mt-1 text-sm text-red-600">
              {usernameError}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-base font-medium text-slate-700"
          >
            {labels.password}
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? 'login-password-error' : undefined}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 aria-invalid:border-red-500"
          />
          {passwordError ? (
            <p id="login-password-error" role="alert" className="mt-1 text-sm text-red-600">
              {passwordError}
            </p>
          ) : null}
        </div>
      </div>

      {formError ? (
        <p
          id="login-error"
          role="alert"
          className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {formError}
        </p>
      ) : null}

      <SubmitButton pending={pending}>{labels.submit}</SubmitButton>
    </form>
  )
}