-- Migration: Create tipos_proceso table
-- Date: 2026-02-19

CREATE TABLE IF NOT EXISTS tipos_proceso (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_nombre (nombre)
);

-- Add tipo_proceso_id column to procesos table (optional FK)
ALTER TABLE procesos ADD COLUMN tipo_proceso_id INT NULL;
ALTER TABLE procesos ADD CONSTRAINT fk_tipo_proceso FOREIGN KEY (tipo_proceso_id) REFERENCES tipos_proceso(id) ON DELETE SET NULL;

-- Seed initial tipos_proceso data
INSERT INTO tipos_proceso (nombre, descripcion, activo) VALUES
('Civil', 'Procesos de naturaleza civil', TRUE),
('Penal', 'Procesos de naturaleza penal', TRUE),
('Laboral', 'Procesos relacionados con laboral', TRUE),
('Administrativo', 'Procesos administrativos', TRUE),
('Familia', 'Procesos de familia', TRUE),
('Comercial', 'Procesos comerciales', TRUE),
('Constitucional', 'Procesos constitucionales', TRUE),
('Otro', 'Otros tipos de procesos', TRUE);
