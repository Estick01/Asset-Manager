-- Fase 1: Calendario del abogado
-- Tabla de eventos manuales que se agregan a la vista de calendario
-- junto con tareas (fecha_limite) y etapas (fecha_vencimiento_etapa)

CREATE TABLE `calendar_events` (
  `id`                  VARCHAR(36)   NOT NULL,
  `lawyer_id`           VARCHAR(36)   NOT NULL,                -- FK a lawyer_profiles.id
  `proceso_id`          VARCHAR(36)   NULL,                    -- opcional, vincula al caso
  `titulo`              VARCHAR(255)  NOT NULL,
  `descripcion`         TEXT          NULL,
  `tipo`                ENUM(
                          'audiencia',
                          'reunion_cliente',
                          'diligencia',
                          'vencimiento',
                          'otro'
                        ) NOT NULL DEFAULT 'otro',
  `fecha_inicio`        DATETIME      NOT NULL,
  `fecha_fin`           DATETIME      NULL,                    -- NULL = evento de día completo / sin duración
  `recordatorio_minutos` INT          NOT NULL DEFAULT 1440,   -- 1440 = 1 día antes
  `notificado`          TINYINT(1)    NOT NULL DEFAULT 0,      -- ya se envió el recordatorio
  `state`               TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cal_lawyer_fecha`   (`lawyer_id`, `fecha_inicio`),
  INDEX `idx_cal_proceso`        (`proceso_id`),
  INDEX `idx_cal_recordatorio`   (`notificado`, `fecha_inicio`),
  CONSTRAINT `fk_cal_lawyer`     FOREIGN KEY (`lawyer_id`)  REFERENCES `lawyer_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cal_proceso`    FOREIGN KEY (`proceso_id`) REFERENCES `procesos` (`id`)        ON DELETE SET NULL
);
