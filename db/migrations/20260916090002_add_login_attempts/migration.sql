-- T14 — add_login_attempts (R24): rastro estructurado de intentos de login RESUELTOS.
-- Una fila por desenlace (incluido inexistente); ver design.md §9 y §10.
-- Estructura/tipos/nombres identicos a los que Prisma 7 genera para db/schema.prisma
-- (verificado con `prisma migrate diff --from-empty --to-schema`); RLS escrita a mano.
-- FKs a companies/users NULLABLES: un intento que no resolvio a una cuenta deja esos
-- vinculos en NULL (el rastro sobrevive al borrado de la cuenta: user_id ON DELETE SET NULL).
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "user_id" UUID,
    "username" VARCHAR(255) NOT NULL,
    "outcome" VARCHAR(24) NOT NULL,
    "annotation_failed" BOOLEAN NOT NULL DEFAULT false,
    "attempted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" INET,
    "user_agent" VARCHAR(512),

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "login_attempts_outcome_check" CHECK ("outcome" IN ('success', 'bad_credentials', 'unknown_user', 'account_blocked', 'account_not_active', 'org_inactive')),
    CONSTRAINT "login_attempts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "login_attempts_user_id_attempted_at_idx" ON "login_attempts"("user_id", "attempted_at" DESC);
CREATE INDEX "login_attempts_company_id_attempted_at_idx" ON "login_attempts"("company_id", "attempted_at" DESC);
CREATE INDEX "login_attempts_username_attempted_at_idx" ON "login_attempts"("username", "attempted_at" DESC);

-- RLS identica a TI1 (design.md §10): ENABLE + FORCE + policy del owner OBLIGATORIA.
ALTER TABLE "login_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "login_attempts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "app_owner_full_access" ON "login_attempts" FOR ALL TO CURRENT_USER USING (true) WITH CHECK (true);