-- migrations/0053_stage_task_templates.sql

CREATE TABLE `etapa_tareas_plantilla` (
  `id`               INT           NOT NULL AUTO_INCREMENT,
  `tipo_proceso_id`  INT           NULL,
  `legal_stage_code` VARCHAR(50)   NOT NULL,
  `titulo`           VARCHAR(255)  NOT NULL,
  `descripcion`      TEXT          NULL,
  `prioridad`        ENUM('baja','media','alta','urgente') NOT NULL DEFAULT 'media',
  `requerida`        TINYINT(1)    NOT NULL DEFAULT 0,
  `orden`            INT           NOT NULL DEFAULT 0,
  `activo`           TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_templates_stage` (`legal_stage_code`),
  INDEX `idx_templates_tipo`  (`tipo_proceso_id`)
);

ALTER TABLE `tareas`
  ADD COLUMN `legal_stage`  VARCHAR(50)  NULL AFTER `proceso_id`,
  ADD COLUMN `requerida`    TINYINT(1)   NOT NULL DEFAULT 0 AFTER `legal_stage`,
  ADD INDEX  `idx_tareas_stage` (`proceso_id`, `legal_stage`);
