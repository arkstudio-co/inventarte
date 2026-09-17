/**
 * Andamiaje desechable de la Tanda 1 (TS2): pagina placeholder de la zona publica
 * para que el smoke de TS5 tenga una ruta 200 que afirmar y para probar que
 * Tailwind compila (clases de humo aplicadas). T16 (pantalla de login) la
 * complementa / sobrescribe; el reviewer decide.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50">
      <h1 className="text-2xl font-semibold text-indigo-600">IA-1 WIP</h1>
    </main>
  )
}