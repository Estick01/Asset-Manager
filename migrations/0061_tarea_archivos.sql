-- ============================================================
-- 0061_tarea_archivos.sql
-- Archivos adjuntos a tareas (imágenes, PDFs, documentos)
-- ============================================================

CREATE TABLE IF NOT EXISTS tarea_archivos (
  id             VARCHAR(36)   NOT NULL,
  tarea_id       VARCHAR(36)   NOT NULL,
  nombre         VARCHAR(255)  NOT NULL,
  url            TEXT          NOT NULL,
  mime_type      VARCHAR(100)  NOT NULL,
  tamano         INT           NOT NULL DEFAULT 0,
  subido_por_id  VARCHAR(36)   NOT NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tarea_archivo_tarea (tarea_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
