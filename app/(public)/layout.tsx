import type { ReactNode } from 'react'

/**
 * Layout de la zona publica (TS2): da hogar a rutas no autenticadas como
 * `/login` (T16, otra tanda). `min-h-dvh` en vez de `min-h-screen`: regla
 * multiplataforma de docs/architecture.md (barra de direcciones de iOS).
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh">{children}</div>
}