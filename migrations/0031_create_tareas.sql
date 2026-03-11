-- Create tareas table (task management within legal processes)
CREATE TABLE IF NOT EXISTS `tareas` (
  `id`                VARCHAR(36)                                                    NOT NULL,
  `proceso_id`        VARCHAR(36)                                                    NOT NULL,
  `titulo`            VARCHAR(255)                                                   NOT NULL,
  `descripcion`       TEXT                                                           NULL,
  `estado`            ENUM('pendiente','en_progreso','completada','cancelada')       NOT NULL DEFAULT 'pendiente',
  `prioridad`         ENUM('baja','media','alta','urgente')                          NOT NULL DEFAULT 'media',
  `fecha_limite`      DATE                                                           NULL,
  `fecha_completada`  TIMESTAMP                                                      NULL,
  `asignado_a`        VARCHAR(36)                                                    NULL,
  `asignado_a_nombre` VARCHAR(255)                                                   NULL,
  `creado_por`        VARCHAR(36)                                                    NOT NULL,
  `creado_por_nombre` VARCHAR(255)                                                   NULL,
  `orden`             INT                                                            NOT NULL DEFAULT 0,
  `state`             TINYINT(1)                                                     NOT NULL DEFAULT 1,
  `created_at`        TIMESTAMP                                                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP                                                      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_tareas_proceso_id`  (`proceso_id`),
  INDEX `idx_tareas_asignado_a`  (`asignado_a`),
  INDEX `idx_tareas_creado_por`  (`creado_por`),
  INDEX `idx_tareas_estado`      (`estado`),
  INDEX `idx_tareas_fecha_limite`(`fecha_limite`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
