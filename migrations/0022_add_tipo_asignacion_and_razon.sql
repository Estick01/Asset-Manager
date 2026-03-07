-- Create tipo_asignacion table
-- Table to store types of lawyer assignments to processes

CREATE TABLE tipo_asignacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  color VARCHAR(7),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add tipo_asignacion_id and razon_asignacion to proceso_lawyers
ALTER TABLE proceso_lawyers ADD COLUMN tipo_asignacion_id INT;
ALTER TABLE proceso_lawyers ADD COLUMN razon_asignacion VARCHAR(500);

-- Add foreign key constraint
ALTER TABLE proceso_lawyers 
ADD CONSTRAINT fk_proceso_lawyers_tipo_asignacion 
FOREIGN KEY (tipo_asignacion_id) REFERENCES tipo_asignacion(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Seed some default tipo_asignacion values
INSERT INTO tipo_asignacion (nombre, descripcion, color) VALUES 
('Nueva Asignación', 'Asignación inicial del abogado al proceso', '#4CAF50'),
('Reemplazo', 'Reemplazo de otro abogado en el proceso', '#2196F3'),
('Asistencia', 'Asistencia a otro abogado principal', '#FF9800'),
('Delegación', 'Delegación de responsabilidades', '#9C27B0'),
('Supervisión', 'Supervisión del proceso sin intervención directa', '#00BCD4'),      -- abogado senior revisa
('Conflicto de Interés', 'Reasignación por conflicto de interés del abogado anterior', '#F44336'),  -- muy común en bufetes
('Carga de Trabajo', 'Reasignación por exceso de carga del abogado anterior', '#FF5722'),
('Solicitud del Cliente', 'El cliente solicitó específicamente este abogado', '#E91E63'),  -- pasa mucho
('Especialidad', 'Asignado por especialidad requerida en el proceso', '#673AB7'),
('Temporal', 'Asignación temporal mientras el abogado principal está disponible', '#795548'),
('Otro', 'Otro tipo de asignación', '#607D8B');