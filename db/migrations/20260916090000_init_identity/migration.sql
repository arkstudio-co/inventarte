-- TI1 — init_identity (R25, R26-esquema, R27, R28, R30-esquema)
-- Tablas companies, roles y users segun design.md §10 (Modelo de datos y migracion).
-- Estructura/tipos/nombres identicos a los que Prisma 7 genera para db/schema.prisma
-- (verificado con `prisma migrate diff --from-empty --to-schema`): un solo datasource,
-- sin default en los ids (`uuid()` es default del CLIENTE, no de la base — design §10).
-- Lo que se escribe A MANO aqui (Prisma no lo modela): CHECKs de estados, indice GLOBAL
-- de unicidad (R27) y RLS (alternativa 9).

-- companies (borrado logico: deleted_at, nunca DELETE fisico — R1/R21/R25)
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- roles (tabla del sistema: catalogo unico y global, conjunto cerrado decision 5/R26;
-- sin deleted_at ni company_id — design.md §10)
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(32) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "roles_name_check" CHECK ("name" IN ('admin_maestro', 'admin'))
);

-- R26: UNIQUE del catalogo cerrado — mismo nombre/convencion que emite Prisma
-- (CREATE UNIQUE INDEX "roles_name_key").
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- users (identidad minima R25: company_id y role_id OBLIGATORIAS, FKs restrictivas)
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "lock_level" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "account_status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_account_status_check" CHECK ("account_status" IN ('active', 'pending', 'inactive', 'blocked')),
    CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "users_company_id_idx" ON "users"("company_id");
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- R27: indice GLOBAL funcional y parcial, escrito a mano. El schema NO lleva @unique sobre
-- username (bloquearia el reuso post-borrado: design.md §10) — este indice es la unica
-- garantia de unicidad del identificador, a nivel de base.
CREATE UNIQUE INDEX "users_username_unique_active" ON "users" (lower("username")) WHERE "deleted_at" IS NULL;

-- RLS en las TRES tablas (design.md §10): ENABLE + FORCE + policy del owner OBLIGATORIA.
-- FORCE somete al propio dueno, asi que sin policy la tabla quedaria cerrada incluso para
-- Prisma (alternativa 9; defensa en profundidad, la frontera real es el service).
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "app_owner_full_access" ON "companies" FOR ALL TO CURRENT_USER USING (true) WITH CHECK (true);

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "app_owner_full_access" ON "roles" FOR ALL TO CURRENT_USER USING (true) WITH CHECK (true);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
CREATE POLICY "app_owner_full_access" ON "users" FOR ALL TO CURRENT_USER USING (true) WITH CHECK (true);