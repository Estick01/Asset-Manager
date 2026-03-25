-- migrations/0066_esPrivado_createdBy.sql
-- Agrega campos de privacidad y trazabilidad a clientes y procesos.

ALTER TABLE clientes
  ADD COLUMN es_privado  TINYINT(1)   NOT NULL DEFAULT 0    COMMENT '1 = solo visible para su creador',
  ADD COLUMN created_by  VARCHAR(36)  NULL                  COMMENT 'lawyer_profiles.id o firm_profiles.id que lo creó';

ALTER TABLE procesos
  ADD COLUMN es_privado  TINYINT(1)   NOT NULL DEFAULT 0    COMMENT '1 = solo visible para su creador',
  ADD COLUMN created_by  VARCHAR(36)  NULL                  COMMENT 'lawyer_profiles.id o firm_profiles.id que lo creó';
