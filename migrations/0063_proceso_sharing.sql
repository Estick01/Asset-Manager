-- migrations/0063_proceso_sharing.sql
-- Tabla de accesos compartidos a procesos.
-- Append-only: revocar = cerrar con fecha_fin, nunca DELETE.
-- Permite compartir con múltiples entidades (bufete, corporacion, cliente).

CREATE TABLE IF NOT EXISTS proceso_sharing (
  id               VARCHAR(36)   NOT NULL,
  proceso_id       VARCHAR(36)   NOT NULL,
  shared_with_type VARCHAR(20)   NOT NULL   COMMENT 'bufete | corporacion | cliente',
  shared_with_id   VARCHAR(36)   NOT NULL,
  permission       VARCHAR(20)   NOT NULL   COMMENT 'ver | comentar | editar',
  fecha_inicio     TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  fecha_fin        TIMESTAMP     NULL       COMMENT 'NULL = acceso activo',
  activo_unique    TINYINT(1)    NULL       COMMENT '1 si activo, NULL si histórico',
  creado_por       VARCHAR(36)   NOT NULL   COMMENT 'users.id',
  razon            VARCHAR(500)  NULL,
  created_at       TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE INDEX uq_sharing_activo (proceso_id, shared_with_type, shared_with_id, activo_unique),
  INDEX idx_sharing_proceso     (proceso_id, fecha_fin),
  INDEX idx_sharing_shared_with (shared_with_type, shared_with_id, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
