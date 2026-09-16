/**
 * Declaracion local de `pg` — POR QUE EXISTE (leelo antes de tocar):
 *
 * `pg` no trae tipos propios (siempre ha requerido `@types/pg`), y `@types/pg` NO esta entre
 * las dependencias aprobadas de `docs/dependencias.md` (el registro aprobo `pg` a secas en
 * F1.4). Este archivo declara SOLO la superficie que `scripts/db-rollback.ts` usa, sin `any`
 * (docs/conventions.md: prohibido `any` salvo justificacion explicita — esta nota lo es).
 *
 * Cuando una feature apruebe `@types/pg` (fila nueva en docs/dependencias.md + aprobacion
 * humana), este archivo se borra y la deriva la hace DefinitelyTyped.
 */
declare module 'pg' {
  export interface ClientConfig {
    connectionString?: string
  }

  export interface QueryResult<R = Record<string, unknown>> {
    rows: R[]
    rowCount: number | null
  }

  export class Client {
    constructor(config?: ClientConfig)
    connect(): Promise<void>
    query<R = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<R>>
    end(): Promise<void>
  }
}