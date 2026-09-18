// prisma.config.ts — config del CLI de Prisma 7.
//
// Prisma 7 ya no admite el campo `package.json#prisma` ni `url`/`directUrl` en el datasource
// del schema: la URL con la que trabaja el CLI (validate/generate/migrate) vive aqui.
//
// Migrate necesita la conexion DIRECTA (DIRECT_URL, puerto 5432): el pooler (DATABASE_URL,
// puerto 6543) no soporta transaction mode y las migraciones fallan con errores que no
// apuntan a la causa (docs/architecture.md > Acceso a datos y autorizacion). DATABASE_URL la
// consume la app en runtime via el adaptador (`pg`), no el CLI.
//
// Prisma 7 no carga `.env` automaticamente (el pkg `dotenv` no esta entre las dependencias
// aprobadas de docs/dependencias.md); lo cargamos con `process.loadEnvFile` (Node >= 20.12)
// solo si el archivo existe.
import { existsSync } from 'node:fs'
import { defineConfig } from 'prisma/config'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

const directUrl = process.env.DIRECT_URL

export default defineConfig({
  schema: 'db/schema.prisma',
  migrations: {
    path: 'db/migrations',
  },
  ...(directUrl ? { datasource: { url: directUrl } } : {}),
})