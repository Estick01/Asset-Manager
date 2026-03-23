-- Fix critical column name mismatches between migrations and Drizzle schemas
-- 1. documentos.uri → url  (schema uses "url", DB has "uri")
-- 2. users.password → password_hash  (schema uses "password_hash", DB has "password")

ALTER TABLE `documentos` RENAME COLUMN `uri` TO `url`;
ALTER TABLE `users` RENAME COLUMN `password` TO `password_hash`;
