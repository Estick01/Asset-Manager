-- Migration: Update notificaciones table
-- - Make cliente_id and lawyer_id nullable (notifications can target only one party)
-- - Add firm_id for firm-targeted notifications
-- - Add leido_firma for read tracking by firms

ALTER TABLE notificaciones
  MODIFY COLUMN cliente_id VARCHAR(36) NULL,
  MODIFY COLUMN lawyer_id  VARCHAR(36) NULL,
  ADD COLUMN   firm_id     VARCHAR(36) NULL AFTER lawyer_id,
  ADD COLUMN   leido_firma BOOLEAN     NOT NULL DEFAULT FALSE AFTER leido_lawyer;
