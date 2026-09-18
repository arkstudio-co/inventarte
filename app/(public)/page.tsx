/**
 * Pagina publica minima neutra (decision M3 del review de IA-1): la raiz
 * `(public)/` responde 200 con el nombre del producto, sin rotulo provisional y
 * sin redirect — no se inventa navegacion; las rutas definitivas de la zona
 * publica las construyen features futuras del board. Las clases de Tailwind son
 * el humo que el smoke E2E afirma (`font-semibold` -> `font-weight: 600`).
 */
export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50">
      <h1 className="text-2xl font-semibold text-indigo-600">Inventarte</h1>
    </main>
  )
}