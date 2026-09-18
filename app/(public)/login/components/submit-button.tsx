'use client'

import type { ReactNode } from 'react'

interface SubmitButtonProps {
  pending: boolean
  children: ReactNode
}

/**
 * Boton de envio (T16): `pending` viene de `useActionState` (login-form) — mientras
 * la accion dure queda deshabilitado y `aria-busy`, evitando dobles envios. Target
 * tactil >= 44px (`h-11`) y `text-base` (16px): regla multiplataforma de
 * docs/architecture.md. El hover es solo mejora (`enabled:hover:`), jamas la unica
 * via. El texto llega por children (i18n futuro).
 */
export function SubmitButton({ pending, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-indigo-600 px-4 text-base font-medium text-white enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  )
}