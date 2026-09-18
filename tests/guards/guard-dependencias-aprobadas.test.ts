/**
 * Guardia de dependencias aprobadas (TS4, Bloque 0 de IA-1) — docs/dependencias.md.
 *
 * Materializa «nada se instala por si acaso» (docs/architecture.md > Dependencias de
 * terceros): compara package.json contra docs/dependencias.md. Hace rojo el gate si:
 *   1. hay una dependencia en package.json que NO figura en el registro; o
 *   2. una fila del registro tiene un estado fuera de los documentados
 *      (aprobada | excepcion | heredada — seccion "Estados" de docs/dependencias.md).
 *
 * El gate corre sin red: esta guardia no consulta npm, solo compara nombres contra la tabla.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

export const ESTADOS_VALIDOS = new Set(['aprobada', 'excepcion', 'heredada'])

export interface FilaDependencia {
  paquete: string
  estado: string
}

// --- parsing puro (exportado para poder probar que muerde; verification.md) ---

/** Quita la version del nombre: '@prisma/client@7.10.0' -> '@prisma/client'. */
export function stripVersion(nombre: string): string {
  return nombre.replace(/@(?:[~^]?\d[\w.\-+]*)$/, '')
}

/** Una celda de paquete puede agrupar varios: '`next` + `react` + `react-dom`'. */
export function parseCellPaquete(celda: string): string[] {
  const sinMarker = celda.replace(/\s*\((?:dev|prod)\)\s*$/i, '')
  return sinMarker
    .split('+')
    .map((parte) => parte.replace(/`/g, '').trim())
    .filter(Boolean)
    .map(stripVersion)
}

/** Divide una linea de tabla '| a | b | c |' en celdas no vacias. */
export function splitFila(linea: string): string[] {
  return linea
    .split('|')
    .map((celda) => celda.trim())
    .filter(Boolean)
}

/** Parsea el registro completo: nombres de paquete y estado de cada fila. */
export function parseDependenciasMd(contenido: string): { nombres: string[]; filas: FilaDependencia[] } {
  const nombres: string[] = []
  const filas: FilaDependencia[] = []
  for (const linea of contenido.split('\n')) {
    const celdas = splitFila(linea)
    if (celdas.length < 3) continue
    if (celdas.every((c) => /^-+$/.test(c))) continue // fila separadora del encabezado
    const [paquete, , estado] = celdas
    if (!paquete || paquete === 'Paquete') continue // encabezado
    for (const nombre of parseCellPaquete(paquete)) {
      nombres.push(nombre)
      filas.push({ paquete: nombre, estado })
    }
  }
  return { nombres, filas }
}

/** Union de dependencies + devDependencies de package.json. */
export function dependenciesDePackageJson(rutaPackage: string): string[] {
  const raw = JSON.parse(readFileSync(rutaPackage, 'utf8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  return Object.keys({ ...raw.dependencies, ...raw.devDependencies }).sort()
}

// --- datos reales del repo (vitest se lanza desde la raiz del worktree) ---

const repoRoot = process.cwd()
const registro = parseDependenciasMd(readFileSync(join(repoRoot, 'docs', 'dependencias.md'), 'utf8'))
const instaladas = dependenciesDePackageJson(join(repoRoot, 'package.json'))

// --- casos reales ---

describe('guard-dependencias-aprobadas', () => {
  it('toda dependencia de package.json esta listada en el registro (nada por si acaso)', () => {
    const sinFila = instaladas.filter((d) => !registro.nombres.includes(d))
    expect(
      sinFila,
      `en package.json pero sin fila en docs/dependencias.md: ${sinFila.join(', ')}`,
    ).toEqual([])
  })

  it('toda fila del registro tiene un estado documentado (aprobada | excepcion | heredada)', () => {
    const raras = registro.filas.filter((f) => !ESTADOS_VALIDOS.has(f.estado))
    expect(
      raras,
      `filas con estado fuera de ${[...ESTADOS_VALIDOS].join('/')} ` +
        `(checks sin correr o acta sin cerrar): ${raras.map((f) => `${f.paquete}=${f.estado}`).join(', ')}`,
    ).toEqual([])
  })
})

// --- casos sinteticos: probar que muerde (verification.md) ---

describe('guard-dependencias-aprobadas (sintetico: que muerde)', () => {
  const tabla = `| Paquete | Para qué | Estado | Fecha | Notas |
| --- | --- | --- | --- | --- |
| \`bcryptjs\` | Hasher | aprobada | 2026-09-16 | ok |
`

  it('parsea celdas agrupadas, scoped, con version y con marcador (dev)', () => {
    expect(parseCellPaquete('`next` + `react` + `react-dom`')).toEqual(['next', 'react', 'react-dom'])
    expect(parseCellPaquete('`@prisma/client@7.10.0`')).toEqual(['@prisma/client'])
    expect(parseCellPaquete('`prisma@^7.10.0` (dev)')).toEqual(['prisma'])
    expect(parseDependenciasMd(tabla).nombres).toEqual(['bcryptjs'])
  })

  it('una dependencia de package.json sin fila en el registro hace roja la guardia', () => {
    const r = parseDependenciasMd(tabla)
    expect(['bcryptjs', 'left-pad'].filter((d) => !r.nombres.includes(d))).toEqual(['left-pad'])
  })

  it('una fila con estado pendiente hace roja la guardia', () => {
    const r = parseDependenciasMd(tabla.replace('aprobada', 'PENDIENTES'))
    expect(r.filas.filter((f) => !ESTADOS_VALIDOS.has(f.estado)).map((f) => f.estado)).toEqual([
      'PENDIENTES',
    ])
  })
})