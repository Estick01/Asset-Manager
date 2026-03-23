-- Fase 1: Etapas procesales jurídicas (legal_stage)
-- Agrega seguimiento de etapa procesal a procesos
-- y crea tabla de etapas configurables por tipo de proceso

-- 1. Tabla de etapas configurables por tipo de proceso
CREATE TABLE `etapas_por_tipo_proceso` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `tipo_proceso_id` INT           NULL,                        -- NULL = aplica a todos los tipos
  `codigo`          VARCHAR(50)   NOT NULL,                    -- 'PREPROCESS', 'FILED', 'HEARING', etc.
  `nombre`          VARCHAR(100)  NOT NULL,                    -- 'Etapa preprocesal', 'Demanda presentada'
  `descripcion`     VARCHAR(255)  NULL,
  `orden`           INT           NOT NULL DEFAULT 0,          -- posición en el flujo
  `dias_legales`    INT           NOT NULL DEFAULT 0,          -- días hábiles legales de la etapa
  `color`           VARCHAR(20)   NOT NULL DEFAULT '#6B7280',  -- color para UI
  `activo`          TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_etapa_tipo_codigo` (`tipo_proceso_id`, `codigo`),
  INDEX `idx_etapas_tipo` (`tipo_proceso_id`),
  INDEX `idx_etapas_orden` (`tipo_proceso_id`, `orden`)
);

-- 2. Agregar campos de etapa procesal a la tabla procesos
ALTER TABLE `procesos`
  ADD COLUMN `legal_stage`              VARCHAR(50)   NULL        AFTER `descripcion_estado`,
  ADD COLUMN `fecha_vencimiento_etapa`  DATETIME      NULL        AFTER `legal_stage`,
  ADD COLUMN `etapa_actualizada_en`     TIMESTAMP     NULL        AFTER `fecha_vencimiento_etapa`,
  ADD INDEX  `idx_procesos_legal_stage` (`legal_stage`),
  ADD INDEX  `idx_procesos_vencimiento` (`fecha_vencimiento_etapa`);
