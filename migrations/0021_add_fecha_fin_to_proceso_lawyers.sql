-- Add fecha_fin field to proceso_lawyers table
-- This field tracks when the lawyer assignment ends

ALTER TABLE proceso_lawyers ADD COLUMN fecha_fin TIMESTAMP NULL;
