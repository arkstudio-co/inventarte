-- TI1 — DOWN: revierte exactamente init_identity (codigo del up + RLS + indice global),
-- en orden inverso al up: users -> roles -> companies.

DROP POLICY IF EXISTS "app_owner_full_access" ON "users";
ALTER TABLE "users" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS "users_username_unique_active";
DROP TABLE IF EXISTS "users";

DROP POLICY IF EXISTS "app_owner_full_access" ON "roles";
ALTER TABLE "roles" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS "roles";

DROP POLICY IF EXISTS "app_owner_full_access" ON "companies";
ALTER TABLE "companies" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "companies" DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS "companies";