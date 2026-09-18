-- TI2 — seed_roles (R26): data migration del catalogo cerrado de roles.
-- Data migration y no `prisma db seed` (design.md §10, alternativa 8): los roles llegan con
-- `migrate deploy` en cualquier ambiente y se revierten con el mismo mecanismo que el esquema.
-- Idempotente: ON CONFLICT (name) DO NOTHING.
INSERT INTO "roles" ("id", "name") VALUES
    (gen_random_uuid(), 'admin_maestro'),
    (gen_random_uuid(), 'admin')
ON CONFLICT ("name") DO NOTHING;