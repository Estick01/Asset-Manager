-- Create lawyer_firma_history table
-- Tracks the history of lawyers in firms (bufetes)

CREATE TABLE lawyer_firma_history (
  id VARCHAR(36) PRIMARY KEY,
  lawyer_id VARCHAR(36) NOT NULL,
  firma_id VARCHAR(36) NOT NULL,
  fecha_ingreso TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_salida TIMESTAMP NULL,
  motivo_salida VARCHAR(255),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo', -- 'activo', 'retirado', 'suspendido', 'transferido'
  created_by VARCHAR(36),
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lawyer_id) REFERENCES lawyer_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (firma_id) REFERENCES firm_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX idx_lawyer_firma_history_lawyer ON lawyer_firma_history(lawyer_id);
CREATE INDEX idx_lawyer_firma_history_firma ON lawyer_firma_history(firma_id);
