-- Create proceso_responsables table
-- This table tracks the responsible attorney for each process
-- A process can only have one responsible attorney at a time
-- An attorney can be responsible for many processes

CREATE TABLE proceso_responsables (
    id CHAR(36) PRIMARY KEY,
    proceso_id CHAR(36) NOT NULL,
    lawyer_id CHAR(36) NOT NULL,
    asignado_por CHAR(36),
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    razon VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT fk_proceso_responsables_proceso FOREIGN KEY (proceso_id) REFERENCES procesos(id) ON DELETE CASCADE,
    CONSTRAINT fk_proceso_responsables_lawyer FOREIGN KEY (lawyer_id) REFERENCES lawyer_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_proceso_responsables_asignado_por FOREIGN KEY (asignado_por) REFERENCES lawyer_profiles(id) ON DELETE SET NULL,
    
    INDEX idx_proceso_responsables_proceso (proceso_id),
    INDEX idx_proceso_responsables_lawyer (lawyer_id),
    INDEX idx_proceso_responsables_activo (activo)
);

-- Add unique constraint to ensure only one active responsable per process
-- First, we'll need to handle existing data
-- This constraint will be added after data migration if needed
