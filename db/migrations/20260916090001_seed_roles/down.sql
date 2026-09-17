-- TI2 — DOWN: revierte el seed del catalogo (idempotente).
DELETE FROM "roles" WHERE "name" IN ('admin_maestro', 'admin');