-- T14 — DOWN: revierte exactamente add_login_attempts (tabla con sus objetos RLS e indices).
DROP POLICY IF EXISTS "app_owner_full_access" ON "login_attempts";
ALTER TABLE "login_attempts" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "login_attempts" DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS "login_attempts";