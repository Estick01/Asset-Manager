-- migrations/0065_cliente_ownership.sql
-- Tabla de propiedad histórica de clientes jurídicos.
-- Append-only: nunca se sobrescriben registros, se cierran con fecha_fin.
-- activo_unique: workaround MySQL para partial unique index (mismo patrón que proceso_ownership).

CREATE TABLE IF NOT EXISTS cliente_ownership (
  id             VARCHAR(36)   NOT NULL,
  cliente_id     VARCHAR(36)   NOT NULL,
  owner_type     VARCHAR(20)   NOT NULL   COMMENT 'abogado | bufete',
  owner_id       VARCHAR(36)   NOT NULL   COMMENT 'lawyer_profiles.id o firm_profiles.id',
  fecha_inicio   TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  fecha_fin      TIMESTAMP     NULL       COMMENT 'NULL = dueño actual',
  activo_unique  TINYINT(1)    NULL       COMMENT '1 si activo, NULL si histórico',
  creado_por     VARCHAR(36)   NOT NULL   COMMENT 'users.id',
  razon          VARCHAR(500)  NULL,
  created_at     TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  -- uq_cliente_ownership_activo: garantiza máximo UN dueño activo por cliente.
  UNIQUE INDEX uq_cliente_ownership_activo (cliente_id, activo_unique),
  INDEX idx_cliente_ownership_cliente (cliente_id, fecha_fin),
  INDEX idx_cliente_ownership_owner   (owner_type, owner_id, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
