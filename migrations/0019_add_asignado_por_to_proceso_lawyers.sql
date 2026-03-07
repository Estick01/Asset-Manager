-- Add asignadoPor field to proceso_lawyers table
-- This field tracks which user assigned the lawyer to the proceso

ALTER TABLE proceso_lawyers ADD COLUMN asignado_por VARCHAR(36);

-- Add foreign key constraint
ALTER TABLE proceso_lawyers 
ADD CONSTRAINT fk_proceso_lawyers_asignado_por 
FOREIGN KEY (asignado_por) REFERENCES users(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;
