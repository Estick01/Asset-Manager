-- migrations/0064_firm_settings.sql
-- Configuración de privacidad y ownership por bufete.
-- Si no existe registro, se usan defaults (allow_private_*=false, default_*_es_compartido=true).

CREATE TABLE IF NOT EXISTS firm_settings (
  id                           VARCHAR(36)   NOT NULL,
  firm_id                      VARCHAR(36)   NOT NULL,
  allow_private_clientes       TINYINT(1)    NOT NULL DEFAULT 0   COMMENT '1 = bufete permite clientes privados',
  allow_private_procesos       TINYINT(1)    NOT NULL DEFAULT 0   COMMENT '1 = bufete permite procesos privados',
  default_cliente_es_compartido TINYINT(1)   NOT NULL DEFAULT 1   COMMENT '1 = al crear cliente, default es del bufete',
  default_proceso_es_compartido TINYINT(1)   NOT NULL DEFAULT 1   COMMENT '1 = al crear proceso, default es del bufete',
  created_at                   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE INDEX uq_firm_settings_firm (firm_id),
  INDEX idx_firm_settings_firm (firm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
