-- Remove responsable_id column from procesos table
-- Responsable is now tracked exclusively via proceso_responsables table
-- which supports history (previous responsables are deactivated, not deleted)

ALTER TABLE procesos DROP FOREIGN KEY fk_procesos_responsable;
ALTER TABLE procesos DROP COLUMN responsable_id;
