-- migrations/0068_create_proceso_etapa_historial.sql
-- Crear tabla para historial de etapas procesales con estados

CREATE TABLE proceso_etapa_historial (
  id           VARCHAR(36)  PRIMARY KEY,
  proceso_id   VARCHAR(36)  NOT NULL,
  etapa        VARCHAR(50)  NOT NULL COMMENT 'Código de la etapa (ej: DEMANDA, NOTIFICACION)',
  estado       VARCHAR(20)  NOT NULL COMMENT 'Estado dentro de la etapa (ej: ADMITIDA, NO_ADMITIDA)',
  fecha        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacion  TEXT         NULL COMMENT 'Observaciones opcionales del cambio',
  usuario_id   VARCHAR(36)  NULL COMMENT 'Usuario que realizó el cambio',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (proceso_id) REFERENCES procesos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_proceso_etapa_historial_proceso_id (proceso_id),
  INDEX idx_proceso_etapa_historial_etapa (etapa),
  INDEX idx_proceso_etapa_historial_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;