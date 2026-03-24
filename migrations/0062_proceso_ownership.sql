-- migrations/0062_proceso_ownership.sql
-- Tabla de propiedad histórica de procesos jurídicos.
-- Append-only: nunca se sobrescriben registros, se cierran con fecha_fin.
-- activo_unique: workaround MySQL para partial unique index.
--   1 = registro activo, NULL = histórico (MySQL permite múltiples NULLs en unique index).

CREATE TABLE IF NOT EXISTS proceso_ownership (
  id             VARCHAR(36)   NOT NULL,
  proceso_id     VARCHAR(36)   NOT NULL,
  owner_type     VARCHAR(20)   NOT NULL   COMMENT 'abogado | bufete | sin_owner',
  owner_id       VARCHAR(36)   NULL       COMMENT 'lawyer_profiles.id o firm_profiles.id; NULL cuando owner_type = sin_owner',
  fecha_inicio   TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  fecha_fin      TIMESTAMP     NULL       COMMENT 'NULL = dueño actual',
  activo_unique  TINYINT(1)    NULL       COMMENT '1 si activo, NULL si histórico',
  creado_por     VARCHAR(36)   NOT NULL   COMMENT 'users.id',
  razon          VARCHAR(500)  NULL,
  created_at     TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  -- uq_ownership_activo: garantiza máximo UN dueño activo por proceso.
  -- activo_unique=1 = dueño actual; NULL = histórico (MySQL permite múltiples NULLs en índice UNIQUE).
  UNIQUE INDEX uq_ownership_activo (proceso_id, activo_unique),
  INDEX idx_ownership_proceso (proceso_id, fecha_fin),
  INDEX idx_ownership_owner   (owner_type, owner_id, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
