-- migrations/0054_stage_events.sql

CREATE TABLE `etapa_eventos` (
  `id`               VARCHAR(36)   NOT NULL,
  `proceso_id`       VARCHAR(36)   NOT NULL,
  `legal_stage_code` VARCHAR(50)   NOT NULL,
  `tipo`             ENUM('etapa_iniciada','etapa_completada','tarea_completada','documento_subido','nota') NOT NULL,
  `descripcion`      TEXT          NOT NULL,
  `metadatos`        JSON          NULL,
  `creado_por`       VARCHAR(36)   NULL,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_eventos_proceso_stage` (`proceso_id`, `legal_stage_code`),
  INDEX `idx_eventos_proceso`       (`proceso_id`)
);

ALTER TABLE `documentos`
  ADD COLUMN `legal_stage` VARCHAR(50) NULL AFTER `proceso_id`,
  ADD INDEX  `idx_docs_stage` (`proceso_id`, `legal_stage`);
