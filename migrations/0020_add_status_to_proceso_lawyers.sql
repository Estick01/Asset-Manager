-- Add status field to proceso_lawyers table
-- This field tracks if the lawyer assignment is active or inactive

ALTER TABLE proceso_lawyers ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'activo';
