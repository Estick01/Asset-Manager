-- ============================================================
-- 0060_tarea_extensions.sql
-- Extensiones del sistema de tareas:
--   1. tiempo_estimado + tiempo_unidad en tareas
--   2. tarea_observaciones — notas sobre tareas en progreso
--   3. tarea_subtareas     — sub-tareas con su propio estado y tiempo estimado
--   4. tarea_historial     — auditoría de acciones por usuario
-- ============================================================

-- 1. Ampliar tabla tareas
ALTER TABLE tareas
  ADD COLUMN IF NOT EXISTS tiempo_estimado DECIMAL(6,1) NULL
    COMMENT 'Tiempo estimado para completar la tarea',
  ADD COLUMN IF NOT EXISTS tiempo_unidad ENUM('minutos','horas','dias','semanas') NULL
    COMMENT 'Unidad del tiempo estimado';

-- 2. Observaciones de tarea
CREATE TABLE IF NOT EXISTS tarea_observaciones (
  id           VARCHAR(36)   NOT NULL,
  tarea_id     VARCHAR(36)   NOT NULL,
  autor_id     VARCHAR(36)   NOT NULL,
  autor_nombre VARCHAR(255)  NULL,
  contenido    TEXT          NOT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tarea_obs_tarea (tarea_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Sub-tareas
CREATE TABLE IF NOT EXISTS tarea_subtareas (
  id                VARCHAR(36)   NOT NULL,
  tarea_id          VARCHAR(36)   NOT NULL,
  titulo            VARCHAR(255)  NOT NULL,
  descripcion       TEXT          NULL,
  estado            ENUM('pendiente','completada') NOT NULL DEFAULT 'pendiente',
  tiempo_estimado   DECIMAL(6,1)  NULL,
  tiempo_unidad     ENUM('minutos','horas','dias','semanas') NULL,
  completada_en     TIMESTAMP     NULL,
  completada_por_id VARCHAR(36)   NULL,
  creado_por_id     VARCHAR(36)   NOT NULL,
  creado_por_nombre VARCHAR(255)  NULL,
  orden             INT           NOT NULL DEFAULT 0,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tarea_sub_tarea (tarea_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Historial de acciones
CREATE TABLE IF NOT EXISTS tarea_historial (
  id             VARCHAR(36)  NOT NULL,
  tarea_id       VARCHAR(36)  NOT NULL,
  usuario_id     VARCHAR(36)  NOT NULL,
  usuario_nombre VARCHAR(255) NULL,
  accion         VARCHAR(50)  NOT NULL,
  detalle        TEXT         NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tarea_hist_tarea (tarea_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
